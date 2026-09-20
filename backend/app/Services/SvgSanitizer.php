<?php

namespace IconIndexa\Services;

if (!defined('ABSPATH')) {
    exit;
}

use IconIndexa\Deps\BitApps\WPKit\Hooks\Hooks;

/**
 * Server-side SVG output sanitizer for the icon block. The icon block is static, so the frontend
 * echoes stored post_content verbatim and never re-runs the JS sanitizers (svgUtils.ts /
 * fetchSvgContent.ts). Content authored via the Code Editor / REST (only reachable by
 * unfiltered_html users) could carry a stored-XSS SVG payload, so this is an independent
 * last-line-of-defense: an SVG-safe wp_kses allowlist (no script, no on* handlers, no
 * foreignObject, no javascript:) plus remote-ref stripping. Kept as a reusable Service so the
 * render path stays thin and the allowlist can be reused/kept in sync with the client mirror.
 */
final class SvgSanitizer
{
    /**
     * Sanitize one icon block's rendered HTML. Caller guarantees this is the icon block's output.
     */
    public static function sanitize(string $blockContent): string
    {
        // wp_kses runs safecss_filter_attr on any style="" it keeps, whose default property
        // allowlist has no SVG paint (fill/stroke/stop-color) or display, so inline-style colors
        // and the wrapper's display:flex fallback would be stripped on the frontend. Permit that
        // harmless subset for the duration of this one sanitize only, then detach the filter so
        // it never widens safecss for the rest of the page.
        Hooks::addFilter('safe_style_css', [self::class, 'allowSvgStyleProps']);
        try {
            $clean = wp_kses($blockContent, self::allowedSvgHtml(), ['http', 'https', 'mailto', 'tel']);

            // url()/@import can phone home from the wrapper div/a style="" and from a kept <style>
            // block too - safecss_filter_attr validates url() against the broad wp_allowed_protocols()
            // (http is always allowed), not our restricted wp_kses list - so strip those across the
            // WHOLE block. Local url(#id) fragment refs are kept.
            $clean = self::stripRemoteUrls($clean);

            // (xlink:)href stripping is scoped to inside the <svg>: the wrapper <a href> is the
            // block's own navigation link (already protocol-filtered by wp_kses to http/https/mailto/
            // tel) and an intended external-link feature, so it must survive. Stripping href over the
            // whole block would delete that anchor and break every icon that links out.
            // The span is GREEDY to the last </svg> (not lazy to the first): a nested inner
            // <svg></svg> supplies an early </svg> that a lazy `*?` would stop at, leaving a remote
            // (xlink:)href placed after it but still inside the OUTER svg unstripped and phoning home
            // on the frontend. Greedy-to-last-close covers the whole outer svg incl. any nesting.
            // ponytail: greedy span assumes one SVG per block instance (save() emits exactly one, and
            // render_block runs per instance); a hand-authored two-SVG instance could let an <a href>
            // BETWEEN the svgs be stripped - acceptable (fails safe), not reachable via block output.
            // The second alternative covers an unclosed <svg> (wp_kses does NOT balance tags), so a
            // malformed <svg ...><feImage xlink:href="https://.."> with no </svg> still gets
            // href-stripped instead of skipping the callback entirely and phoning home.
            $stripped = preg_replace_callback(
                '/<svg\b[\s\S]*<\/svg>|<svg\b[\s\S]*/i',
                static fn (array $m): string => self::stripRemoteHrefs($m[0]),
                $clean
            );

            // preg_replace_callback returns null only on a PCRE error (e.g. backtrack limit on a
            // huge crafted SVG). Fail CLOSED: run the href strip over the WHOLE block so a remote
            // (xlink:)href inside the <svg> can't survive the degraded path and phone home. This
            // also strips the wrapper <a href> navigation link (a feature loss), but a broken link
            // is the safe tradeoff versus a stored-XSS/phone-home leak. The whole-block strip uses a
            // lazy per-match regex (cheaper than the greedy span above), so it succeeds where the
            // span failed; if it too errors, stripRemoteHrefs returns its input unchanged.
            if (is_string($stripped)) {
                $clean = $stripped;
            } else {
                $clean = self::stripRemoteHrefs($clean);
            }

            $clean = self::stripProtocolRelativeHref($clean);

            return self::forceNoopener($clean);
        } finally {
            Hooks::removeFilter('safe_style_css', [self::class, 'allowSvgStyleProps']);
        }
    }

