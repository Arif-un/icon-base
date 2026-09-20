import DOMPurify from "dompurify";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  applyColorNormalization,
  computeSvgFrame,
  getUnsupportedSvgReason,
  isNoPaint,
  isSafeUrl,
  keepPaint,
  maxStrokeWidth,
  measureSvgContentBox,
  neutralizeCssColors,
  normalizeStyleBlocks,
  stripSvgColors,
  styleBlocksHaveNormalizableColors,
  svgHasNormalizableColors,
  svgHasStrokes,
} from "./svgUtils";

describe("stripSvgColors", () => {
  it("replaces hardcoded fill color with currentColor", () => {
    const result = stripSvgColors('<path fill="#FF0000" d="M0 0h24v24H0z"/>');
    expect(result).toContain('fill="currentColor"');
    expect(result).not.toContain("#FF0000");
  });

  it('preserves fill="none"', () => {
    const result = stripSvgColors('<path fill="none" d="M0 0h24v24H0z"/>');
    expect(result).toContain('fill="none"');
  });

  it('preserves fill="currentColor"', () => {
    const result = stripSvgColors('<path fill="currentColor" d="M0 0h24v24H0z"/>');
    expect(result).toContain('fill="currentColor"');
  });

  it('preserves fill="transparent" instead of painting a solid block', () => {
    // Regression (finding 4): an invisible hit-area/sizing rect (fill="transparent") was rewritten
    // to currentColor and rendered as a solid square over the icon.
    const result = stripSvgColors('<rect fill="transparent" width="24" height="24"/>');
    expect(result).toContain('fill="transparent"');
    expect(result).not.toContain('fill="currentColor"');
  });

  it("replaces hardcoded stroke color with currentColor", () => {
    const result = stripSvgColors('<path stroke="#0000FF" d="M0 0"/>');
    expect(result).toContain('stroke="currentColor"');
    expect(result).not.toContain("#0000FF");
  });

  it("rewrites inline fill in style attribute to currentColor", () => {
    const result = stripSvgColors('<path style="fill: red; opacity: 0.5" d="M0 0"/>');
    expect(result).not.toContain("red");
    expect(result).toContain("fill:currentColor");
    expect(result).toContain("opacity");
  });

  it("removes a whitespace-only style attribute", () => {
    // neutralizeCssColors keeps color decls (as currentColor), so the only way an inline style
    // trims to empty is when it held nothing but whitespace; that hits the removeAttribute path.
    const result = stripSvgColors('<path style="   " d="M0 0"/>');
    expect(result).not.toContain("style");
  });

  it("rewrites inline stroke in style attribute to currentColor (keeps stroked shapes visible)", () => {
    // Regression: deleting stroke left no fallback (root svg sets only fill=currentColor),
    // so a stroke-only shape inherited the default stroke `none` and rendered invisible.
    const result = stripSvgColors('<path style="fill:none;stroke:#000;stroke-width:2" d="M0 0"/>');
    expect(result).not.toContain("#000");
    expect(result).toContain("stroke:currentColor");
    expect(result).toContain("stroke-width:2");
    expect(result).toContain("fill:none");
  });

  it("removes a hardcoded color attribute so it inherits the block color control", () => {
    // Regression: a `color` attr sets what fill="currentColor" resolves to, so color="#ff0000"
    // on a currentColor icon overrode the block color control even with normalize on.
    const result = stripSvgColors('<path color="#ff0000" fill="currentColor" d="M0 0"/>');
    expect(result).not.toContain("#ff0000");
    expect(result).not.toContain("color=");
    expect(result).toContain('fill="currentColor"');
  });

  it("keeps a color=currentColor attribute (already inherits)", () => {
    const result = stripSvgColors('<path color="currentColor" fill="currentColor" d="M0 0"/>');
    expect(result).toContain('color="currentColor"');
  });

  it("removes color=transparent so a currentColor icon is not invisible/un-recolorable", () => {
    // Regression: keepPaint("transparent") is true (correct for fill/stroke), but on `color` it
    // made currentColor resolve to transparent, painting nothing AND overriding the block color
    // control. `color` must keep only currentColor.
    const result = stripSvgColors('<path color="transparent" fill="currentColor" d="M0 0"/>');
    expect(result).not.toContain("transparent");
    expect(result).not.toContain("color=");
    expect(result).toContain('fill="currentColor"');
  });

  it("removes a color=url(#id) attribute (invalid on color, breaks recoloring)", () => {
    const result = stripSvgColors('<path color="url(#grad)" fill="currentColor" d="M0 0"/>');
    expect(result).not.toContain("color=");
    expect(result).toContain('fill="currentColor"');
  });

  it("removes a color attribute carrying !important unless it is currentColor", () => {
    const result = stripSvgColors(
      '<path color="transparent !important" fill="currentColor" d="M0 0"/>',
    );
    expect(result).not.toContain("color=");
  });

  it("rewrites an inline color: declaration to currentColor", () => {
    const result = stripSvgColors('<path style="color:#ff0000;opacity:.5" fill="currentColor"/>');
    expect(result).not.toContain("#ff0000");
    expect(result).toContain("color:currentColor");
    expect(result).toContain("opacity");
  });

  it("extracts the inner content when the sanitized wrapper matches the regex", () => {
    // Real browsers/jsdom emit `<svg ...>INNER</svg>`; pin that shape so the extraction branch
    // runs deterministically (happy-dom formats its output so the regex would otherwise miss).
    const spy = vi
      .spyOn(DOMPurify, "sanitize")
      .mockReturnValue(
        '<svg xmlns="http://www.w3.org/2000/svg"><path fill="#f00" d="M0 0"/></svg>',
      );
    try {
      const result = stripSvgColors('<path fill="#f00" d="M0 0"/>');
      expect(result).toContain('fill="currentColor"');
      expect(result).not.toContain("<svg");
    } finally {
      spy.mockRestore();
    }
  });

  it("returns sanitized DOMPurify output (not raw) when the wrapper regex misses", () => {
    // Security fallback: a regex miss must not re-emit raw input (would reintroduce stripped XSS).
    const spy = vi.spyOn(DOMPurify, "sanitize").mockReturnValue("<circle r='1'/>");
    try {
      const result = stripSvgColors('<script>alert(1)</script><circle r="1"/>');
      expect(result).not.toContain("script");
      expect(result).toContain("circle");
    } finally {
      spy.mockRestore();
    }
  });

  it("returns the sanitized string unchanged when the parsed <svg> is missing", () => {
    const spy = vi.spyOn(HTMLDivElement.prototype, "querySelector").mockReturnValue(null);
    try {
      expect(stripSvgColors('<path fill="#f00" d="M0 0"/>')).toContain("path");
    } finally {
      spy.mockRestore();
    }
  });

  it("preserves gradient url() paint references (fill and stroke attributes)", () => {
    const result = stripSvgColors('<path fill="url(#grad)" stroke="url(#grad2)" d="M0 0"/>');
    expect(result).toContain('fill="url(#grad)"');
    expect(result).toContain('stroke="url(#grad2)"');
    expect(result).not.toContain("currentColor");
  });

  it("preserves gradient url() paint in the style attribute", () => {
    const result = stripSvgColors('<path style="fill:url(#grad);opacity:0.5" d="M0 0"/>');
    expect(result).toContain("url(#grad)");
    expect(result).toContain("opacity");
  });

  it("preserves gradient url() stroke paint in the style attribute", () => {
    const result = stripSvgColors('<path style="stroke:url(#grad);opacity:0.5" d="M0 0"/>');
    expect(result).toContain("url(#grad)");
    expect(result).toContain("opacity");
  });

  it("removes XSS vectors via sanitization", () => {
    const result = stripSvgColors('<script>alert(1)</script><path d="M0 0"/>');
    expect(result).not.toContain("<script>");
    expect(result).not.toContain("alert");
  });

  it("strips <image> so a remote href can't leak the visitor's IP", () => {
    const result = stripSvgColors('<image href="https://evil.example/pixel.gif"/><path d="M0 0"/>');
    expect(result).not.toContain("<image");
    expect(result).not.toContain("evil.example");
    expect(result).toContain("path");
  });

  it("neutralizes a remote url() paint (parity with sanitizeSvg) but keeps local url(#id)", () => {
    const result = stripSvgColors(
      '<path fill="url(https://evil.example/track.svg#x)" stroke="url(#grad)" d="M0 0"/>',
    );
    expect(result).not.toContain("evil.example");
    expect(result).toContain("url(#grad)");
  });

  it("leaves paint inside a <mask> as authored so luminance masks don't collapse", () => {
    // Regression: a mask child's fill value IS its luminance (white=visible). Rewriting it to a
    // single currentColor collapsed that, blanking masked/duotone/knockout icons. The mask body
    // must keep fill="white"; only the masked artwork outside the mask gets recolored.
    const result = stripSvgColors(
      '<mask id="m"><rect fill="#ffffff" width="24" height="24"/></mask>' +
        '<path fill="#ff0000" mask="url(#m)" d="M0 0h24v24H0z"/>',
    );
    expect(result).toContain('fill="#ffffff"');
    expect(result).not.toContain("#ff0000");
    expect(result).toContain('fill="currentColor"');
  });

  it("leaves paint inside a <pattern> as authored so multi-color tiles don't collapse", () => {
    // Regression: a pattern's child shapes ARE the tile's own colors. Rewriting every one to a
    // single currentColor collapsed a multi-color pattern to one solid theme color. The tile
    // shapes must keep their authored fills; only the fill=url(#p) reference is preserved too.
    const result = stripSvgColors(
      '<pattern id="p"><rect fill="#ff0000" width="4" height="4"/>' +
        '<rect fill="#0000ff" x="4" width="4" height="4"/></pattern>' +
        '<rect fill="url(#p)" width="24" height="24"/>',
    );
    expect(result).toContain('fill="#ff0000"');
    expect(result).toContain('fill="#0000ff"');
    expect(result).toContain('fill="url(#p)"');
    expect(result).not.toContain('fill="currentColor"');
  });

  // Note: <style> is now kept by the sanitizer (parity with the widened server allowlist), and
  // stripSvgColors only normalizes fill/stroke attributes + inline style="" - never a <style> body.
  // The "<style> is kept" behavior is covered in fetchSvgContent.test.ts against sanitizeSvg's
  // regex path; it can't be re-asserted here because happy-dom mis-parses <style> inside <svg> set
  // via innerHTML (it drops the element's body and siblings), which stripSvgColors' DOM round-trip
  // relies on. A real browser parses it correctly, so this is a test-environment limitation only.
});

