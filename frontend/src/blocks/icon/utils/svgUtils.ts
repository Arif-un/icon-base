import { sanitizeSvg, stripImageTags, stripRemoteRefs } from "@/common/helpers/fetchSvgContent";
import { __ } from "@/common/helpers/i18nWrap";

// A paint value that renders nothing visible: the `none`/`transparent` keywords or a fully
// transparent (zero-alpha) color. Distinct from keepPaint, which ALSO protects currentColor and
// url(#id) refs - those DO paint, so for stroke detection/padding they must still count as a real
// stroke. Keywords match case-insensitively because SVG/CSS color keywords are not case-sensitive.
export function isNoPaint(value: string): boolean {
  // Drop a trailing !important before the keyword/alpha compare: an inline style value arrives as
  // "none !important", and an exact "none"/"transparent" match (or the anchored zero-alpha regexes)
  // would otherwise miss it and the shape gets recolored to a solid currentColor.
  const v = value
    .trim()
    .toLowerCase()
    .replace(/\s*!\s*important$/, "")
    .trim();
  if (v === "none" || v === "transparent") return true;
  // Zero-alpha colors render invisible; recoloring them to currentColor paints a solid block.
  if (/^#(?:[0-9a-f]{3}0|[0-9a-f]{6}00)$/.test(v)) return true; // #RGBA / #RRGGBBAA, alpha 0
  // Comma-syntax alpha 0: require exactly 4 comma-separated components so a CSS Color 4 value on
  // the un-suffixed name (rgb(255,0,0,0) / hsl(0,0%,0%,0)) is caught too, without matching a 3-arg
  // opaque rgb(0,0,0)/hsl(0,0%,0%) (only 2 commas) which DOES paint and must be recolored.
  if (/^(?:rgb|hsl)a?\([^,)]+,[^,)]+,[^,)]+,\s*0*\.?0+%?\s*\)$/.test(v)) return true; // comma alpha 0
  if (/^(?:rgb|hsl)a?\([^)]*\/\s*0*\.?0+%?\s*\)$/.test(v)) return true; // CSS Color 4 slash alpha 0

  return false;
}

// A paint value to preserve as-is instead of rewriting to currentColor: no paint (isNoPaint -
// recoloring it would paint a solid block), an explicit currentColor, or a url(#id)
// gradient/pattern ref (currentColor can't reproduce it).
export function keepPaint(value: string): boolean {
  // Same !important tolerance as isNoPaint so "currentcolor !important" / "url(#id) !important"
  // are recognized as already-preserved paint and not needlessly rewritten.
  const v = value
    .trim()
    .toLowerCase()
    .replace(/\s*!\s*important$/, "")
    .trim();
  if (v === "currentcolor" || v.startsWith("url(")) return true;

  return isNoPaint(v);
}

// Whether a `color` attribute value should be preserved. Unlike keepPaint (used for fill/stroke),
// the ONLY value worth keeping on `color` is currentColor itself: `color` is the source that
// `currentColor` resolves to, not paint on the element. transparent/none/zero-alpha/url() would
// each make a currentColor shape invisible or un-recolorable (an element's own `color` beats the
// inherited block color), so those must be dropped so the element inherits the container color.
// Tolerates a trailing !important like isNoPaint/keepPaint.
function isCurrentColorAttr(value: string): boolean {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/\s*!\s*important$/, "")
      .trim() === "currentcolor"
  );
}

// Rewrite hardcoded fill/stroke color declarations in a CSS string to currentColor. Replace
// (not remove): a CSS class rule has no attribute fallback, so removing fill would drop the
// shape to its default black. Values keepPaint() protects (none/transparent/zero-alpha/
// currentColor/url()) are left untouched. `[^;{}]+` bounds the value to a single declaration and
// `(?=[;}]|$)` requires it to end at a real declaration terminator, so a selector fragment like
// `.icon-fill:hover{` (`:hover` followed by `{`, not `;`/`}`/end) is never mistaken for a color
// declaration.
// The leading boundary group (consumed, not a lookbehind, so it parses on Safari < 16.4) keeps a
// hyphen/word-prefixed custom property like `--accent-fill`/`--my-stroke` from matching, so its
// non-color value is not clobbered. Same guard `color` uses below for `stop-color`/`flood-color`.
const rewriteColorProp = (prop: "fill" | "stroke") => (m: string, pre: string, val: string) => {
  if (keepPaint(val)) return m;

  // Preserve a trailing !important so currentColor keeps its cascade priority over competing
  // page/theme rules; matches the url() branch, which retains the whole declaration incl.
  // !important. Dropping it would let a theme fill rule override the block color control.
  return /!\s*important/i.test(val)
    ? `${pre}${prop}:currentColor !important`
    : `${pre}${prop}:currentColor`;
};