    /**
     * Extend safecss_filter_attr's allowed CSS properties with the SVG paint set plus `display`,
     * so wp_kses preserves fill/stroke declared via inline style="" and keeps the wrapper's
     * display:flex alignment fallback. All are presentational and script-free; none can carry a
     * script or a cross-origin fetch on their own (url() values are still protocol-filtered).
     *
     * @param string[] $props
     *
     * @return string[]
     */
    public static function allowSvgStyleProps(array $props): array
    {
        return array_merge(
            $props,
            [
                'fill', 'fill-opacity', 'fill-rule',
                'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin',
                'stroke-dasharray', 'stroke-dashoffset', 'stroke-opacity', 'stroke-miterlimit',
                'stop-color', 'stop-opacity', 'display',
            // The wrapper carries display:flex + align-items/justify-content for icon alignment
            // (getWrapperStyles in blockStyles.ts). Core added the flex alignment props to
            // safecss_filter_attr only in WP 6.1 (trac #56122); on the plugin's declared floor
            // (WP 5.9/6.0) safecss matches names with an exact in_array(), so without these two
            // every already-published centered/justified icon would collapse to the left on the
            // frontend. Listed explicitly so 5.9/6.0 keep alignment and 6.1+ pass through unchanged.
                'align-items', 'justify-content',
            // Presentational props the prior client DOMPurify pass left in style="" but the default
            // safecss allowlist drops; restored so already-published icons using them in inline style
            // keep their look on the frontend. Any url() value is still neutralized to a local #ref by
            // stripRemoteUrls, so none of these can carry a cross-origin fetch.
                'color', 'opacity', 'vector-effect', 'paint-order',
                'marker-start', 'marker-mid', 'marker-end',
                'clip-path', 'clip-rule', 'mask', 'mix-blend-mode', 'isolation',
                'transform', 'transform-origin', 'transform-box', 'overflow',
            // The container carries the icon rotate/flip/stroke-width as CSS custom properties
            // (--ib-rotate, --ib-flip-x, --ib-flip-y, --icon-stroke-width) that style.css consumes
            // via transform: rotate(var(--ib-rotate)). safecss_filter_attr drops any --* declaration
            // it doesn't allow, so without these every already-published rotated/flipped icon renders
            // upright on the frontend. The exact names are listed (not the '--*' wildcard) because
            // pre-6.1 safecss matches property names with an exact in_array() - '--*' never matches
            // '--ib-rotate' there, so on the plugin's declared floor (WP 5.9) the wildcard is a no-op
            // and the props are stripped. Exact names match on 5.9/6.0 and pass through on 6.1+ too.
            // Values are still protocol-filtered.
                '--ib-rotate', '--ib-flip-x', '--ib-flip-y', '--icon-stroke-width',
            ]
        );
    }