describe("svgHasNormalizableColors", () => {
  it("returns true for a literal fill color", () => {
    expect(svgHasNormalizableColors('<path fill="#FF0000" d="M0 0h1"/>')).toBe(true);
  });

  it("returns true for a literal stroke color", () => {
    expect(svgHasNormalizableColors('<path stroke="red" d="M0 0h1"/>')).toBe(true);
  });

  it("returns true for a literal color attribute", () => {
    expect(svgHasNormalizableColors('<path color="blue" fill="currentColor" d="M0 0h1"/>')).toBe(
      true,
    );
  });

  it("returns true for a literal color in an inline style", () => {
    expect(svgHasNormalizableColors('<path style="fill:#0f0" d="M0 0h1"/>')).toBe(true);
  });

  it("returns true for color=transparent/url on a color attribute (would be removed)", () => {
    // Mirrors stripSvgColors: `color` keeps only currentColor, so a transparent/url color IS a
    // normalizable change (removing it), unlike the same values on fill/stroke.
    expect(
      svgHasNormalizableColors('<path color="transparent" fill="currentColor" d="M0 0h1"/>'),
    ).toBe(true);
    expect(svgHasNormalizableColors('<path color="url(#g)" fill="currentColor" d="M0 0h1"/>')).toBe(
      true,
    );
  });

  it("returns false for content that is already all currentColor", () => {
    expect(svgHasNormalizableColors('<path fill="currentColor" d="M0 0h1"/>')).toBe(false);
  });

  it("returns false when there is no fill/stroke/color at all", () => {
    expect(svgHasNormalizableColors('<path d="M0 0h1"/>')).toBe(false);
  });

  it("returns false for keepPaint values (none/transparent/url)", () => {
    expect(svgHasNormalizableColors('<path fill="none" stroke="transparent" d="M0 0h1"/>')).toBe(
      false,
    );
    expect(svgHasNormalizableColors('<path fill="url(#g)" d="M0 0h1"/>')).toBe(false);
  });

  it("ignores colors inside <mask>/<pattern> children (parity with stripSvgColors)", () => {
    expect(svgHasNormalizableColors('<mask id="m"><rect fill="#fff" x="0" y="0"/></mask>')).toBe(
      false,
    );
    expect(
      svgHasNormalizableColors('<pattern id="p"><rect fill="#f00" x="0" y="0"/></pattern>'),
    ).toBe(false);
  });

  // Note: <style>-body detection is delegated to styleBlocksHaveNormalizableColors (tested directly
  // below). It can't be re-asserted through svgHasNormalizableColors here because the test env's
  // DOMPurify drops <style> entirely from sanitizeSvg's output (returns ""), the same
  // <style>-in-<svg> test-env limitation noted in the stripSvgColors block above. A real browser
  // keeps <style>, so the class-coloured path works in production.

  it("returns false for empty markup", () => {
    expect(svgHasNormalizableColors("")).toBe(false);
  });
});

