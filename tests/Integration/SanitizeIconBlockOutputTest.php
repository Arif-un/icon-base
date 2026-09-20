<?php

use Brain\Monkey\Functions;
use IconIndexa\Services\SvgSanitizer;
use IconIndexa\Views\BlockProvider;

function makeBlockProvider(): BlockProvider
{
    // Skip the constructor: it registers WP hooks we don't want to touch in a unit test.
    return (new ReflectionClass(BlockProvider::class))->newInstanceWithoutConstructor();
}

function allowedSvgHtml(): array
{
    $ref = new ReflectionMethod(SvgSanitizer::class, 'allowedSvgHtml');
    $ref->setAccessible(true);

    return $ref->invoke(null);
}

// Compose the two production strippers (SvgSanitizer::stripRemoteUrls then ::stripRemoteHrefs) the
// way the render path applies them, so this exercises the real methods rather than a dedicated
// combined helper. Kept as a test-local composition instead of a production method with no caller.
function stripRemoteRefs(string $svg): string
{
    $urls = new ReflectionMethod(SvgSanitizer::class, 'stripRemoteUrls');
    $urls->setAccessible(true);
    $hrefs = new ReflectionMethod(SvgSanitizer::class, 'stripRemoteHrefs');
    $hrefs->setAccessible(true);

    return $hrefs->invoke(null, $urls->invoke(null, $svg));
}