    /**
     * Neutralize protocol-relative (//host) hrefs on the wrapper <a> to '#'. wp_kses only
     * protocol-filters against a scheme allowlist (http/https/mailto/tel), so a scheme-less
     * //evil.com carries no bad scheme and survives - resolving to an external origin on render
     * (open-redirect / off-site link surface). The client isSafeUrl (svgUtils.ts) rejects '//' and
     * its backslash forms too; mirror that on the server for the Code-Editor/REST authoring path.
     * Scoped to <a> so local svg xlink:href (already reduced to #-fragments by stripRemoteHrefs) is
     * untouched. Value is entity-decoded before the check so an encoded '//' can't slip past.
     */
    private static function stripProtocolRelativeHref(string $html): string
    {
        $out = preg_replace_callback(
            '/<a\b[^>]*>/i',
            static function (array $m): string {
                $tag = preg_replace_callback(
                    '/(\shref\s*=\s*([\'"]))(.*?)\2/is',
                    static function (array $h): string {
                        $value = ltrim(html_entity_decode($h[3], ENT_QUOTES | ENT_HTML5));
                        // Browsers normalize backslashes to '/' in special-scheme URLs, so \\evil.com,
                        // /\evil.com and \/evil.com all resolve as protocol-relative too. Normalize
                        // before the '//' check so those backslash forms can't slip past it.
                        $normalized = str_replace('\\', '/', $value);

                        return strncmp($normalized, '//', 2) === 0 ? $h[1] . '#' . $h[2] : $h[0];
                    },
                    $m[0]
                );

                return is_string($tag) ? $tag : $m[0];
            },
            $html
        );

        return is_string($out) ? $out : $html;
    }

    /**
     * Force rel="noopener" onto any target="_blank" anchor wp_kses keeps. save() already emits
     * rel="noopener noreferrer", but Code-Editor/REST authoring (unfiltered_html users) bypasses
     * save(), so this is the only guard there against reverse-tabnabbing (the opened tab getting a
     * window.opener handle back to this page). Only <a target="_blank"> is touched; an existing rel
     * is preserved and noopener prepended, otherwise a full rel is added.
     */
    private static function forceNoopener(string $html): string
    {
        $out = preg_replace_callback(
            '/<a\b[^>]*\btarget\s*=\s*([\'"])_blank\1[^>]*>/i',
            static function (array $m): string {
                $tag = $m[0];
                // Scope the noopener check to the rel VALUE, not the whole tag: an unrelated
                // href/title containing the literal "noopener" (e.g. href=".../?ref=noopener")
                // must not trick us into skipping a rel that isn't actually there.
                if (preg_match('/\brel\s*=\s*([\'"])(.*?)\1/i', $tag, $rel)) {
                    if (stripos($rel[2], 'noopener') !== false) {
                        return $tag;
                    }

                    return preg_replace('/(\brel\s*=\s*[\'"])/i', '$1noopener ', $tag, 1);
                }

                return preg_replace('/<a\b/i', '<a rel="noopener noreferrer"', $tag, 1);
            },
            $html
        );

        return is_string($out) ? $out : $html;
    }

    /**
     * Shared local-#id-fragment allowlist for the two remote-ref strippers (stripRemoteUrls,
     * stripRemoteHrefs). The value is HTML-entity-decoded and left-trimmed first so an encoded scheme
     * (&#104;ttps://) or leading whitespace can't slip past the '#' check. strncmp (not
     * str_starts_with, which is PHP 8.0+): this runs on the public render path and the plugin declares
     * Requires PHP 7.4 with a composer --no-dev build (no symfony/polyfill-php80), so str_starts_with
     * would fatal. Kept as one method so the two security paths can't drift apart; mirrors the client
     * keepLocalRef (fetchSvgContent.ts).
     */
    private static function isLocalRef(string $value): bool
    {
        return strncmp(ltrim(html_entity_decode($value, ENT_QUOTES | ENT_HTML5)), '#', 1) === 0;
    }