describe("styleBlocksHaveNormalizableColors", () => {
  it("returns true for a hardcoded fill/stroke/color inside a <style> body", () => {
    // Regression: an Illustrator/Inkscape "internal CSS" export paints via class rules, so its
    // Icon color control must not be locked/dead - the color IS normalizable.
    expect(styleBlocksHaveNormalizableColors("<style>.a{fill:#f00}</style>")).toBe(true);
    expect(styleBlocksHaveNormalizableColors("<style>.a{stroke:red}</style>")).toBe(true);
    expect(styleBlocksHaveNormalizableColors("<style>.a{color:#00f}</style>")).toBe(true);
  });

  it("returns false when the <style> body only has keepPaint/currentColor values", () => {
    expect(
      styleBlocksHaveNormalizableColors(
        "<style>.a{fill:currentColor;stroke:none;stop-color:#123}</style>",
      ),
    ).toBe(false);
  });

  it("returns false when there is no <style> block", () => {
    expect(styleBlocksHaveNormalizableColors('<path fill="#f00" d="M0 0"/>')).toBe(false);
  });

  it("scans past a clean <style> block to find a dirty later one (loop continuation)", () => {
    // A first all-currentColor block must not short-circuit the loop and miss a later hardcoded color.
    expect(
      styleBlocksHaveNormalizableColors(
        "<style>.a{fill:currentColor}</style><style>.b{fill:#f00}</style>",
      ),
    ).toBe(true);
  });

  it("returns false when a mask/pattern is present (style normalization is skipped there)", () => {
    // Parity with normalizeStyleBlocks' mask/pattern skip: <style> colors are left as-authored to
    // preserve multi-color pattern tiles / mask luminance, so they are not "normalizable" here.
    expect(
      styleBlocksHaveNormalizableColors(
        '<style>.a{fill:#f00}</style><pattern id="p"><rect class="a"/></pattern>',
      ),
    ).toBe(false);
    expect(
      styleBlocksHaveNormalizableColors(
        '<style>.a{fill:#f00}</style><mask id="m"><rect class="a"/></mask>',
      ),
    ).toBe(false);
  });
});

describe("normalizeStyleBlocks", () => {
  it("rewrites a hardcoded fill inside a <style> body to currentColor", () => {
    expect(normalizeStyleBlocks("<style>.a{fill:#f00}</style>")).toBe(
      "<style>.a{fill:currentColor}</style>",
    );
  });

  it("rewrites stroke and color declarations too, across multiple rules", () => {
    expect(normalizeStyleBlocks("<style>.a{stroke:#00f}.b{color:red}</style>")).toBe(
      "<style>.a{stroke:currentColor}.b{color:currentColor}</style>",
    );
  });

  it("leaves keepPaint values (none/transparent/url/currentColor) and gradient stop-color untouched", () => {
    const css = "<style>.a{fill:none}.b{stroke:url(#g)}.c{stop-color:#123}</style>";
    expect(normalizeStyleBlocks(css)).toBe(css);
  });

  it("preserves the <style> open tag attributes and handles multiple <style> blocks", () => {
    expect(
      normalizeStyleBlocks(
        '<style type="text/css">.a{fill:#f00}</style><g/><style>.b{fill:#0f0}</style>',
      ),
    ).toBe(
      '<style type="text/css">.a{fill:currentColor}</style><g/><style>.b{fill:currentColor}</style>',
    );
  });

  it("is a no-op for markup with no <style> block", () => {
    const markup = '<path fill="#f00" d="M0 0"/>';
    expect(normalizeStyleBlocks(markup)).toBe(markup);
  });

  it("leaves <style> colors untouched when the icon has a mask or pattern", () => {
    // Global <style> rules can't be scoped away from mask/pattern descendants by a string pass, so
    // to preserve multi-color pattern tiles / mask luminance we skip normalization when either exists.
    const pat =
      '<style>.a{fill:#f00}.b{fill:#00f}</style><pattern id="p"><rect class="a"/><rect class="b"/></pattern>';
    expect(normalizeStyleBlocks(pat)).toBe(pat);
    const mask = '<style>.a{fill:#fff}</style><mask id="m"><rect class="a"/></mask>';
    expect(normalizeStyleBlocks(mask)).toBe(mask);
  });
});

describe("applyColorNormalization", () => {
  it("recolors to currentColor when normalize is true", () => {
    const result = applyColorNormalization('<path fill="#ff0000" d="M0 0"/>', true);
    expect(result).toContain('fill="currentColor"');
    expect(result).not.toContain("#ff0000");
  });

  it("returns the content unchanged when normalize is false", () => {
    const input = '<path fill="#ff0000" d="M0 0"/>';
    expect(applyColorNormalization(input, false)).toBe(input);
  });
});