describe('BlockProvider::sanitizeIconBlockOutput', function () {
    // No foreign-block guard test: the callback is wired to the block-specific dynamic filter
    // (render_block_icon-shelf/icon), so WordPress invokes it only for this block. The method
    // always sanitizes its input; there is no block-name branch left to cover.

    test('runs wp_kses with the SVG allowlist and safe protocols for the icon block', function () {
        $captured = [];
        Functions\when('wp_kses')->alias(function ($content, $allowed, $protocols) use (&$captured) {
            $captured = compact('content', 'allowed', 'protocols');

            return 'SANITIZED';
        });
        // sanitizeIconBlockOutput scopes a safe_style_css filter around wp_kses; stub the hook
        // wrappers so the unit test doesn't reach WordPress's real add_filter/remove_filter.
        Functions\when('add_filter')->justReturn(true);
        Functions\when('remove_filter')->justReturn(true);

        $provider = makeBlockProvider();
        $out = $provider->sanitizeIconBlockOutput('<svg><script>x</script></svg>');

        expect($out)->toBe('SANITIZED');
        expect($captured['content'])->toBe('<svg><script>x</script></svg>');
        expect($captured['protocols'])->toBe(['http', 'https', 'mailto', 'tel']);
        // javascript: and data: are not allowed protocols, so URL payloads are dropped.
        expect($captured['protocols'])->not->toContain('javascript');
        expect($captured['protocols'])->not->toContain('data');
    });

    test('strips remote refs that wp_kses leaves in the icon block output', function () {
        // wp_kses does not protocol-filter xlink:href nor validate url() inside fill; the post-pass
        // stripRemoteRefs must remove them so a stored icon can't phone home on the frontend.
        Functions\when('wp_kses')->alias(fn ($content) => $content);
        Functions\when('add_filter')->justReturn(true);
        Functions\when('remove_filter')->justReturn(true);

        $provider = makeBlockProvider();
        $svg = '<svg><use xlink:href="https://evil.example/x.svg#a"></use>'
            . '<rect fill="url(https://evil.example/p.png)"></rect></svg>';
        $out = $provider->sanitizeIconBlockOutput($svg);

        expect($out)->not->toContain('evil.example');
        expect($out)->toContain('fill="none"');
    });

    test('keeps chained local gradient refs from a real-world icon export', function () {
        // Inkscape/CorelDRAW exports chain gradients: each <linearGradient> pulls stops via
        // xlink:href="#id" and paints reference them via style="fill:url(#id)". These are LOCAL
        // fragment refs and must survive the post-pass (only remote/active schemes get stripped),
        // else the icon renders unpainted on the frontend. Mirrors the client sanitizeSvg test.
        Functions\when('wp_kses')->alias(fn ($content) => $content);
        Functions\when('add_filter')->justReturn(true);
        Functions\when('remove_filter')->justReturn(true);

        $provider = makeBlockProvider();
        $svg = '<svg><defs>'
            . '<linearGradient id="base"><stop style="stop-color:#3f2600;stop-opacity:0.6;" offset="0"></stop></linearGradient>'
            . '<linearGradient xlink:href="#base" id="grad1" gradientUnits="objectBoundingBox"></linearGradient>'
            . '<radialGradient xlink:href="#base" id="rad1"></radialGradient>'
            . '</defs>'
            . '<path style="fill:url(#grad1);stroke:none" d="M0 0h24v24H0z"></path>'
            . '<path style="fill:url(#rad1);stroke:#e68c3f" d="M1 1"></path></svg>';
        $out = $provider->sanitizeIconBlockOutput($svg);

        expect($out)->toContain('xlink:href="#base"');
        expect($out)->toContain('url(#grad1)');
        expect($out)->toContain('url(#rad1)');
        expect($out)->toContain('stop-color:#3f2600');
        expect($out)->not->toContain('none)'); // local url(#..) not rewritten to none
    });

    test('preserves a real Inkscape export with deeply chained local gradient refs', function () {
        // Fixture: an all-local-ref Inkscape SVG (DOCTYPE + rdf/dc/cc namespaces, pt units, no
        // viewBox) whose 30+ gradients chain via xlink:href="#id" and whose paths paint via
        // style="fill:url(#id)". Every ref is a LOCAL #fragment, so the remote-ref post-passes must
        // touch NONE of them - a regex that mis-scopes would blank the whole icon on the frontend.
        Functions\when('wp_kses')->alias(fn ($content) => $content);
        Functions\when('add_filter')->justReturn(true);
        Functions\when('remove_filter')->justReturn(true);

        $svg = file_get_contents(__DIR__ . '/fixtures/inkscape-chained-gradients.svg');
        $provider = makeBlockProvider();
        $out = $provider->sanitizeIconBlockOutput($svg);

        // Chained gradient refs survive (base def, a re-used ref, a radial ref).
        expect($out)->toContain('xlink:href="#linearGradient172"');
        expect($out)->toContain('xlink:href="#linearGradient167"');
        expect($out)->toContain('id="radialGradient1399"');
        // Local url(#id) paint refs survive, not rewritten to none.
        expect($out)->toContain('url(#radialGradient1399)');
        expect($out)->toContain('url(#linearGradient1425)');
        expect($out)->toContain('stop-color:#3f2600');
        expect($out)->toContain('stroke:#e68c3f');
        // Nothing phones home to strip, so no local url(#..) is collapsed to none.
        expect($out)->not->toContain('url(#none');
        expect($out)->not->toContain('none)');
    });

    test('keeps the wrapper anchor external href (remote-ref stripping is scoped to the svg)', function () {
        // Regression: stripRemoteRefs used to run over the whole block and delete the wrapper
        // <a href="https://..."> the block emits for an external icon link, breaking navigation.
        // It must now only touch refs inside the <svg>.
        Functions\when('wp_kses')->alias(fn ($content) => $content);
        Functions\when('add_filter')->justReturn(true);
        Functions\when('remove_filter')->justReturn(true);

        $provider = makeBlockProvider();
        $html = '<div class="wp-block-icon"><a href="https://example.com" target="_blank" rel="noopener">'
            . '<svg><use xlink:href="https://evil.example/x.svg#a"></use></svg></a></div>';
        $out = $provider->sanitizeIconBlockOutput($html);

        // Wrapper navigation link preserved...
        expect($out)->toContain('href="https://example.com"');
        // ...but the SVG-internal phone-home ref is still stripped.
        expect($out)->not->toContain('evil.example');
    });

    test('neutralizes a protocol-relative wrapper anchor href that wp_kses lets through', function () {
        // wp_kses only protocol-filters against http/https/mailto/tel; a scheme-less //evil.example
        // carries no bad scheme and survives, resolving to an external origin (open-redirect / off-
        // site link). The client isSafeUrl rejects '//', so mirror that on the server: rewrite to #.
        Functions\when('wp_kses')->alias(fn ($content) => $content);
        Functions\when('add_filter')->justReturn(true);
        Functions\when('remove_filter')->justReturn(true);

        $provider = makeBlockProvider();
        $html = '<div class="wp-block-icon"><a href="//evil.example/x" target="_blank">'
            . '<svg><path d="M0 0"></path></svg></a></div>';
        $out = $provider->sanitizeIconBlockOutput($html);

        expect($out)->not->toContain('evil.example');
        expect($out)->toContain('href="#"');
    });

    test('neutralizes backslash-normalized protocol-relative wrapper anchor hrefs', function () {
        // Browsers normalize '\' to '/' in special-scheme URLs, so href="/\evil", "\\evil" and
        // "\/evil" all resolve to //evil (external origin). The '//'-only check would miss them, so
        // stripProtocolRelativeHref normalizes backslashes before the check. Guards the open-redirect.
        Functions\when('wp_kses')->alias(fn ($content) => $content);
        Functions\when('add_filter')->justReturn(true);
        Functions\when('remove_filter')->justReturn(true);

        $provider = makeBlockProvider();

        foreach (['/\\evil.example/x', '\\\\evil.example/x', '\\/evil.example/x'] as $href) {
            $html = '<div class="wp-block-icon"><a href="' . $href . '" target="_blank">'
                . '<svg><path d="M0 0"></path></svg></a></div>';
            $out = $provider->sanitizeIconBlockOutput($html);

            expect($out)->not->toContain('evil.example');
            expect($out)->toContain('href="#"');
        }
    });

    test('keeps a same-origin absolute wrapper anchor href (only // is neutralized)', function () {
        Functions\when('wp_kses')->alias(fn ($content) => $content);
        Functions\when('add_filter')->justReturn(true);
        Functions\when('remove_filter')->justReturn(true);

        $provider = makeBlockProvider();
        $html = '<div class="wp-block-icon"><a href="https://example.com/page">'
            . '<svg><path d="M0 0"></path></svg></a></div>';
        $out = $provider->sanitizeIconBlockOutput($html);

        expect($out)->toContain('href="https://example.com/page"');
    });

    test('strips remote xlink:href inside an unclosed <svg> that wp_kses did not balance', function () {
        // Bug fix: the (xlink:)href strip was scoped to a matched <svg>...</svg> span, but wp_kses
        // does NOT balance tags, so a malformed unclosed <svg> produced no match and skipped the
        // strip entirely - the browser still recovers the SVG and a remote xlink:href phones home.
        // The span now also terminates at end-of-string so the unclosed case is still stripped.
        Functions\when('wp_kses')->alias(fn ($content) => $content);
        Functions\when('add_filter')->justReturn(true);
        Functions\when('remove_filter')->justReturn(true);

        $provider = makeBlockProvider();
        $html = '<div class="wp-block-icon"><svg viewBox="0 0 24 24">'
            . '<feImage xlink:href="https://evil.example/track.png">';
        $out = $provider->sanitizeIconBlockOutput($html);

        expect($out)->not->toContain('evil.example');
    });

    test('strips remote xlink:href after a NESTED <svg></svg> inside the outer svg', function () {
        // Bug fix: the strip span was lazy (<svg>[\s\S]*?</svg>), so a nested inner <svg></svg>
        // supplied an early </svg> that closed the match; a remote (xlink:)href placed after it but
        // still inside the OUTER svg was never stripped and phoned home on the frontend. The span is
        // now greedy to the LAST </svg>, covering the whole outer svg including any nesting.
        Functions\when('wp_kses')->alias(fn ($content) => $content);
        Functions\when('add_filter')->justReturn(true);
        Functions\when('remove_filter')->justReturn(true);

        $provider = makeBlockProvider();
        $html = '<div class="wp-block-icon"><svg><svg></svg>'
            . '<filter id="f"><feImage xlink:href="https://evil.example/track"></feImage></filter>'
            . '<rect filter="url(#f)"></rect></svg></div>';
        $out = $provider->sanitizeIconBlockOutput($html);

        expect($out)->not->toContain('evil.example');
        expect($out)->toContain('filter="url(#f)"'); // local ref kept
    });

    test('strips a remote url() phone-home ref from the wrapper style, not just inside the svg', function () {
        // Regression guard: href stripping is svg-scoped, but url()/@import must still be stripped
        // across the WHOLE block. safecss_filter_attr allows http url() (broad wp_allowed_protocols),
        // so a wrapper style="background-image:url(http://evil)" would otherwise leak the visitor IP.
        Functions\when('wp_kses')->alias(fn ($content) => $content);
        Functions\when('add_filter')->justReturn(true);
        Functions\when('remove_filter')->justReturn(true);

        $provider = makeBlockProvider();
        $html = '<div class="wp-block-icon" style="background-image:url(http://evil.example/t.png)">'
            . '<svg><path d="M0 0"></path></svg></div>';
        $out = $provider->sanitizeIconBlockOutput($html);

        expect($out)->not->toContain('evil.example');
    });

    test('strips an unterminated url( in a kept <style> that would otherwise phone home', function () {
        // wp_kses keeps <style> verbatim (allowlisted element) and does not parse CSS, so an
        // unterminated url(//host with no ')' - which the CSS tokenizer resolves to EOF - would survive
        // the balanced url() strip and beacon each visitor's IP/UA on every page view. End-to-end guard
        // that the render path neutralizes it.
        Functions\when('wp_kses')->alias(fn ($content) => $content);
        Functions\when('add_filter')->justReturn(true);
        Functions\when('remove_filter')->justReturn(true);

        $provider = makeBlockProvider();
        $html = '<div class="wp-block-icon"><style>svg{background:url(//evil.example/beacon</style>'
            . '<svg><path d="M0 0"></path></svg></div>';
        $out = $provider->sanitizeIconBlockOutput($html);

        expect($out)->not->toContain('evil.example');
    });
});