    /**
     * Neutralize non-local CSS resource refs (@import, any url() that is not a local #id fragment)
     * anywhere in the markup - including the wrapper div/a style="" and any kept <style> block - so a
     * rendered icon can't phone home (visitor IP/UA leak on every page view) or pull remote CSS.
     * Only url(#id) fragment refs are kept; the value is HTML-entity-decoded before the check so an
     * encoded scheme can't slip past.
     */
    private static function stripRemoteUrls(string $svg): string
    {
        // Resolve away CSS escapes first so an obfuscated function/at-rule token can't slip past the
        // literal-token matches below (see neutralizeCssEscapes).
        $svg = self::neutralizeCssEscapes($svg);

        $cleaned = preg_replace('/@import[^;]*;?/i', '', $svg);

        // preg_replace returns null only on a PCRE error (e.g. backtrack limit); keep the
        // wp_kses-sanitized markup rather than blanking the icon in that case.
        if (!is_string($cleaned)) {
            return $svg;
        }

        // Allowlist by local #id fragment, NOT by literal scheme. safecss_filter_attr validates url()
        // against the broad wp_allowed_protocols() (http always allowed), and a scheme match runs on
        // the pre-HTML-entity-decode markup, so an entity-encoded scheme (url(&#104;ttps://...)) would
        // slip past a literal https?:// match, decode in the browser, and phone home. Keeping only
        // url(#id) refs closes both holes at once; every other value (remote/data:/relative/encoded)
        // becomes none.
        $out = preg_replace_callback(
            '/url\(\s*([\'"]?)([^)]*?)\1\s*\)/i',
            static fn (array $m): string => self::isLocalRef($m[2]) ? $m[0] : 'none',
            $cleaned
        );

        if (!is_string($out)) {
            return $cleaned;
        }

        // image-set()/image() take a BARE-STRING url ("https://..") with no url() token, so the url()
        // strip above misses them and the remote resource still phones home. An icon never needs
        // either, so neutralize the whole function call (nested at most one level, e.g.
        // image-set(url(..) 1x)) to none. The whole-call strip covers every quoting/entity-encoding
        // variant at once, so no scheme/decode check is needed. The leading CSS-value boundary
        // ([:,(] + optional ws, captured and re-emitted) confines the match to a real CSS value
        // position so literal prose like <desc>an image (x)</desc> is not corrupted; a CSS function
        // only ever follows ':', ',', or '('.
        // ponytail: fixed function list (image-set/image, incl -webkit-); add cross-fade() here too if
        // that ever ships as an icon paint source.
        $final = preg_replace(
            '/([:,(]\s*)(?:-webkit-)?image(?:-set)?\s*\((?:[^()]|\([^()]*\))*\)/i',
            '${1}none',
            $out
        );
        if (!is_string($final)) {
            return $out;
        }

        // An UNTERMINATED url( with no closing ')' (e.g. `<style>svg{background:url(//evil</style>`)
        // is missed by the balanced url() pass above (which requires a ')'), yet per the CSS Syntax
        // spec a url-token consumes to end-of-input, so the browser still resolves //evil and phones
        // home on every page view. wp_kses keeps <style> verbatim and does not parse CSS, so this is
        // the only guard. `[^)]*$` matches only when NO ')' exists from url( to end-of-string - i.e.
        // exactly the unterminated case - so a balanced url(#id) elsewhere is untouched. Neutralized
        // to none (dropping any trailing malformed markup with it, which fails safe). Mirrors the
        // client stripRemoteRefs.
        $capped = preg_replace('/url\(\s*[\'"]?[^)]*$/i', 'none', $final);

        return is_string($capped) ? $capped : $final;
    }

    /**
     * Drop CSS escape sequences (a backslash and the char/hex digits it encodes) from <style> bodies
     * and inline style="" values before the remote-ref strip. CSS lets an author write \75rl(..)
     * (\75 == "u") or \url(..) to hide the url() token from the literal-token match in stripRemoteUrls,
     * so the remote resource would survive and phone home (visitor IP/UA leak) on every page view. An
     * icon's CSS never needs escapes, so removing every backslash defuses the bypass: the hidden token
     * either reconstitutes to a plain token stripRemoteUrls then catches (\url( -> url(), or collapses
     * to invalid CSS the browser never fetches (\75rl( -> 75rl(). Mirrors fetchSvgContent.ts
     * neutralizeCssEscapes. Inline style="" is also safecss-filtered by wp_kses (which rejects a
     * declaration containing a backslash), so this is primarily the guard for kept <style> bodies.
     * ponytail: blanket backslash removal in CSS contexts; revisit if an icon needs escaped selectors.
     */
    private static function neutralizeCssEscapes(string $svg): string
    {
        $out = preg_replace_callback(
            '/(<style\b[^>]*>)([\s\S]*?)(<\/style>)/i',
            static fn (array $m): string => $m[1] . str_replace('\\', '', $m[2]) . $m[3],
            $svg
        );
        if (!is_string($out)) {
            return $svg;
        }

        $final = preg_replace_callback(
            '/style\s*=\s*([\'"])(.*?)\1/is',
            static fn (array $m): string => 'style=' . $m[1] . str_replace('\\', '', $m[2]) . $m[1],
            $out
        );

        return is_string($final) ? $final : $out;
    }