describe("neutralizeCssColors", () => {
  it("rewrites a hardcoded fill color to currentColor", () => {
    expect(neutralizeCssColors(".a{fill:#e00}")).toBe(".a{fill:currentColor}");
  });

  it("rewrites a hardcoded stroke color to currentColor", () => {
    expect(neutralizeCssColors(".a{stroke:#00f}")).toBe(".a{stroke:currentColor}");
  });

  it("rewrites both fill and stroke across multiple rules", () => {
    expect(neutralizeCssColors(".a{fill:red}.b{stroke:blue}")).toBe(
      ".a{fill:currentColor}.b{stroke:currentColor}",
    );
  });

  it("rewrites a color declaration terminated by a semicolon, keeping later declarations", () => {
    expect(neutralizeCssColors(".a{fill:#e00;opacity:.5}")).toBe(
      ".a{fill:currentColor;opacity:.5}",
    );
  });

  it("preserves fill:none", () => {
    expect(neutralizeCssColors(".a{fill:none}")).toBe(".a{fill:none}");
  });

  it("preserves url() paint (gradients/patterns)", () => {
    expect(neutralizeCssColors(".a{fill:url(#grad);stroke:url(#g2)}")).toBe(
      ".a{fill:url(#grad);stroke:url(#g2)}",
    );
  });

  it("preserves transparent and zero-alpha fills (finding 4)", () => {
    // These render invisible; rewriting them to currentColor paints a solid block.
    expect(neutralizeCssColors(".a{fill:transparent}")).toBe(".a{fill:transparent}");
    expect(neutralizeCssColors(".a{fill:rgba(0,0,0,0)}")).toBe(".a{fill:rgba(0,0,0,0)}");
    expect(neutralizeCssColors(".a{fill:#ff000000}")).toBe(".a{fill:#ff000000}");
    expect(neutralizeCssColors(".a{stroke:transparent}")).toBe(".a{stroke:transparent}");
  });

  it("preserves color keywords case-insensitively (finding 5)", () => {
    expect(neutralizeCssColors(".a{fill:NONE}")).toBe(".a{fill:NONE}");
    expect(neutralizeCssColors(".a{fill:Transparent}")).toBe(".a{fill:Transparent}");
  });

  it("preserves a trailing !important when rewriting to currentColor", () => {
    // Dropping !important would let a competing theme/page fill rule win over the block color
    // control; the url() branch already retains it, so the currentColor branch must too.
    expect(neutralizeCssColors(".a{fill:#e00 !important}")).toBe(
      ".a{fill:currentColor !important}",
    );
    expect(neutralizeCssColors(".a{stroke:#00f !important}")).toBe(
      ".a{stroke:currentColor !important}",
    );
    // Whitespace between ! and important is valid CSS.
    expect(neutralizeCssColors(".a{fill:red ! important}")).toBe(
      ".a{fill:currentColor !important}",
    );
    // Preserved-paint values keep their own !important untouched (whole match retained).
    expect(neutralizeCssColors(".a{fill:url(#g) !important}")).toBe(".a{fill:url(#g) !important}");
  });

  it("does not recolor no-paint values that carry !important", () => {
    // Regression: the value capture includes the trailing !important, so keepPaint saw
    // "none !important" (not "none") and rewrote a deliberately unfilled shape to a solid blob.
    expect(neutralizeCssColors(".a{fill:none !important}")).toBe(".a{fill:none !important}");
    expect(neutralizeCssColors(".a{stroke:transparent !important}")).toBe(
      ".a{stroke:transparent !important}",
    );
    expect(neutralizeCssColors(".a{fill:rgba(0,0,0,0) !important}")).toBe(
      ".a{fill:rgba(0,0,0,0) !important}",
    );
    // Whitespace variant of !important on a no-paint value is also preserved.
    expect(neutralizeCssColors(".a{fill:none ! important}")).toBe(".a{fill:none ! important}");
  });

  it("rewrites a hardcoded color declaration to currentColor", () => {
    // `color` sets what currentColor resolves to, so a hardcoded color defeats the block color
    // control on a fill=currentColor icon just like a hardcoded fill would.
    expect(neutralizeCssColors(".a{color:#e00}")).toBe(".a{color:currentColor}");
    expect(neutralizeCssColors(".a{color:red;opacity:.5}")).toBe(
      ".a{color:currentColor;opacity:.5}",
    );
  });

  it("does not rewrite stop-color / flood-color (gradient/filter colors survive)", () => {
    // The leading boundary keeps `-color` suffixed props out; recoloring a gradient stop to
    // currentColor would flatten gradients to a single tone.
    expect(neutralizeCssColors(".a{stop-color:#e00}")).toBe(".a{stop-color:#e00}");
    expect(neutralizeCssColors(".a{flood-color:#00f}")).toBe(".a{flood-color:#00f}");
  });

  it("keeps color:currentColor untouched", () => {
    expect(neutralizeCssColors(".a{color:currentColor}")).toBe(".a{color:currentColor}");
    expect(neutralizeCssColors(".a{color:CurrentColor !important}")).toBe(
      ".a{color:CurrentColor !important}",
    );
  });

  it("rewrites a no-paint color (transparent / zero-alpha) to currentColor, unlike fill/stroke", () => {
    // The `color` prop is NOT paint: it is the source currentColor resolves to. A no-paint `color`
    // (unlike a no-paint fill/stroke, which keepPaint preserves) would make a fill=currentColor icon
    // invisible AND un-recolorable, since an element's own inline color beats the inherited block
    // color. So the `color` branch mirrors the color ATTRIBUTE path (isCurrentColorAttr) and rewrites
    // everything but currentColor -> currentColor (== inherit), letting the block color drive it.
    expect(neutralizeCssColors(".a{color:transparent}")).toBe(".a{color:currentColor}");
    expect(neutralizeCssColors(".a{color:rgba(0,0,0,0)}")).toBe(".a{color:currentColor}");
    expect(neutralizeCssColors(".a{color:none !important}")).toBe(
      ".a{color:currentColor !important}",
    );
  });

  it("preserves a trailing !important when rewriting color", () => {
    expect(neutralizeCssColors(".a{color:#e00 !important}")).toBe(
      ".a{color:currentColor !important}",
    );
  });

  it("returns an empty string unchanged", () => {
    expect(neutralizeCssColors("")).toBe("");
  });

  it("leaves CSS with no fill/stroke declarations unchanged", () => {
    expect(neutralizeCssColors(".a{opacity:.5}")).toBe(".a{opacity:.5}");
  });

  it("does not run across `{` from a selector ending in fill/stroke into its body", () => {
    // Regression (finding 4): [^;}] omitted `{`, so a match starting at `stroke:`/`fill:` in a
    // selector like `.icon-fill:hover{...}` ate across the brace and destroyed the rule.
    expect(neutralizeCssColors(".icon-fill:hover{opacity:.5}")).toBe(
      ".icon-fill:hover{opacity:.5}",
    );
    expect(neutralizeCssColors(".stroke:hover{fill:red}")).toBe(".stroke:hover{fill:currentColor}");
  });

  it("does not clobber a hyphen/word-prefixed custom property ending in fill/stroke", () => {
    // Regression: fill/stroke lacked the leading (^|[^-\w]) boundary that color has, so a custom
    // property like `--accent-fill`/`--my-stroke` matched as a substring and its non-color value
    // was rewritten to currentColor.
    expect(neutralizeCssColors(".a{--accent-fill:4px}")).toBe(".a{--accent-fill:4px}");
    expect(neutralizeCssColors(".a{--my-stroke:2px}")).toBe(".a{--my-stroke:2px}");
    // A real fill/stroke declaration alongside the custom prop is still normalized.
    expect(neutralizeCssColors(".a{--accent-fill:4px;fill:red}")).toBe(
      ".a{--accent-fill:4px;fill:currentColor}",
    );
  });
});