describe('SvgSanitizer remote-ref strippers', function () {
    test('removes remote href, xlink:href, url() and @import', function () {
        expect(stripRemoteRefs('<use xlink:href="https://evil/x#a"></use>'))->toBe('<use></use>');
        expect(stripRemoteRefs('<a href="//evil/x">y</a>'))->toBe('<a>y</a>');
        expect(stripRemoteRefs('<rect fill="url(https://evil/p)"></rect>'))->toBe('<rect fill="none"></rect>');
        expect(stripRemoteRefs('<style>@import "https://evil/e.css";</style>'))->toBe('<style></style>');
    });

    test('removes data: and javascript: (xlink:)href even though wp_kses does not protocol-filter them', function () {
        expect(stripRemoteRefs('<use xlink:href="data:image/svg+xml;base64,PHN2Zz4="></use>'))->toBe('<use></use>');
        expect(stripRemoteRefs('<use href="javascript:alert(1)"></use>'))->toBe('<use></use>');
    });

    test('is not bypassed by leading whitespace before the scheme', function () {
        // wp_kses preserves leading whitespace in xlink:href/url(); the browser trims it, so a
        // " https://" value must still be stripped rather than slipping past the scheme anchor.
        expect(stripRemoteRefs('<use xlink:href=" https://evil/x"></use>'))->toBe('<use></use>');
        expect(stripRemoteRefs('<rect fill="url( https://evil/p)"></rect>'))->toBe('<rect fill="none"></rect>');
    });

    test('keeps local fragment refs and same-origin fragment paint', function () {
        // Local url(#id) gradient/pattern refs and href="#id" fragment refs are the intended behavior.
        expect(stripRemoteRefs('<use href="#icon"></use>'))->toBe('<use href="#icon"></use>');
        expect(stripRemoteRefs('<rect fill="url(#grad)"></rect>'))->toBe('<rect fill="url(#grad)"></rect>');
    });

    test('is not bypassed by an HTML-entity-encoded scheme', function () {
        // Bug fix: a literal-scheme match runs on pre-decode markup, so `&#104;ttps://` (which the
        // browser decodes to `https://` and fetches, phoning home via e.g. <feImage>) slipped past.
        // Allowlisting by the decoded #ref value closes the encoding bypass on both href and url().
        expect(stripRemoteRefs('<use xlink:href="&#104;ttps://evil/x"></use>'))->toBe('<use></use>');
        expect(stripRemoteRefs('<rect fill="url(&#104;ttps://evil/p)"></rect>'))->toBe('<rect fill="none"></rect>');
    });

    test('drops a relative (non-#) ref an icon should never need', function () {
        // Only local #fragment refs are kept; a relative path is still a potential phone-home.
        expect(stripRemoteRefs('<use xlink:href="sprite.svg#a"></use>'))->toBe('<use></use>');
        expect(stripRemoteRefs('<rect fill="url(sprite.svg)"></rect>'))->toBe('<rect fill="none"></rect>');
    });

    test('neutralizes a bare-string remote url in image-set()/image() that has no url() token', function () {
        // Bug fix: image-set()/image() carry the url as a bare string, so the url() strip missed them
        // and the remote resource still phoned home from a kept <style>/inline style. The whole
        // function call is now neutralized to none, covering the -webkit- prefix and nested url() too.
        expect(stripRemoteRefs('<style>.a{background:image-set("https://evil/x.png" 1x)}</style>'))
            ->toBe('<style>.a{background:none}</style>');
        expect(stripRemoteRefs('<rect style="background:image(&#104;ttps://evil/x.png)"></rect>'))
            ->toBe('<rect style="background:none"></rect>');
        expect(stripRemoteRefs('<style>.a{background:-webkit-image-set(url(https://evil/x.png) 2x)}</style>'))
            ->toBe('<style>.a{background:none}</style>');
        // A comma-separated list position (after `,`) is also a CSS value context and is neutralized.
        expect(stripRemoteRefs('<style>.a{background:url(#g),image("https://evil/x.png")}</style>'))
            ->toBe('<style>.a{background:url(#g),none}</style>');
    });

    test('does not corrupt literal "image (...)" prose in text content', function () {
        // Bug fix: the image()/image-set() strip ran over flat markup with no CSS-value boundary, so
        // `image (` in a <desc>/<text> body matched and was replaced with none. The leading [:,(]
        // guard confines the match to a real CSS value position.
        expect(stripRemoteRefs('<desc>This is an image (icon)</desc>'))
            ->toBe('<desc>This is an image (icon)</desc>');
        expect(stripRemoteRefs('<text>image (2)</text>'))->toBe('<text>image (2)</text>');
    });

    test('is not bypassed by a CSS-escaped url() token in a kept <style> body', function () {
        // Bug fix: the url() strip matched the literal `url(` token, so a CSS escape hiding it
        // (`\75rl(` where \75 == "u", or `\url(`) survived and the browser reconstituted url() and
        // phoned home on every page view. neutralizeCssEscapes drops the backslashes first, so the
        // hidden token is either caught by the url() strip (\url( -> url( -> none) or collapses to
        // inert CSS (\75rl( -> 75rl(). The <style> body is the live vector (inline style="" is also
        // safecss-filtered by wp_kses, which rejects a declaration containing a backslash).
        expect(stripRemoteRefs('<style>.a{background:\\url(https://evil/x.png)}</style>'))
            ->toBe('<style>.a{background:none}</style>');
        // `\75rl(` -> `75rl(`: an inert token the browser never fetches. The URL text harmlessly
        // remains, but no `url(`/image() function wraps a remote scheme, so nothing phones home.
        expect(stripRemoteRefs('<style>.a{background:\\75rl(https://evil/x.png)}</style>'))
            ->not->toMatch('/(?:url|image(?:-set)?)\(\s*[\'"]?https/i');
        expect(stripRemoteRefs('<style>.a{background:\\000075rl(https://evil/x.png)}</style>'))
            ->not->toMatch('/(?:url|image(?:-set)?)\(\s*[\'"]?https/i');
        // A legit local ref still survives the blanket backslash removal.
        expect(stripRemoteRefs('<style>.a{fill:url(#grad)}</style>'))
            ->toBe('<style>.a{fill:url(#grad)}</style>');
    });

    test('neutralizes an UNTERMINATED url( with no closing paren that consumes to end-of-input', function () {
        // Bug fix: the balanced url() strip requires a ')'. Per the CSS Syntax spec a url-token with no
        // closing paren consumes to end-of-input, so `<style>svg{background:url(//evil` survives wp_kses
        // (which keeps <style> verbatim and does not parse CSS) and the browser still resolves it and
        // phones home on every page view. The end-of-string url( pass neutralizes it.
        expect(stripRemoteRefs('<style>svg{background:url(//evil.example/beacon</style>'))
            ->not->toContain('evil.example');
        expect(stripRemoteRefs("<style>svg{background:url('https://evil.example/x"))
            ->not->toContain('evil.example');
        // A balanced local url(#id) elsewhere is untouched (it has its ')').
        expect(stripRemoteRefs('<rect fill="url(#grad)"></rect>'))->toBe('<rect fill="url(#grad)"></rect>');
    });

    test('returns the input unchanged when a PCRE backtrack error makes preg_replace return null', function () {
        // Force the PCRE backtrack-limit error path so preg_replace returns null; stripRemoteRefs
        // must fall back to the original markup rather than blanking the icon.
        $orig = ini_get('pcre.backtrack_limit');
        ini_set('pcre.backtrack_limit', '1');
        try {
            // Unterminated url( makes [^)]* consume then backtrack past the limit -> PCRE error.
            $svg = '<rect fill="url(https://' . str_repeat('a', 64) . '"></rect>';
            expect(stripRemoteRefs($svg))->toBe($svg);
        } finally {
            ini_set('pcre.backtrack_limit', $orig);
        }
    });
});