export function neutralizeCssColors(css: string): string {
  return (
    css
      .replace(/(^|[^-\w])fill\s*:\s*([^;{}]+)(?=[;}]|$)/gi, rewriteColorProp("fill"))
      .replace(/(^|[^-\w])stroke\s*:\s*([^;{}]+)(?=[;}]|$)/gi, rewriteColorProp("stroke"))
      // `color` sets the value `currentColor` resolves to, so ANY non-currentColor value on a
      // currentColor icon defeats the block color control: a hardcoded `color:red` recolors it, and
      // `color:transparent`/zero-alpha makes it outright invisible and un-recolorable (an element's own
      // inline `color` beats the inherited block color). Mirror the `color` ATTRIBUTE path
      // (isCurrentColorAttr) and keep ONLY currentColor here - do NOT use keepPaint, which would
      // preserve no-paint/url() values and leave `color:transparent` invisible. `color:currentColor`
      // resolves to `inherit` per CSS Color, so the rewritten element follows the container color. The
      // leading boundary group (consumed, not a lookbehind, so it parses on Safari < 16.4) keeps
      // `stop-color`/`flood-color` (preceded by "-") from matching, so gradient/filter colors stay.
      .replace(/(^|[^-\w])color\s*:\s*([^;{}]+)(?=[;}]|$)/gi, (m, pre: string, val: string) => {
        if (isCurrentColorAttr(val)) return m;

        return /!\s*important/i.test(val)
          ? `${pre}color:currentColor !important`
          : `${pre}color:currentColor`;
      })
  );
}

// Normalize hardcoded colors inside <style> element bodies to currentColor, so a class-coloured
// icon (Illustrator/Inkscape "internal CSS" exports) still follows the block color control instead
// of leaving the Icon color control a dead no-op. Done as a string pass (reusing neutralizeCssColors
// on each <style> body) rather than via the DOM walk in stripSvgColors: <style> has no attribute
// fallback, and the DOM round-trip is unreliable for <style> inside <svg> in some parsers.
const STYLE_BLOCK = /(<style\b[^>]*>)([\s\S]*?)(<\/style>)/gi;
const HAS_MASK_OR_PATTERN = /<(?:mask|pattern)\b/i;

export function normalizeStyleBlocks(markup: string): string {
  // A <mask>/<pattern> paints via its children's own colors (mask luminance, pattern tile colors),
  // which the stripSvgColors DOM walk deliberately preserves (el.closest("mask, pattern")). <style>
  // rules are document-global and can't be scoped per-element by a string pass, so when the icon has
  // a mask/pattern we skip <style> normalization entirely rather than collapse a multi-color pattern
  // to one currentColor. Mirrors the DOM walk's mask/pattern skip.
  // ponytail: coarse skip on any mask/pattern presence; correlate CSS selectors to elements only if a
  // real icon needs both <style>-coloured non-pattern shapes AND a mask/pattern in one file.
  if (HAS_MASK_OR_PATTERN.test(markup)) return markup;

  return markup.replace(STYLE_BLOCK, (_m, open: string, css: string, close: string) => {
    return `${open}${neutralizeCssColors(css)}${close}`;
  });
}

// Whether any <style> body carries a color neutralizeCssColors would rewrite. String-based (not DOM)
// so it mirrors normalizeStyleBlocks and is parser-independent. Returns false when a mask/pattern is
// present because normalizeStyleBlocks then leaves <style> as-authored (see its mask/pattern skip).
export function styleBlocksHaveNormalizableColors(markup: string): boolean {
  if (HAS_MASK_OR_PATTERN.test(markup)) return false;

  for (const [, , css] of markup.matchAll(STYLE_BLOCK)) {
    if (css && neutralizeCssColors(css) !== css) return true;
  }

  return false;
}

