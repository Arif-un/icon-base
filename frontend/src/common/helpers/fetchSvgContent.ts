import DOMPurify from "dompurify";

const svgCache: Record<string, string> = {};

export function sanitizePathSegment(segment: string): string {
  // Strip everything outside the safe set, then collapse any run of 2+ dots to one so a `..`
  // traversal segment can't survive (`/` is already gone, but `foo/../secret` -> `foo.secret`
  // style escapes and a bare `..` are still worth closing as defense in depth).
  return segment.replace(/[^a-zA-Z0-9._-]/g, "").replace(/\.{2,}/g, ".");
}

// Remove <image> elements: an embedded raster/remote href isn't icon vector content, and a
// remote href leaks the visitor's IP on every page view. DOMPurify's svg profile allows <image>
// and its FORBID_TAGS is unreliable across environments, so strip it here. Runs on DOMPurify
// output, which has already encoded any '>' inside attribute values so [^>]* can't over-match.
// ponytail: regex strip on already-sanitized markup, not a DOM walk; adequate for this sink.
export function stripImageTags(svg: string): string {
  return svg.replace(/<image\b[^>]*>/gi, "").replace(/<\/image>/gi, "");
}

// Unwrap the SMIL animation family (<animate>, <set>, ...) that DOMPurify's svg profile keeps but
// the server wp_kses allowlist omits (SMIL is an XSS surface wp_kses can't value-filter, so it is
// deliberately dropped on both sides). Otherwise it would render in the editor and vanish on the
// public frontend, which re-sanitizes stored markup through wp_kses. wp_kses strips a disallowed tag
// while KEEPING its children, so this mirrors it exactly - remove only the open/close tags, keep
// contents. <marker>/<textPath>/<switch> are static and script-free and ARE allowed by both sides,
// so they are intentionally NOT stripped. Runs on already-sanitized markup (same rationale as
// stripImageTags), so an encoded '>' inside an attribute can't over-match. Keep this list in sync
// with SvgSanitizer::allowedSvgHtml (which allows everything not listed here).
// ponytail: fixed tag list mirroring the allowlist gap; extend both together if the allowlist changes.
const SERVER_UNSUPPORTED_TAGS = "animateTransform|animateMotion|animateColor|animate|set|mpath";
export function stripUnsupportedTags(svg: string): string {
  // (?=[\s/>]) not \b: a bare \b treats the hyphen in a name like <set-like> as a boundary and the
  // shorter alternative would wrongly match it. Requiring a real name terminator (space, `/`, `>`)
  // matches only the exact element names. Lookahead (not lookbehind) so it parses on Safari < 16.4.
  return svg.replace(new RegExp(`</?(?:${SERVER_UNSUPPORTED_TAGS})(?=[\\s/>])[^>]*>`, "gi"), "");
}

// Neutralize external resource references so a rendered icon can't phone home (visitor IP/UA
// leak on every page view) or pull in remote CSS. Covers <style> bodies, inline style=, paint
// attributes (fill="url(https://..)") and remote href/xlink:href (e.g. <feImage xlink:href=
// "https://..">, which DOMPurify's svgFilters profile keeps) uniformly since it runs on the flat
// markup string. DOMPurify's svg profile keeps <style> and does not parse CSS, so remote
// url()/@import survive it; this is the same threat stripImageTags removes <image> for. Local
// url(#id) paint refs and href="#id" fragment refs (gradients/patterns/use) are kept - that is
// the intended behavior.
// ponytail: regex on already-sanitized markup, not a CSS parser; adequate for this sink.
// Decode HTML entities in an attribute/url value so an encoded scheme (e.g. &#104;ttps://) is seen
// for what the browser will resolve it to, closing the entity-encoding bypass of a literal-scheme
// match. Uses the DOM parser, which mirrors browser decoding exactly.
function decodeEntities(value: string): string {
  const el = document.createElement("textarea");
  el.innerHTML = value;

  return el.value;
}