function invokeSanitizerMethod(string $method, array $args)
{
    $ref = new ReflectionMethod(SvgSanitizer::class, $method);
    $ref->setAccessible(true);

    return $ref->invoke(null, ...$args);
}

describe('SvgSanitizer PCRE-error fallbacks', function () {
    // Every preg_* call keeps the pre-error markup (is_string(...) ? ... : <fallback>) instead of
    // blanking the icon when PCRE errors (e.g. the backtrack limit). pcre.backtrack_limit=1 forces
    // the error on any match that must backtrack, covering the false branch of each guard the way
    // the existing stripRemoteRefs backtrack test covers stripRemoteUrls' url() pass.
    beforeEach(function () {
        $this->origLimit = ini_get('pcre.backtrack_limit');
        ini_set('pcre.backtrack_limit', '1');
    });

    afterEach(function () {
        ini_set('pcre.backtrack_limit', $this->origLimit);
    });

    test('stripRemoteHrefs falls back to the input', function () {
        // Unterminated quote makes (.*?) backtrack past the limit -> preg_replace_callback returns null.
        $svg = '<use xlink:href="' . str_repeat('a', 64);
        expect(invokeSanitizerMethod('stripRemoteHrefs', [$svg]))->toBe($svg);
    });

    test('forceNoopener falls back to the input', function () {
        // A complete target=_blank anchor the non-error path WOULD rewrite (add rel=noopener), so
        // equality proves the error branch ran rather than a no-match.
        $html = '<a href="https://example.com" target="_blank"><svg></svg></a>';
        expect(invokeSanitizerMethod('forceNoopener', [$html]))->toBe($html);
    });

    test('stripRemoteUrls image-set strip falls back to the url-stripped markup', function () {
        // No url()/@import so the earlier passes don't error first; the unterminated image-set( makes
        // the final image-set preg_replace backtrack past the limit -> returns the url-stripped markup.
        $svg = '<style>.a{x:image-set(' . str_repeat('a', 64) . '}</style>';
        expect(invokeSanitizerMethod('stripRemoteUrls', [$svg]))->toBe($svg);
    });

    test('sanitize keeps the url-stripped markup when the svg-scoped href pass errors', function () {
        Functions\when('wp_kses')->alias(fn ($content) => $content);
        Functions\when('add_filter')->justReturn(true);
        Functions\when('remove_filter')->justReturn(true);

        // No remote url()/href so the strippers pass through cleanly; the <svg> span callback then
        // backtracks past the limit and sanitize() falls back to the url-stripped markup.
        $svg = '<svg><path d="M0"></path></svg>';
        expect(SvgSanitizer::sanitize($svg))->toBe($svg);
    });
});