export function stripSvgColors(svgContent: string): string {
  // Reuse sanitizeSvg for the DOMPurify pass so both paint paths share one sanitize config
  // (no parity gap between the normalize and non-normalize branches). It also drops
  // <image>/remote refs; the final strip below stays for parity and is idempotent.
  const sanitized = sanitizeSvg(svgContent);

  const div = document.createElement("div");
  div.innerHTML = `<svg>${sanitized}</svg>`;
  const svg = div.querySelector("svg");
  if (!svg) return sanitized;

  // <style> blocks are kept (parity with the server wp_kses allowlist). Class-based colors declared
  // in a <style> body are normalized by normalizeStyleBlocks on the returned string (the DOM walk
  // here only touches attributes + inline style=""), so a <style>-colored icon still follows the
  // block color control instead of leaving the Icon color control a dead no-op.
  const elements = svg.querySelectorAll("*");
  for (const el of elements) {
    // Skip elements inside a <mask> or <pattern>: their child paint is not a theme color.
    // For a mask the paint value IS its luminance (white = visible, black = hidden), so rewriting
    // to currentColor collapses that differentiation and the masked artwork renders blank or full.
    // For a pattern the child shapes ARE the tile's own colors; rewriting every one to a single
    // currentColor collapses a multi-color pattern to one solid theme color. Leave both as authored
    // (matches keepPaint preserving url(#id) refs and gradient <stop> colors staying untouched).
    if (el.closest("mask, pattern")) continue;

    const fill = el.getAttribute("fill");
    if (fill && !keepPaint(fill)) {
      el.setAttribute("fill", "currentColor");
    }

    const stroke = el.getAttribute("stroke");
    if (stroke && !keepPaint(stroke)) {
      el.setAttribute("stroke", "currentColor");
    }

    // A `color` presentation attribute sets what `currentColor` resolves to, so any literal value
    // (color="red", but also color="transparent"/zero-alpha/url()) on a currentColor icon overrides
    // the block color control - transparent/url() making it outright invisible or un-recolorable.
    // Remove it unless it is already currentColor, so the element inherits the container color.
    const color = el.getAttribute("color");
    if (color && !isCurrentColorAttr(color)) {
      el.removeAttribute("color");
    }

    const style = el.getAttribute("style");
    if (style) {
      // Rewrite hardcoded fill/stroke in inline styles to currentColor (parity with the
      // <style>-block and attribute paths). Deleting stroke would leave no fallback: the
      // root <svg> sets only fill=currentColor, so a stroke-only shape would inherit the
      // default stroke `none` and render invisible.
      const cleaned = neutralizeCssColors(style).trim();
      if (cleaned) {
        el.setAttribute("style", cleaned);
      } else {
        el.removeAttribute("style");
      }
    }
  }

  // Drop <image> and remote refs at the sink (parity with sanitizeSvg): the
  // media-library/library-icon paths call stripSvgColors directly, bypassing the modal's
  // raster/remote-image validity gate.
  return normalizeStyleBlocks(stripRemoteRefs(stripImageTags(svg.innerHTML)));
}

// Whether stripSvgColors would actually rewrite anything: true when the markup carries a literal
// (non-currentColor/none/url) fill, stroke, or color - as an attribute or in an inline style - that
// normalization would convert to currentColor. The custom-SVG modal uses it to lock the Normalize
// toggle when there is nothing left to preserve (an already-normalized icon whose colors are gone),
// so unchecking can't store normalize=false on content the block color control still drives via
// currentColor. Mirrors the exact per-element gates in stripSvgColors (same keepPaint /
// neutralizeCssColors checks, same mask/pattern skip) so the lock and the rewrite never disagree.
export function svgHasNormalizableColors(svgContent: string): boolean {
  if (typeof document === "undefined") return false;

  const sanitized = sanitizeSvg(svgContent);

  // Check <style> bodies on the string (mirrors normalizeStyleBlocks): the DOM round-trip below is
  // unreliable for <style> inside <svg> in some parsers, so a class-coloured icon is detected here.
  if (styleBlocksHaveNormalizableColors(sanitized)) return true;

  const div = document.createElement("div");
  div.innerHTML = `<svg>${sanitized}</svg>`;
  const svg = div.querySelector("svg");
  if (!svg) return false;

  for (const el of svg.querySelectorAll("*")) {
    if (el.closest("mask, pattern")) continue;

    const fill = el.getAttribute("fill");
    if (fill && !keepPaint(fill)) return true;

    const stroke = el.getAttribute("stroke");
    if (stroke && !keepPaint(stroke)) return true;

    const color = el.getAttribute("color");
    if (color && !isCurrentColorAttr(color)) return true;

    const style = el.getAttribute("style");
    if (style && neutralizeCssColors(style) !== style) return true;
  }

  return false;
}