    /**
     * Remove any (xlink:)href that is not a local #id fragment so a stored <use>/<feImage>/gradient/
     * pattern/textPath can't phone home or carry an active-scheme payload. wp_kses does not
     * protocol-filter xlink:href, so this is its only defense. The value is HTML-entity-decoded before
     * the check so an encoded scheme (&#104;ttps://) can't slip past a literal-scheme match. The caller
     * scopes this to inside the <svg> so the wrapper <a href> navigation link (already
     * protocol-filtered by wp_kses) survives.
     */
    private static function stripRemoteHrefs(string $svg): string
    {
        // Allowlist by local #id fragment, NOT by literal scheme. wp_kses does not protocol-filter
        // xlink:href, and a scheme match runs pre-HTML-entity-decode, so an entity-encoded scheme
        // (xlink:href="&#104;ttps://...") would slip past a literal https?:// match, decode in the
        // browser, and phone home (e.g. via <feImage>). An SVG icon only ever needs a local #ref, so
        // keep those and drop everything else (remote/data:/javascript:/relative/encoded).
        $cleaned = preg_replace_callback(
            '/\s(?:xlink:)?href\s*=\s*([\'"])(.*?)\1/is',
            static fn (array $m): string => self::isLocalRef($m[2]) ? $m[0] : '',
            $svg
        );

        return is_string($cleaned) ? $cleaned : $svg;
    }