describe('SvgSanitizer::sanitize fail-closed href recovery', function () {
    test('re-strips a remote svg href over the whole block when the svg-scoped span errors', function () {
        // Fail-closed guard: on a huge crafted SVG the greedy <svg>..</svg> span can hit the PCRE
        // backtrack limit and return null. The OLD code then kept the url-stripped-but-href-unstripped
        // output, letting a remote (xlink:)href inside the svg survive and phone home. sanitize() now
        // re-runs stripRemoteHrefs over the WHOLE block in that case, so the remote ref is still removed.
        Functions\when('wp_kses')->alias(fn ($content) => $content);
        Functions\when('add_filter')->justReturn(true);
        Functions\when('remove_filter')->justReturn(true);

        $orig = ini_get('pcre.backtrack_limit');
        // A long tail AFTER </svg> forces the greedy span to backtrack across it (>200 steps -> PCRE
        // error), while the short remote href value needs only a few backtracks (<200), so the
        // recovery strip succeeds where the span failed - the real production separation (a ~1MB SVG
        // trips the greedy span's default limit; the cheap lazy href regex stays under it).
        ini_set('pcre.backtrack_limit', '200');
        try {
            $svg = '<svg><use xlink:href="//evil"></use></svg>' . str_repeat('x', 5000);
            $out = SvgSanitizer::sanitize($svg);
            expect($out)->not->toContain('evil');
        } finally {
            ini_set('pcre.backtrack_limit', $orig);
        }
    });
});