// Single source of truth for "normalize colors when opted in, else keep as-is". Callers that pass
// already-sanitized markup (edit insert, modal preview) share this so the normalize decision can't
// drift between them. BlockIconPreview deliberately does NOT use it: it renders stored post-content
// attributes and must re-run sanitizeSvg on the non-normalize branch (stripSvgColors already
// sanitizes), which this util's plain passthrough would skip.
export function applyColorNormalization(content: string, normalize: boolean): string {
  return normalize ? stripSvgColors(content) : content;
}

/**
 * Measure the real rendered bounding box of SVG inner content via getBBox, so an icon can be
 * framed to its artwork instead of a mismatched declared canvas. Returns null when geometry
 * can't be measured: no DOM, no getBBox (jsdom/happy-dom), an error, or an empty box. Callers
 * must fall back to the declared width/height in that case.
 */
export function measureSvgContentBox(
  inner: string,
): { x: number; y: number; width: number; height: number } | null {
  if (typeof document === "undefined") return null;

  const div = document.createElement("div");
  // Rendered but visually inert so getBBox has geometry without flashing on screen.
  div.setAttribute("style", "position:absolute;width:0;height:0;overflow:hidden;visibility:hidden");
  div.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg"><g>${inner}</g></svg>`;
  const g = div.querySelector("g");
  if (!g || typeof g.getBBox !== "function") return null;

  document.body.appendChild(div);
  try {
    const bb = g.getBBox();
    if (!isFinite(bb.width) || !isFinite(bb.height) || bb.width <= 0 || bb.height <= 0) {
      return null;
    }

    // getBBox returns the geometry box and excludes stroke width, so a stroked icon with no
    // viewBox would frame to its paths and the outer half of each stroke gets clipped by the
    // 0 0 w h viewBox. Strokes center on the path, so half the widest stroke overflows on every
    // side: pad by that much. ponytail: reads stroke-width from attributes/inline styles only,
    // not CSS-class rules; widen the parse if class-based stroke icons show clipping.
    const pad = svgHasStrokes(inner) ? maxStrokeWidth(inner) / 2 : 0;

    return {
      x: bb.x - pad,
      y: bb.y - pad,
      width: bb.width + pad * 2,
      height: bb.height + pad * 2,
    };
  } catch {
    return null;
  } finally {
    div.remove();
  }
}

export interface SvgFrame {
  x: number;
  y: number;
  width: number;
  height: number;
}