describe("isNoPaint", () => {
  it("is true for no-paint keywords (case-insensitive)", () => {
    for (const v of ["none", "NONE", "transparent", "Transparent", "  none  "]) {
      expect(isNoPaint(v)).toBe(true);
    }
  });

  it("is true for zero-alpha colors (hex / comma rgba / slash syntax)", () => {
    for (const v of ["#0000", "#ff000000", "rgba(0,0,0,0)", "hsla(0,0%,0%,0)", "rgb(0 0 0 / 0)"]) {
      expect(isNoPaint(v)).toBe(true);
    }
  });

  it("is true for CSS Color 4 comma alpha 0 on the un-suffixed name (rgb/hsl, no 'a')", () => {
    // rgb(r,g,b,0)/hsl(h,s%,l%,0) are valid CSS Color 4 and render fully transparent; without the
    // 4-component comma match they'd be recolored to a solid currentColor block.
    for (const v of ["rgb(255,0,0,0)", "hsl(0,0%,0%,0)", "rgb(255, 0, 0, 0.0)"]) {
      expect(isNoPaint(v)).toBe(true);
    }
  });

  it("is false for currentColor and url() refs (those DO paint)", () => {
    // The distinction from keepPaint: these paint, so stroke detection/padding must count them.
    expect(isNoPaint("currentColor")).toBe(false);
    expect(isNoPaint("url(#grad)")).toBe(false);
  });

  it("is false for visible colors", () => {
    // rgb(0,0,0) is a 3-arg opaque black (only 2 commas): it DOES paint and must not be treated
    // as no-paint by the 4-component comma-alpha match.
    for (const v of [
      "#e00",
      "red",
      "rgb(1,2,3)",
      "rgb(0,0,0)",
      "hsl(0,0%,0%)",
      "rgba(0,0,0,0.5)",
    ]) {
      expect(isNoPaint(v)).toBe(false);
    }
  });

  it("ignores a trailing !important on no-paint values", () => {
    for (const v of ["none !important", "transparent !important", "#0000 !important"]) {
      expect(isNoPaint(v)).toBe(true);
    }
    // A visible color with !important is still a real paint.
    expect(isNoPaint("#e00 !important")).toBe(false);
  });
});

describe("keepPaint", () => {
  it("keeps no-paint keywords (case-insensitive)", () => {
    for (const v of [
      "none",
      "NONE",
      "transparent",
      "Transparent",
      "currentColor",
      "CURRENTCOLOR",
    ]) {
      expect(keepPaint(v)).toBe(true);
    }
  });

  it("keeps url() paint refs", () => {
    expect(keepPaint("url(#grad)")).toBe(true);
    expect(keepPaint("  URL(#g)  ")).toBe(true);
  });

  it("keeps zero-alpha hex colors (#RGBA / #RRGGBBAA)", () => {
    expect(keepPaint("#0000")).toBe(true);
    expect(keepPaint("#ff000000")).toBe(true);
  });

  it("keeps zero-alpha rgba()/hsla() colors", () => {
    expect(keepPaint("rgba(255,255,255,0)")).toBe(true);
    expect(keepPaint("rgba(0, 0, 0, 0.0)")).toBe(true);
    expect(keepPaint("hsla(0,0%,0%,0)")).toBe(true);
  });

  it("keeps CSS Color 4 slash-syntax zero-alpha colors", () => {
    // rgb(0 0 0 / 0) is invisible; without the slash branch it would be recolored to a
    // solid currentColor block over the artwork.
    expect(keepPaint("rgb(0 0 0 / 0)")).toBe(true);
    expect(keepPaint("rgba(0 0 0 / 0)")).toBe(true);
    expect(keepPaint("hsl(0 0% 0% / 0)")).toBe(true);
    expect(keepPaint("rgb(0 0 0 / 0%)")).toBe(true);
  });

  it("does not keep slash-syntax colors with non-zero alpha", () => {
    expect(keepPaint("rgb(0 0 0 / 0.5)")).toBe(false);
    expect(keepPaint("rgb(0 0 0 / 50%)")).toBe(false);
    expect(keepPaint("rgb(0 0 0 / 1)")).toBe(false);
  });

  it("does not keep visible colors (they get recolored)", () => {
    for (const v of ["#e00", "#ff0000", "red", "rgb(1,2,3)", "rgba(0,0,0,0.5)", "#ff0000ff"]) {
      expect(keepPaint(v)).toBe(false);
    }
  });
});