    /**
     * The wp_kses allowlist for the sanitized icon block: the wrapper div/a plus the safe subset of
     * SVG elements/attributes an icon needs, including <style> (class-based fills) and <filter>
     * with its fe* primitive family (drop-shadow/blur effects). Deliberately excludes script,
     * foreignObject and all on* event handlers (any attribute not listed is stripped). @import and
     * remote url()/href inside a kept <style>/<filter> are still stripped by stripRemoteUrls/
     * stripRemoteHrefs. Keys are lowercase; wp_kses matches attribute names case-insensitively and
     * preserves the original case (e.g. viewBox, stdDeviation) in the output. Keep this list in sync
     * with the client mirror (fetchSvgContent.ts sanitizeSvg / stripUnsupportedTags).
     */
    private static function allowedSvgHtml(): array
    {
        // The allowlist is constant data; build it once per request. render_block runs this filter
        // per icon-block instance, so an icon-grid page would otherwise rebuild the whole array on
        // every block.
        static $allowed = null;
        if ($allowed !== null) {
            return $allowed;
        }

        $svgPresentation = [
            'fill'             => true,
            'fill-opacity'     => true,
            'fill-rule'        => true,
            'stroke'           => true,
            'stroke-width'     => true,
            'stroke-linecap'   => true,
            'stroke-linejoin'  => true,
            'stroke-dasharray' => true,
            'stroke-dashoffset' => true,
            'stroke-opacity'   => true,
            'stroke-miterlimit' => true,
            'opacity'          => true,
            'transform'        => true,
            'style'            => true,
            'class'            => true,
            'id'               => true,
            'clip-path'        => true,
            'clip-rule'        => true,
            'mask'             => true,
            'filter'           => true,
            'vector-effect'    => true,
            'paint-order'      => true,
            'color'            => true,
            'marker-start'     => true,
            'marker-mid'       => true,
            'marker-end'       => true,
            // Presentational, script-free attributes the client DOMPurify svg profile keeps
            // (fetchSvgContent.ts). Without them wp_kses drops a display="none"/visibility="hidden"
            // sub-layer's attribute on the frontend, so a layer hidden in the editor reappears; and a
            // shape-rendering="crispEdges" hint silently changes anti-aliasing. Keep in sync with the
            // client mirror so the editor and public render agree.
            'display'          => true,
            'visibility'       => true,
            'shape-rendering'  => true,
        ];

        $shape = static function (array $geometry) use ($svgPresentation): array {
            return array_merge($svgPresentation, $geometry);
        };

        // Shared attribute bag for the <filter> primitive family. Every attribute here is
        // presentational/geometric and script-free; url()/href values are still protocol-filtered.
        $filterAttrs = [
            'in' => true, 'in2' => true, 'result' => true, 'mode' => true, 'values' => true,
            'type' => true, 'tablevalues' => true, 'slope' => true, 'intercept' => true,
            'amplitude' => true, 'exponent' => true, 'offset' => true, 'stddeviation' => true,
            'dx' => true, 'dy' => true, 'flood-color' => true, 'flood-opacity' => true,
            'operator' => true, 'k1' => true, 'k2' => true, 'k3' => true, 'k4' => true,
            'scale' => true, 'xchannelselector' => true, 'ychannelselector' => true, 'order' => true,
            'kernelmatrix' => true, 'divisor' => true, 'bias' => true, 'targetx' => true,
            'targety' => true, 'edgemode' => true, 'preservealpha' => true, 'radius' => true,
            'basefrequency' => true, 'numoctaves' => true, 'seed' => true, 'stitchtiles' => true,
            'surfacescale' => true, 'diffuseconstant' => true, 'specularconstant' => true,
            'specularexponent' => true, 'kernelunitlength' => true, 'azimuth' => true,
            'elevation' => true, 'pointsatx' => true, 'pointsaty' => true, 'pointsatz' => true,
            'limitingconeangle' => true, 'z' => true, 'color-interpolation-filters' => true,
            'x' => true, 'y' => true, 'width' => true, 'height' => true, 'href' => true,
            'xlink:href' => true, 'crossorigin' => true, 'preserveaspectratio' => true,
        ];

        $fe = static function () use ($svgPresentation, $filterAttrs): array {
            return array_merge($svgPresentation, $filterAttrs);
        };

        $allowed = [
            'div' => ['class' => true, 'style' => true, 'title' => true, 'id' => true],
            'a'   => ['class' => true, 'style' => true, 'title' => true, 'id' => true, 'href' => true, 'target' => true, 'rel' => true, 'aria-label' => true, 'aria-hidden' => true, 'role' => true],
            // Accepted risk: a kept inline-SVG <style> is NOT selector-scoped, so its (non-url,
            // already remote-stripped) CSS cascades page-wide and could position a full-page overlay
            // (clickjacking/UI-redress). Kept anyway - this path is reachable only by unfiltered_html
            // users, who already have equivalent power via the Custom HTML block, and dropping <style>
            // would strip class-based fills from already-published custom icons. Matches the ecosystem
            // norm (DOMPurify keeps <style> too). Revisit with selector-scoping if the trust model widens.
            'style' => ['type' => true, 'media' => true],
            'svg' => $shape(
                [
                    'xmlns' => true, 'xmlns:xlink' => true, 'viewbox' => true,
                    'width' => true, 'height' => true, 'role' => true,
                    'aria-label' => true, 'aria-hidden' => true, 'preserveaspectratio' => true,
                ]
            ),
            'g'              => $shape([]),
            'title'          => [],
            'desc'           => [],
            'defs'           => $shape([]),
            'symbol'         => $shape(['viewbox' => true, 'preserveaspectratio' => true]),
            'use'            => $shape(['x' => true, 'y' => true, 'width' => true, 'height' => true, 'href' => true, 'xlink:href' => true]),
            'path'           => $shape(['d' => true, 'pathlength' => true]),
            'rect'           => $shape(['x' => true, 'y' => true, 'width' => true, 'height' => true, 'rx' => true, 'ry' => true]),
            'circle'         => $shape(['cx' => true, 'cy' => true, 'r' => true]),
            'ellipse'        => $shape(['cx' => true, 'cy' => true, 'rx' => true, 'ry' => true]),
            'line'           => $shape(['x1' => true, 'y1' => true, 'x2' => true, 'y2' => true]),
            'polyline'       => $shape(['points' => true]),
            'polygon'        => $shape(['points' => true]),
            'text'           => $shape(['x' => true, 'y' => true, 'dx' => true, 'dy' => true, 'text-anchor' => true, 'font-size' => true, 'font-family' => true]),
            'tspan'          => $shape(['x' => true, 'y' => true, 'dx' => true, 'dy' => true]),
            // Static, script-free elements kept by the prior client DOMPurify svg profile - restored
            // so already-published custom icons using them don't lose content on the frontend.
            // textPath's href/xlink:href can only be a local #id after stripRemoteHrefs. SMIL animation
            // (<animate>/<set>/...) is deliberately NOT restored: attributeName-targeted event handlers
            // / href make it an XSS surface wp_kses can't value-filter. Keep in sync with the client
            // mirror (fetchSvgContent.ts SERVER_UNSUPPORTED_TAGS).
            // phpcs:disable Generic.Files.LineLength.MaxExceeded -- one attr-allowlist per SVG element; wrapping would obscure the security surface
            'textpath'       => $shape(['startoffset' => true, 'method' => true, 'spacing' => true, 'side' => true, 'href' => true, 'xlink:href' => true]),
            'marker'         => $shape(['markerwidth' => true, 'markerheight' => true, 'refx' => true, 'refy' => true, 'orient' => true, 'markerunits' => true, 'viewbox' => true, 'preserveaspectratio' => true]),
            'switch'         => $shape(['requiredfeatures' => true, 'requiredextensions' => true, 'systemlanguage' => true]),
            'lineargradient' => $shape(['x1' => true, 'y1' => true, 'x2' => true, 'y2' => true, 'gradientunits' => true, 'gradienttransform' => true, 'spreadmethod' => true, 'href' => true, 'xlink:href' => true]),
            'radialgradient' => $shape(['cx' => true, 'cy' => true, 'r' => true, 'fx' => true, 'fy' => true, 'gradientunits' => true, 'gradienttransform' => true, 'spreadmethod' => true, 'href' => true, 'xlink:href' => true]),
            'stop'           => $shape(['offset' => true, 'stop-color' => true, 'stop-opacity' => true]),
            'clippath'       => $shape(['clippathunits' => true]),
            'mask'           => $shape(['x' => true, 'y' => true, 'width' => true, 'height' => true, 'maskunits' => true, 'maskcontentunits' => true]),
            'pattern'        => $shape(['x' => true, 'y' => true, 'width' => true, 'height' => true, 'patternunits' => true, 'patterncontentunits' => true, 'patterntransform' => true, 'viewbox' => true, 'href' => true, 'xlink:href' => true]),
            'filter'         => $shape(['filterunits' => true, 'primitiveunits' => true, 'x' => true, 'y' => true, 'width' => true, 'height' => true, 'filterres' => true, 'href' => true, 'xlink:href' => true]),
            // phpcs:enable Generic.Files.LineLength.MaxExceeded
        ];

        // <filter> primitive family. Each shares the presentational + $filterAttrs bag.
        $filterPrimitives = [
            'fegaussianblur', 'feoffset', 'feblend', 'fecolormatrix', 'fecomponenttransfer',
            'fefuncr', 'fefuncg', 'fefuncb', 'fefunca', 'fecomposite', 'feconvolvematrix',
            'fediffuselighting', 'fedisplacementmap', 'fedistantlight', 'fedropshadow', 'feflood',
            'feimage', 'femerge', 'femergenode', 'femorphology', 'fepointlight', 'fespecularlighting',
            'fespotlight', 'fetile', 'feturbulence',
        ];
        foreach ($filterPrimitives as $tag) {
            $allowed[$tag] = $fe();
        }

        return $allowed;
    }
}