describe('BlockProvider allowlist', function () {
    test('forbids script-injection vectors', function () {
        $allowed = allowedSvgHtml();

        // <style> and <filter>/fe* are intentionally allowed (see the dedicated test below); the
        // script-execution vectors and the SMIL animation family must stay out.
        foreach (['script', 'foreignobject', 'iframe', 'object', 'embed', 'animate', 'set'] as $tag) {
            expect($allowed)->not->toHaveKey($tag);
        }
    });

    test('allows the core icon SVG elements', function () {
        $allowed = allowedSvgHtml();

        foreach (['svg', 'g', 'path', 'circle', 'rect', 'lineargradient', 'stop'] as $tag) {
            expect($allowed)->toHaveKey($tag);
        }
    });

    test('allows <style> and the <filter> primitive family so existing icons keep class fills and effects', function () {
        // Regression guard for the feature-breaking finding: already-published icons uploaded before
        // the server sanitizer existed could store class-based <style> fills and <filter> drop-shadow/
        // blur effects. The allowlist must keep them so they don't silently vanish on the frontend.
        $allowed = allowedSvgHtml();

        foreach (['style', 'filter', 'fegaussianblur', 'fedropshadow', 'feoffset', 'femerge'] as $tag) {
            expect($allowed)->toHaveKey($tag);
        }
    });

    test('allows the static marker/textPath/switch elements the prior client profile kept', function () {
        // Parity restore: these are script-free static elements already-published custom icons may
        // contain (kept by the old client DOMPurify profile). They must be allowed so they don't
        // vanish on the frontend. SMIL animation stays out (see the forbids-script-vectors test).
        $allowed = allowedSvgHtml();

        foreach (['marker', 'textpath', 'switch'] as $tag) {
            expect($allowed)->toHaveKey($tag);
        }
    });

    test('keeps safe presentation attributes (vector-effect/paint-order/color) so existing icons render the same', function () {
        // Parity gap fix: the prior client DOMPurify pass left these on shapes; the server allowlist
        // must keep them or a published icon using vector-effect="non-scaling-stroke" changes on the
        // frontend. They are presentational and script-free.
        $allowed = allowedSvgHtml();

        foreach (['vector-effect', 'paint-order', 'color'] as $attr) {
            expect($allowed['path'])->toHaveKey($attr);
        }
    });

    test('keeps display/visibility/shape-rendering so a layer hidden in the editor stays hidden on the frontend', function () {
        // Contract-consistency fix: the client DOMPurify svg profile keeps these attributes, so a
        // <path display="none">/<g visibility="hidden"> sub-layer is hidden in the editor. If the
        // server allowlist dropped the attribute, the hidden layer would reappear on the public
        // frontend. They are presentational and script-free; keep both sides in sync.
        $allowed = allowedSvgHtml();

        foreach (['display', 'visibility', 'shape-rendering'] as $attr) {
            expect($allowed['path'])->toHaveKey($attr);
        }
    });

    test('allows the HTML Anchor id on the wrapper div and link so existing anchored blocks keep it', function () {
        $allowed = allowedSvgHtml();

        expect($allowed['div'])->toHaveKey('id');
        expect($allowed['a'])->toHaveKey('id');
    });

    test('allows the wrapper anchor aria-label/aria-hidden/role so linked icons keep their accessible name on the frontend', function () {
        // Regression guard: save() emits aria-label on the linked-icon <a> for its WCAG accessible-name
        // fix (frontend/src/blocks/icon/save.tsx). wp_kses only auto-allows data-* (not aria-*) on a
        // caller-supplied allowlist, so without these keys the anchor's aria-label is stripped on every
        // render_block pass and a label-empty/title-set linked icon is announced as a bare "link".
        $allowed = allowedSvgHtml();

        foreach (['aria-label', 'aria-hidden', 'role'] as $attr) {
            expect($allowed['a'])->toHaveKey($attr);
        }
    });

    test('never allows an on* event handler attribute on any element', function () {
        foreach (allowedSvgHtml() as $tag => $attrs) {
            foreach (array_keys($attrs) as $attr) {
                expect(str_starts_with($attr, 'on'))->toBeFalse("tag <{$tag}> allows {$attr}");
            }
        }
    });
});