describe("svgHasStrokes", () => {
  it("returns true when a non-none stroke attribute is present", () => {
    expect(svgHasStrokes('<path stroke="currentColor" d="M0 0"/>')).toBe(true);
  });

  it("does not treat an attribute ending in 'stroke' (e.g. data-stroke) as real stroke paint", () => {
    // Regression (finding 7): \b matched inside `data-stroke=`, so a no-stroke icon reported a
    // stroke and got over-padded in measureSvgContentBox.
    expect(svgHasStrokes('<path data-stroke="#000" d="M0 0"/>')).toBe(false);
  });

  it("does not treat 'stroke:' inside another attribute's value (data-note) as real stroke paint", () => {
    // Regression: the [^-\w] boundary was satisfied by the opening quote, so `stroke:` buried in an
    // unrelated attribute value matched. Real strokes live in the stroke attribute or a style="".
    expect(svgHasStrokes('<rect width="10" height="10" data-note="stroke:red"/>')).toBe(false);
  });

  it("returns false when no stroke attribute exists", () => {
    expect(svgHasStrokes('<path fill="currentColor" d="M0 0"/>')).toBe(false);
  });

  it('returns false when stroke is "none"', () => {
    expect(svgHasStrokes('<path stroke="none" d="M0 0"/>')).toBe(false);
  });

  it("returns true when stroke is declared via inline style (parity with maxStrokeWidth)", () => {
    expect(svgHasStrokes('<rect style="stroke:#000;stroke-width:8" d="M0 0"/>')).toBe(true);
  });

  it('returns false when the only stroke in style is "none"', () => {
    expect(svgHasStrokes('<path style="stroke: none" d="M0 0"/>')).toBe(false);
  });

  it("does not treat stroke-width alone as a stroke", () => {
    expect(svgHasStrokes('<path stroke-width="8" d="M0 0"/>')).toBe(false);
  });

  it("does not treat a transparent or zero-alpha stroke as real stroke paint", () => {
    // Regression: a stroke="transparent"/zero-alpha value paints nothing, so it must not report a
    // stroke and over-pad the frame in measureSvgContentBox.
    expect(svgHasStrokes('<circle stroke="transparent" stroke-width="10"/>')).toBe(false);
    expect(svgHasStrokes('<path style="stroke:rgba(0,0,0,0);stroke-width:4"/>')).toBe(false);
  });

  it("does not treat the literal text 'stroke:' inside <text> content as a real stroke", () => {
    // Regression: a flat whole-string scan matched "stroke:" in visible <text> content, so a
    // stroke-less icon reported a stroke and got a dead stroke-width control / over-padded frame.
    // Scanning per opening tag (parity with maxStrokeWidth) ignores text between tags.
    expect(svgHasStrokes("<text>Draw a stroke: here</text>")).toBe(false);
  });

  it("ignores a stroke declared only in a <style> CSS body (parity with maxStrokeWidth)", () => {
    // maxStrokeWidth reads attributes/inline styles only, not CSS-class rules; svgHasStrokes must
    // match that scope so the two never disagree (a class stroke would report width 1 / pad 0.5).
    expect(svgHasStrokes('<style>.a{stroke:#000}</style><path class="a" d="M0 0"/>')).toBe(false);
  });

  it("ignores strokes inside a <pattern>/<mask> subtree (not part of the outer artwork)", () => {
    // Regression: a stroke only inside a paint-server tile/luminance subtree does not contribute to
    // the outer artwork's bounding box, so it must not report a stroke (which would over-pad the
    // frame) - parity with the mask/pattern skip stripSvgColors already does.
    expect(
      svgHasStrokes(
        '<rect fill="url(#p)"/><pattern id="p"><path stroke="#000" d="M0 0"/></pattern>',
      ),
    ).toBe(false);
    expect(
      svgHasStrokes('<rect mask="url(#m)"/><mask id="m"><path stroke="#000" d="M0 0"/></mask>'),
    ).toBe(false);
  });
});

describe("maxStrokeWidth", () => {
  it("reads a stroke-width attribute", () => {
    expect(maxStrokeWidth('<path stroke-width="6" d="M0 0"/>')).toBe(6);
  });

  it("reads a stroke-width from an inline style", () => {
    expect(maxStrokeWidth('<path style="stroke-width: 4.5" d="M0 0"/>')).toBe(4.5);
  });

  it("returns the widest across multiple declarations", () => {
    expect(maxStrokeWidth('<path stroke-width="2"/><path style="stroke-width:8"/>')).toBe(8);
  });

  it("defaults to the SVG default of 1 when no stroke-width is declared", () => {
    expect(maxStrokeWidth('<path stroke="#000" d="M0 0"/>')).toBe(1);
  });

  it("reads a leading-dot decimal stroke-width (.5) instead of defaulting to 1", () => {
    expect(maxStrokeWidth('<path stroke-width=".5" d="M0 0"/>')).toBe(0.5);
  });

  it("ignores a stroke-width on an element that paints no stroke (stroke='none')", () => {
    // Regression: a wide stroke-width on a stroke="none" element inflated the frame padding even
    // though it paints nothing; only the real painting stroke (width 1) should count.
    expect(
      maxStrokeWidth(
        '<path stroke="none" stroke-width="40"/><path stroke="#000" stroke-width="1"/>',
      ),
    ).toBe(1);
  });

  it("ignores the width of a transparent-stroke element in an inline style", () => {
    expect(
      maxStrokeWidth(
        '<rect style="stroke:transparent;stroke-width:30"/><path stroke="#000" stroke-width="2"/>',
      ),
    ).toBe(2);
  });

  it("still counts a stroke-width on an element with no stroke attr (may inherit from an ancestor)", () => {
    expect(maxStrokeWidth('<g stroke="#000"><path stroke-width="6" d="M0 0"/></g>')).toBe(6);
  });

  it("ignores a stroke-width inside a <pattern>/<mask> subtree so the frame is not over-padded", () => {
    // Regression: a wide stroke inside a paint-server tile inflated the outer frame padding even
    // though it never draws on the artwork; only the real painting stroke (width 2) should count.
    expect(
      maxStrokeWidth(
        '<pattern id="p"><path stroke="#000" stroke-width="40"/></pattern><path stroke="#000" stroke-width="2"/>',
      ),
    ).toBe(2);
  });

  it("does not treat an attribute ending in '-stroke-width' (e.g. data-stroke-width) as a real width", () => {
    // Regression: the width regex lacked the (?:^|[^-\w]) name-boundary guard its siblings use, so
    // `data-stroke-width="1000"` was read as a real stroke-width and over-padded a no-viewBox frame,
    // rendering the icon as a tiny speck. Only the real painting stroke (width 2) should count.
    expect(
      maxStrokeWidth('<path stroke="#000" stroke-width="2" data-stroke-width="1000" d="M0 0h24"/>'),
    ).toBe(2);
  });

  it("does not read a stroke-width buried inside another attribute's value (data-note)", () => {
    // Parity with svgHasStrokes: a `stroke-width:` inside an unrelated attribute value must not be
    // read as a real width. Only the genuine painting stroke (width 2) counts.
    expect(
      maxStrokeWidth('<path stroke="#000" stroke-width="2" data-note="stroke-width:99" d="M0 0"/>'),
    ).toBe(2);
  });
});