// CSS lets an author escape any character (`\75` == "u", `\u` == "u"), which hides a function/at-rule
// token like url()/@import from the literal-token strips below: `\75rl(https://evil)` has no "url("
// substring, yet the browser resolves it to url() and phones home on every view. An icon's CSS never
// legitimately needs escapes, so drop every backslash inside <style> bodies and inline style="" values
// before the strips run: a hidden token either reconstitutes to a plain token the strips then catch
// (`\url(` -> `url(`), or collapses to invalid CSS the browser never fetches (`\75rl(` -> `75rl(`).
// Mirrors SvgSanitizer::neutralizeCssEscapes.
// ponytail: blanket backslash removal in CSS contexts; revisit if an icon ever needs an escaped class
// selector (e.g. Tailwind-style `.foo\:bar`).
function neutralizeCssEscapes(svg: string): string {
  return svg
    .replace(
      /(<style\b[^>]*>)([\s\S]*?)(<\/style>)/gi,
      (_m, open: string, css: string, close: string) => `${open}${css.replace(/\\/g, "")}${close}`,
    )
    .replace(
      /style\s*=\s*(["'])(.*?)\1/gis,
      (_m, q: string, val: string) => `style=${q}${val.replace(/\\/g, "")}${q}`,
    );
}

// Allowlist by local #id fragment, NOT by literal scheme, mirroring SvgSanitizer::stripRemoteUrls/
// stripRemoteHrefs. A scheme match runs on pre-decode markup, so an entity-encoded scheme would
// slip past it and phone home once the browser decodes it; keeping only #ref values closes that.
const keepLocalRef = (full: string, value: string, fallback: string): string =>
  decodeEntities(value).trim().startsWith("#") ? full : fallback;

export function stripRemoteRefs(svg: string): string {
  return (
    neutralizeCssEscapes(svg)
      .replace(/@import[^;]*;?/gi, "")
      .replace(/url\(\s*(['"]?)([^)]*?)\1\s*\)/gi, (m, _q, value: string) =>
        keepLocalRef(m, value, "none"),
      )
      // image-set()/image() take a BARE-STRING url ("https://..") with no url() token, so the url()
      // strip above misses them. An icon never needs either; neutralize the whole call (nested at
      // most one level, e.g. image-set(url(..) 1x)) to none, mirroring SvgSanitizer::stripRemoteUrls.
      // The leading CSS-value boundary ([:,(] + optional ws, consumed and re-emitted) confines the
      // match to a real CSS value position so literal prose like `<desc>an image (x)</desc>` is not
      // corrupted; a CSS function only ever follows `:`, `,`, or `(`.
      // ponytail: fixed function list (image-set/image, incl -webkit-); extend both sides together.
      .replace(/([:,(]\s*)(?:-webkit-)?image(?:-set)?\s*\((?:[^()]|\([^()]*\))*\)/gi, "$1none")
      // An unterminated url( with no closing ")" is missed by the balanced url() strip above, but per
      // the CSS Syntax spec a url-token consumes to end-of-input, so the browser still resolves it and
      // phones home. `[^)]*$` matches only when no ")" exists from url( to end-of-string - the
      // unterminated case - so a balanced url(#id) is untouched. Mirrors SvgSanitizer::stripRemoteUrls.
      .replace(/url\(\s*['"]?[^)]*$/i, "none")
      .replace(/\s(?:xlink:)?href\s*=\s*(['"])(.*?)\1/gis, (m, _q, value: string) =>
        keepLocalRef(m, value, ""),
      )
  );
}

export function sanitizeSvg(raw: string): string {
  const wrapped = `<svg xmlns="http://www.w3.org/2000/svg">${raw}</svg>`;
  const clean = DOMPurify.sanitize(wrapped, {
    USE_PROFILES: { svg: true, svgFilters: true },
  });
  const match = clean.match(/^<svg[^>]*>([\s\S]*)<\/svg>$/);
  const inner = match ? match[1] : clean;

  // The SMIL animation family is dropped for parity with the server-side wp_kses allowlist
  // (SvgSanitizer::allowedSvgHtml permits none of it): the public frontend echoes stored markup
  // through wp_kses without re-running this sanitizer, so anything kept here but stripped there would
  // render in the editor and vanish/change on the live site. <style>, <filter>/fe*, and the static
  // <marker>/<textPath>/<switch> ARE allowed by both sides, so they are intentionally kept here;
  // remote @import/url()/href inside them is still neutralized by stripRemoteRefs (and its server
  // mirror). Stripping is by regex (not DOMPurify config) because, like <image>, DOMPurify's tag
  // filtering is unreliable across environments.
  return stripRemoteRefs(stripUnsupportedTags(stripImageTags(inner)));
}

export function getSvgCache(path: string): string | null {
  return svgCache[path] ?? null;
}

export async function fetchSvgContent(
  rootUrl: string,
  libraryDir: string,
  filename: string,
  signal?: AbortSignal,
): Promise<string> {
  const path = `${sanitizePathSegment(libraryDir)}/${sanitizePathSegment(filename)}`;

  if (svgCache[path]) {
    return svgCache[path];
  }

  const res = await fetch(`${rootUrl}/icons/${path}`, {
    signal,
    cache: "force-cache",
  });
  // A non-2xx body (404/500 error page) survives sanitizeSvg as a non-empty string (DOMPurify keeps
  // stripped tags' text), which would be cached under `path` and defeat the caller's `!svgContent`
  // guard, rendering a permanently blank icon with no retry. Fail loud instead of caching garbage.
  if (!res.ok) {
    throw new Error(`Failed to fetch SVG (${String(res.status)}): ${path}`);
  }
  const text = await res.text();
  const sanitized = sanitizeSvg(text);
  svgCache[path] = sanitized;

  return sanitized;
}