describe('SvgSanitizer::allowSvgStyleProps', function () {
    test('adds SVG paint and display so wp_kses keeps inline-style colors and the flex fallback', function () {
        $out = SvgSanitizer::allowSvgStyleProps(['color', 'width']);

        // Existing props are preserved (merge, not replace)...
        expect($out)->toContain('color')->toContain('width');
        // ...and the SVG paint subset plus display are added.
        foreach (['fill', 'stroke', 'stop-color', 'stroke-width', 'display'] as $prop) {
            expect($out)->toContain($prop);
        }
    });

    test('adds the safe presentational props the prior DOMPurify pass kept in inline style', function () {
        // Parity gap fix: safecss_filter_attr's default allowlist drops these, so a published icon
        // with style="vector-effect:non-scaling-stroke" / clip-path / transform lost them on the
        // frontend. url() values are still neutralized to local #refs by stripRemoteUrls.
        $out = SvgSanitizer::allowSvgStyleProps([]);

        foreach (['vector-effect', 'paint-order', 'clip-path', 'mask', 'transform', 'mix-blend-mode'] as $prop) {
            expect($out)->toContain($prop);
        }
    });

    test('allows the wrapper flex alignment props so centered/justified icons survive on WP 5.9/6.0', function () {
        // getWrapperStyles emits display:flex + align-items/justify-content. Core added the flex
        // alignment props to safecss_filter_attr only in WP 6.1 (trac #56122); on the declared floor
        // (WP 5.9/6.0) safecss matches names with an exact in_array(), so without these two every
        // already-published centered/justified icon collapses to the left on the frontend.
        $out = SvgSanitizer::allowSvgStyleProps([]);

        foreach (['align-items', 'justify-content'] as $prop) {
            expect($out)->toContain($prop);
        }
    });

    test('allows the exact icon custom properties so rotate/flip/stroke-width survive on WP 5.9+', function () {
        // safecss_filter_attr drops any --* declaration it doesn't allow, so without these the
        // container's --ib-rotate/--ib-flip-*/--icon-stroke-width are stripped and every published
        // rotated/flipped icon renders upright. The exact names are listed (not the '--*' wildcard)
        // because pre-6.1 safecss matches property names with an exact in_array() - '--*' never
        // matches '--ib-rotate' there, so on the declared floor (WP 5.9) the wildcard was a no-op.
        $out = SvgSanitizer::allowSvgStyleProps([]);

        foreach (['--ib-rotate', '--ib-flip-x', '--ib-flip-y', '--icon-stroke-width'] as $prop) {
            expect($out)->toContain($prop);
        }
    });
});