describe("getUnsupportedSvgReason", () => {
  it("rejects an SVG containing an <image> tag", () => {
    const reason = getUnsupportedSvgReason(
      '<image width="208" height="208" xlink:href="data:image/png;base64,AAAA"/>',
      "",
    );
    expect(reason).toContain("embedded image");
  });

  it("rejects a base64 PNG wrapped in a pattern (the blank-box case)", () => {
    const raw =
      '<defs><pattern id="p"><use xlink:href="#i"/></pattern><image id="i" xlink:href="data:image/png;base64,iVBOR"/></defs>';
    expect(getUnsupportedSvgReason(raw, "<defs></defs>")).toContain("embedded image");
  });

  it("rejects a jpeg data URI", () => {
    expect(getUnsupportedSvgReason("data:image/jpeg;base64,/9j/", "x")).toContain("embedded image");
  });

  it("rejects an SVG with no usable vector content after sanitization", () => {
    const reason = getUnsupportedSvgReason("<title>icon</title>", "");
    expect(reason).toContain("no usable vector content");
  });

  it("accepts a real vector path SVG", () => {
    expect(
      getUnsupportedSvgReason('<path d="M0 0h24v24H0z"/>', '<path d="M0 0h24v24H0z"/>'),
    ).toBeNull();
  });

  it("does not reject a vector SVG that only MENTIONS data:image/png in a <desc>/<title>/comment", () => {
    // Bug fix: EMBEDDED_RASTER used to run over the whole raw string, so a raster keyword in
    // human-readable metadata false-rejected an otherwise-vector icon. Prose is stripped first.
    const inner = '<path d="M0 0h24v24H0z"/>';
    expect(
      getUnsupportedSvgReason(
        `<desc>exported from data:image/png historically</desc>${inner}`,
        inner,
      ),
    ).toBeNull();
    // A literal "<image" inside a comment must not trip the <image[\s/>] branch.
    expect(
      getUnsupportedSvgReason(`<!-- once had an <image href="x"> here -->${inner}`, inner),
    ).toBeNull();
    expect(
      getUnsupportedSvgReason(`<metadata>data:image/gif reference</metadata>${inner}`, inner),
    ).toBeNull();
    // Rendered <text>/<tspan> is free text too: a legit label containing the literal "data:image/png"
    // must not false-reject the icon (bug fix: <text> bodies are now stripped before the scan).
    expect(
      getUnsupportedSvgReason(
        `<text x="0" y="10">data:image/png</text>${inner}`,
        `<text x="0" y="10">data:image/png</text>${inner}`,
      ),
    ).toBeNull();
  });

  it("still rejects a real embedded raster even when prose also mentions it", () => {
    // The <image> element / data: attribute lives outside stripped prose, so detection survives.
    const raw = '<desc>an icon</desc><image xlink:href="data:image/png;base64,AAAA"/>';
    expect(getUnsupportedSvgReason(raw, "")).toContain("embedded image");
  });
});