// Determine the viewBox to render the icon in. Prefer an explicit viewBox (author intent);
// otherwise frame to the artwork's real bounding box, since a hand-authored SVG's root
// width/height describe the CANVAS, which often doesn't match where the artwork actually sits
// (offset by a group transform, or larger than the canvas). Using the canvas as the viewBox
// then frames an empty or cropped corner and the icon looks the wrong size/ratio.
export function computeSvgFrame(svgMarkup: string, sanitizedInner: string): SvgFrame {
  // Read viewBox/width/height only from the root <svg ...> opening tag, never a descendant's
  // (a nested <svg>/<symbol>/<pattern> viewBox, or a child rect/path width=, would otherwise be
  // picked up and size/clip the icon wrongly).
  const svgOpenTag = svgMarkup.match(/<svg\b[^>]*>/i)?.[0] ?? "";
  // Case-insensitive: the HTML parser normalizes a foreign-content `viewbox=` to `viewBox`, so a
  // hand-authored/exported SVG with lowercase `viewbox` is honored by the browser and must be read
  // here too - otherwise we miss it, fall through to getBBox, and store the tight artwork bbox as
  // the canvas, rendering the icon zoomed/mis-scaled.
  const viewBoxMatch = svgOpenTag.match(/viewBox\s*=\s*["']([^"']+)["']/i);
  if (viewBoxMatch) {
    const parts = viewBoxMatch[1]
      .trim()
      .split(/[\s,]+/)
      .map(Number);
    if (parts.length === 4 && parts[2] > 0 && parts[3] > 0) {
      // Keep min-x/min-y (parts[0]/parts[1]): a viewBox like "-4 -4 32 32" offsets the artwork
      // origin. Callers translate it back to 0,0; dropping it here shifts and clips the icon.
      const [minX, minY, width, height] = parts;

      return {
        x: Number.isFinite(minX) ? minX : 0,
        y: Number.isFinite(minY) ? minY : 0,
        width,
        height,
      };
    }
  }

  // No usable viewBox: measure the real content box so the icon frames the artwork.
  const box = measureSvgContentBox(sanitizedInner);
  if (box) return box;

  // getBBox unavailable (jsdom/happy-dom) or empty: fall back to the declared canvas size
  // from the root opening tag (svgOpenTag, extracted above).
  // Accept a leading number with an optional unit suffix (px, pt, em, %, ...): SVGs often
  // declare width="500pt" with no viewBox, and a strict digits-only match would miss it and
  // fall back to 24x24, clipping the artwork out of view.
  // (?:^|[^-\w]) so "stroke-width"/"data-width" on the root tag can't be mistaken for width.
  // A consumed boundary char is used instead of a lookbehind so it parses on Safari < 16.4.
  const wMatch = svgOpenTag.match(/(?:^|[^-\w])width\s*=\s*["'](\d+(?:\.\d+)?)/i);
  const hMatch = svgOpenTag.match(/(?:^|[^-\w])height\s*=\s*["'](\d+(?:\.\d+)?)/i);
  if (wMatch && hMatch) {
    return { x: 0, y: 0, width: Number(wMatch[1]), height: Number(hMatch[1]) };
  }

  return { x: 0, y: 0, width: 24, height: 24 };
}

const EMBEDDED_RASTER = /<image[\s/>]|data:image\/(?:png|jpe?g|gif|bmp|webp|tiff?|x-icon)/i;

// Drop XML comments and free-text nodes (<title>/<desc>/<metadata>, and rendered <text>, which
// includes any nested <tspan>) before the raster scan: those carry free text that may legitimately
// mention "data:image/png" or "<image" without the SVG embedding a bitmap, which would otherwise
// false-reject a valid vector icon. A real embedded raster lives in an <image> element / data:
// attribute (never in a text body), neither of which is stripped here.
function stripSvgProse(markup: string): string {
  return markup
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<(title|desc|metadata|text)\b[^>]*>[\s\S]*?<\/\1>/gi, "");
}

/**
 * Determine whether an SVG can be used as an icon. Returns a human-readable
 * reason when the SVG is unsupported, or null when it is fine.
 *
 * Two cases are rejected:
 *  - SVGs that embed a raster bitmap (`<image>` / base64 `data:image/...`),
 *    e.g. a PNG exported as an SVG wrapper. These render as a blank box.
 *  - SVGs with no usable vector content left after sanitization.
 */
export function getUnsupportedSvgReason(rawMarkup: string, sanitizedInner: string): string | null {
  if (EMBEDDED_RASTER.test(stripSvgProse(rawMarkup))) {
    return __(
      "This SVG can't be used as an icon because it contains an embedded image (PNG/JPEG). Please use a vector SVG made of paths and shapes.",
    );
  }

  if (!sanitizedInner.trim()) {
    return __(
      "This SVG has no usable vector content. Please use a vector SVG made of paths and shapes.",
    );
  }

  return null;
}

// Drop <mask>/<pattern> subtrees before a flat stroke scan: their child strokes are paint-server
// tile/luminance content, not part of the outer artwork's rendered bounding box, so counting them
// would over-pad the frame (measureSvgContentBox) or show the stroke-width control for a stroke the
// icon never draws. Mirrors the mask/pattern skip stripSvgColors/svgHasNormalizableColors already do
// via el.closest("mask, pattern").
// ponytail: non-nested subtree strip via regex; deepen to a DOM walk if nested mask/pattern icons appear.
function stripMaskPatternSubtrees(markup: string): string {
  return markup.replace(/<(mask|pattern)\b[^>]*>[\s\S]*?<\/\1>/gi, "");
}

// Read a property from ONE opening tag as either a real presentation attribute (`prop="v"`) or an
// inline-style declaration (`style="prop:v"`), never from inside an unrelated attribute value like
// `data-note="stroke:red"`. Attributes are whitespace-separated so a real one is preceded by the tag
// boundary (^) or whitespace - a `-`/quote before the name is rejected, dropping `data-stroke=` and
// the `stroke:` buried in another value. Inline style wins over the attribute (CSS cascade), so it is
// checked first. The `(?:^|\s)`/`(?:^|[;\s])` boundaries are consumed chars (not lookbehind) so they
// parse on Safari < 16.4.
function readSvgProp(tag: string, prop: string, valueChars: string): string | undefined {
  const style = tag.match(/style\s*=\s*(["'])([\s\S]*?)\1/i)?.[2];
  const inStyle = style?.match(new RegExp(`(?:^|[;\\s])${prop}\\s*:\\s*(${valueChars})`, "i"))?.[1];
  if (inStyle !== undefined) return inStyle.trim();
  const attr = tag.match(new RegExp(`(?:^|\\s)${prop}\\s*=\\s*["']?\\s*(${valueChars})`, "i"))?.[1];

  return attr?.trim();
}

export function svgHasStrokes(svgContent: string): boolean {
  // Detect a paint-bearing stroke declared as an attribute (stroke="#000") OR in an inline style
  // (stroke:#000) so the scope matches maxStrokeWidth; a style-only stroked icon must still report a
  // stroke so measureSvgContentBox pads it. Scan per OPENING TAG (like maxStrokeWidth) so a literal
  // "stroke:" in <text> content or a <style> CSS body is never counted; both read attributes/inline
  // styles only, never CSS-class rules, keeping the two in agreement.
  for (const tag of stripMaskPatternSubtrees(svgContent).match(/<[a-zA-Z][^>]*>/g) ?? []) {
    const value = readSvgProp(tag, "stroke", "[^\"';\\s>]+");
    // isNoPaint (not `!== "none"`): a transparent/zero-alpha stroke paints nothing, so it must not
    // report a stroke and over-pad the frame. currentColor/url() still count - they do paint.
    if (value && !isNoPaint(value)) return true;
  }

  return false;
}

// Widest stroke-width declared in the markup (attribute `stroke-width="6"` or inline style
// `stroke-width:6`). Returns the SVG default of 1 when a stroke exists but no width is set.
// Used to pad a getBBox frame so strokes aren't clipped; only meaningful when svgHasStrokes.
export function maxStrokeWidth(markup: string): number {
  let max = 0;
  let found = false;
  // Scan per opening tag so a stroke-width is only counted when THAT element actually paints a
  // stroke: an element with stroke="none"/transparent must not inflate the padding via its width.
  // An element with a stroke-width but no stroke attribute is still counted (it may inherit a
  // stroke from an ancestor <g>, which this flat scan can't resolve).
  for (const tag of stripMaskPatternSubtrees(markup).match(/<[a-zA-Z][^>]*>/g) ?? []) {
    const width = readSvgProp(tag, "stroke-width", "\\d*\\.?\\d+");
    if (width === undefined) continue;
    const stroke = readSvgProp(tag, "stroke", "[^\"';\\s>]+");
    if (stroke && isNoPaint(stroke)) continue;
    found = true;
    max = Math.max(max, Number(width));
  }

  return found ? max : 1;
}

const SAFE_URL_PROTOCOLS = /^(https?:|mailto:|tel:|#)/i;

export function isSafeUrl(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed) return false;
  // Reject protocol-relative URLs: "//host" resolves to an external origin, and browsers normalize
  // backslashes to "/" in special-scheme URLs so "/\host", "\\host" and "\/host" do too. A
  // single-slash path-relative URL ("/page") stays allowed. Mirrors the server
  // SvgSanitizer::stripProtocolRelativeHref so client and server never disagree on what to keep.
  if (/^[/\\]{2}/.test(trimmed)) return false;
  if (trimmed.startsWith("/") || trimmed.startsWith("#")) return true;

  return SAFE_URL_PROTOCOLS.test(trimmed);
}