describe('SvgSanitizer::sanitize rel=noopener', function () {
    test('forces rel="noopener" on a target=_blank anchor authored without rel (Code Editor path)', function () {
        // save() emits rel="noopener noreferrer", but Code-Editor/REST authoring bypasses save(), so
        // the server pass must add it to prevent reverse-tabnabbing on the opened tab.
        Functions\when('wp_kses')->alias(fn ($content) => $content);
        Functions\when('add_filter')->justReturn(true);
        Functions\when('remove_filter')->justReturn(true);

        $provider = makeBlockProvider();
        $html = '<div class="wp-block-icon"><a href="https://example.com" target="_blank"><svg><path d="M0 0"></path></svg></a></div>';
        $out = $provider->sanitizeIconBlockOutput($html);

        expect($out)->toContain('rel="noopener noreferrer"');
    });

    test('keeps an existing rel and adds noopener without duplicating it', function () {
        Functions\when('wp_kses')->alias(fn ($content) => $content);
        Functions\when('add_filter')->justReturn(true);
        Functions\when('remove_filter')->justReturn(true);

        $provider = makeBlockProvider();
        // Existing rel lacking noopener -> noopener prepended.
        $html = '<a href="https://example.com" target="_blank" rel="nofollow"><svg></svg></a>';
        $out = $provider->sanitizeIconBlockOutput($html);
        expect($out)->toContain('rel="noopener nofollow"');

        // Already has noopener -> left unchanged (not duplicated).
        $already = '<a href="https://example.com" target="_blank" rel="noopener noreferrer"><svg></svg></a>';
        $out2 = $provider->sanitizeIconBlockOutput($already);
        expect(substr_count($out2, 'noopener'))->toBe(1);
    });

    test('adds rel when the literal "noopener" appears only in an unrelated attribute', function () {
        // Bug fix: the noopener check used to scan the whole <a> tag, so a href/title merely
        // containing the substring "noopener" (e.g. a query param) tricked it into skipping a rel
        // that was never actually present, leaving a target=_blank link open to reverse-tabnabbing.
        // The check is now scoped to the rel VALUE only.
        Functions\when('wp_kses')->alias(fn ($content) => $content);
        Functions\when('add_filter')->justReturn(true);
        Functions\when('remove_filter')->justReturn(true);

        $provider = makeBlockProvider();
        $html = '<a href="https://example.com/?ref=noopener" target="_blank"><svg></svg></a>';
        $out = $provider->sanitizeIconBlockOutput($html);

        expect($out)->toContain('rel="noopener noreferrer"');
    });
});