describe("measureSvgContentBox", () => {
  const proto = window.SVGGraphicsElement.prototype as unknown as {
    getBBox?: () => { x: number; y: number; width: number; height: number };
  };

  afterEach(() => {
    delete proto.getBBox;
  });

  it("returns null when getBBox is unavailable (jsdom/happy-dom)", () => {
    expect(measureSvgContentBox('<path d="M0 0h1"/>')).toBeNull();
  });

  it("returns null when there is no DOM (SSR: document undefined)", () => {
    vi.stubGlobal("document", undefined);
    try {
      expect(measureSvgContentBox('<path d="M0 0h1"/>')).toBeNull();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("returns null when the <g> wrapper cannot be found", () => {
    const spy = vi.spyOn(HTMLDivElement.prototype, "querySelector").mockReturnValue(null);
    try {
      expect(measureSvgContentBox('<path d="M0 0h1"/>')).toBeNull();
    } finally {
      spy.mockRestore();
    }
  });

  it("returns the measured box when getBBox is available", () => {
    proto.getBBox = () => ({ x: 3, y: 4, width: 20, height: 30 });
    expect(measureSvgContentBox('<path d="M0 0h1"/>')).toEqual({
      x: 3,
      y: 4,
      width: 20,
      height: 30,
    });
  });

  it("pads the box by half the widest stroke so strokes aren't clipped", () => {
    proto.getBBox = () => ({ x: 3, y: 4, width: 20, height: 30 });
    // stroke-width 6 -> pad 3 on every side; box grows by 6 in each dimension and shifts origin.
    expect(
      measureSvgContentBox('<circle cx="10" cy="10" r="8" stroke="#000" stroke-width="6"/>'),
    ).toEqual({ x: 0, y: 1, width: 26, height: 36 });
  });

  it("pads by the widest stroke when multiple stroke-widths are present", () => {
    proto.getBBox = () => ({ x: 0, y: 0, width: 20, height: 20 });
    // Widest is 8 (from inline style) -> pad 4.
    expect(
      measureSvgContentBox(
        '<path stroke="#000" stroke-width="2" d="M0 0h1"/><path stroke="#000" style="stroke-width:8" d="M0 0h1"/>',
      ),
    ).toEqual({ x: -4, y: -4, width: 28, height: 28 });
  });

  it("pads a stroked SVG with no explicit stroke-width by the SVG default (1)", () => {
    proto.getBBox = () => ({ x: 0, y: 0, width: 20, height: 20 });
    // Default stroke-width is 1 -> pad 0.5.
    expect(measureSvgContentBox('<path stroke="#000" d="M0 0h1"/>')).toEqual({
      x: -0.5,
      y: -0.5,
      width: 21,
      height: 21,
    });
  });

  it("does not pad when strokes are absent or none", () => {
    proto.getBBox = () => ({ x: 3, y: 4, width: 20, height: 30 });
    // stroke="none" with a stroke-width must not shrink the frame.
    expect(measureSvgContentBox('<path stroke="none" stroke-width="6" d="M0 0h1"/>')).toEqual({
      x: 3,
      y: 4,
      width: 20,
      height: 30,
    });
  });

  it("returns null for an empty (zero-area) box", () => {
    proto.getBBox = () => ({ x: 0, y: 0, width: 0, height: 0 });
    expect(measureSvgContentBox('<path d="M0 0"/>')).toBeNull();
  });

  it("returns null when a dimension is non-finite (NaN/Infinity)", () => {
    proto.getBBox = () => ({ x: 0, y: 0, width: NaN, height: 30 });
    expect(measureSvgContentBox('<path d="M0 0h1"/>')).toBeNull();

    proto.getBBox = () => ({ x: 0, y: 0, width: 20, height: Infinity });
    expect(measureSvgContentBox('<path d="M0 0h1"/>')).toBeNull();
  });

  it("returns null when only one dimension is zero (degenerate line)", () => {
    proto.getBBox = () => ({ x: 0, y: 0, width: 20, height: 0 });
    expect(measureSvgContentBox('<path d="M0 0h1"/>')).toBeNull();
  });

  it("returns null when getBBox throws", () => {
    proto.getBBox = () => {
      throw new Error("not renderable");
    };
    expect(measureSvgContentBox('<path d="M0 0h1"/>')).toBeNull();
  });

  it("does not leave its measuring element attached to the document", () => {
    proto.getBBox = () => ({ x: 0, y: 0, width: 10, height: 10 });
    measureSvgContentBox('<path d="M0 0h1"/>');
    expect(document.body.querySelector("div[style*='visibility:hidden']")).toBeNull();
  });
});

describe("computeSvgFrame", () => {
  // In jsdom getBBox is unavailable, so measureSvgContentBox returns null and only the
  // viewBox / declared-size / default branches run here.
  it("keeps a non-zero viewBox origin (min-x/min-y) so the icon isn't shifted/clipped", () => {
    // Regression: origin was previously discarded (x:0,y:0), shifting "-4 -4 32 32" artwork.
    expect(computeSvgFrame('<svg viewBox="-4 -4 32 32"><path d="M0 0"/></svg>', "")).toEqual({
      x: -4,
      y: -4,
      width: 32,
      height: 32,
    });
  });

  it("keeps a valid viewBox that has trailing/leading whitespace", () => {
    // Regression: split without trim yielded a 5th empty element, failing length===4 and
    // silently discarding the author's viewBox (re-framing the icon).
    expect(computeSvgFrame('<svg viewBox=" 0 0 32 32 "><path d="M0 0"/></svg>', "")).toEqual({
      x: 0,
      y: 0,
      width: 32,
      height: 32,
    });
  });

  it("reads a viewBox with whitespace around the `=` (XML allows it, browsers honor it)", () => {
    // Bug fix: the regex required `=` immediately after `viewBox`, so a spec-valid
    // `viewBox = "..."` was missed, fell through to getBBox, and framed to the artwork bbox
    // instead of the declared canvas - rendering the icon zoomed/mis-scaled.
    expect(computeSvgFrame('<svg viewBox = "-4 -4 32 32"><path d="M0 0"/></svg>', "")).toEqual({
      x: -4,
      y: -4,
      width: 32,
      height: 32,
    });
  });

  it("reads declared width/height with whitespace and uppercase when there is no viewBox", () => {
    // Bug fix: the width/height fallback was case-sensitive and required no space around `=`,
    // so `WIDTH = "10"` was missed and the icon fell back to the 24x24 default.
    expect(computeSvgFrame('<svg WIDTH = "10" HEIGHT = "20"></svg>', "")).toEqual({
      x: 0,
      y: 0,
      width: 10,
      height: 20,
    });
  });

  it("reads a lowercase `viewbox` attribute (browser normalizes it, so we must too)", () => {
    // Bug fix: the viewBox regex was case-sensitive, so a hand-authored/exported lowercase
    // `viewbox` was missed, fell through to getBBox, and framed to the tight artwork bbox instead
    // of the author's canvas - rendering the icon zoomed/mis-scaled.
    expect(computeSvgFrame('<svg viewbox="0 0 512 512"><path d="M0 0"/></svg>', "")).toEqual({
      x: 0,
      y: 0,
      width: 512,
      height: 512,
    });
  });

  it("returns a zero origin for a 0 0 w h viewBox", () => {
    expect(computeSvgFrame('<svg viewBox="0 0 48 48"><path d="M0 0"/></svg>', "")).toEqual({
      x: 0,
      y: 0,
      width: 48,
      height: 48,
    });
  });

  it("falls back to x:0/y:0 when the viewBox origin is non-numeric", () => {
    expect(computeSvgFrame('<svg viewBox="a b 24 24"><path d="M0 0"/></svg>', "")).toEqual({
      x: 0,
      y: 0,
      width: 24,
      height: 24,
    });
  });

  it("ignores a viewBox with non-positive dimensions and uses declared width/height", () => {
    expect(computeSvgFrame('<svg viewBox="0 0 0 0" width="10" height="20"></svg>', "")).toEqual({
      x: 0,
      y: 0,
      width: 10,
      height: 20,
    });
  });

  it("reads declared width/height with a unit suffix when there is no viewBox", () => {
    expect(computeSvgFrame('<svg width="500pt" height="250pt"></svg>', "")).toEqual({
      x: 0,
      y: 0,
      width: 500,
      height: 250,
    });
  });

  it("defaults to 24x24 when neither viewBox nor width/height are usable", () => {
    expect(computeSvgFrame('<svg><path d="M0 0"/></svg>', "")).toEqual({
      x: 0,
      y: 0,
      width: 24,
      height: 24,
    });
  });

  it("ignores a descendant viewBox and frames to the root canvas when the root has none", () => {
    // Regression: viewBox was matched anywhere in the markup, so a nested <pattern>/<symbol>
    // viewBox hijacked the frame. Only the root <svg> opening tag should be read.
    expect(
      computeSvgFrame(
        '<svg width="100" height="100"><defs><pattern id="p" viewBox="0 0 4 4"><rect width="4" height="4"/></pattern></defs><rect width="100" height="100" fill="url(#p)"/></svg>',
        "",
      ),
    ).toEqual({ x: 0, y: 0, width: 100, height: 100 });
  });
});

describe("isSafeUrl", () => {
  it("allows https URLs", () => {
    expect(isSafeUrl("https://example.com")).toBe(true);
  });

  it("allows http URLs", () => {
    expect(isSafeUrl("http://example.com")).toBe(true);
  });

  it("allows relative paths", () => {
    expect(isSafeUrl("/about")).toBe(true);
  });

  it("allows anchor links", () => {
    expect(isSafeUrl("#section")).toBe(true);
  });

  it("allows mailto links", () => {
    expect(isSafeUrl("mailto:hello@example.com")).toBe(true);
  });

  it("rejects javascript: protocol", () => {
    expect(isSafeUrl("javascript:alert(1)")).toBe(false);
  });

  it("rejects protocol-relative URLs, including browser backslash-normalized forms", () => {
    // "//host" resolves to an external origin; browsers normalize "\" to "/" in special-scheme URLs
    // so the backslash variants resolve there too. Rejected client-side to match the server
    // SvgSanitizer::stripProtocolRelativeHref, closing the open-redirect / off-site link surface.
    expect(isSafeUrl("//host.example")).toBe(false);
    expect(isSafeUrl("/\\host.example")).toBe(false);
    expect(isSafeUrl("\\\\host.example")).toBe(false);
    expect(isSafeUrl("\\/host.example")).toBe(false);
  });

  it("still allows single-slash path-relative URLs", () => {
    expect(isSafeUrl("/about")).toBe(true);
  });

  it("rejects empty string", () => {
    expect(isSafeUrl("")).toBe(false);
  });
});
