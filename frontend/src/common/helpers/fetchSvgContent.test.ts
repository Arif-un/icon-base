import DOMPurify from "dompurify";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  fetchSvgContent,
  getSvgCache,
  sanitizePathSegment,
  sanitizeSvg,
  stripImageTags,
  stripRemoteRefs,
  stripUnsupportedTags,
} from "./fetchSvgContent";

beforeEach(() => vi.unstubAllGlobals());
afterEach(() => vi.restoreAllMocks());

describe("sanitizePathSegment", () => {
  it("keeps alphanumerics, dots, dashes and underscores", () => {
    expect(sanitizePathSegment("ant-design_01.svg")).toBe("ant-design_01.svg");
  });

  it("strips path separators and other unsafe characters", () => {
    expect(sanitizePathSegment("a/b c?d")).toBe("abcd");
  });

  it("collapses .. so a traversal segment can't survive", () => {
    // Defense in depth: `/` is already removed, but a leftover `..` (or a `foo/../x` -> `foo..x`
    // once the slash is gone) must not stay a traversal token.
    expect(sanitizePathSegment("..")).toBe(".");
    expect(sanitizePathSegment("../secret")).toBe(".secret");
    expect(sanitizePathSegment("a...b")).toBe("a.b");
    // a single legitimate dot (file extension) is untouched
    expect(sanitizePathSegment("icon.svg")).toBe("icon.svg");
  });
});

describe("stripImageTags", () => {
  it("removes a self-closing <image> tag", () => {
    expect(stripImageTags('<image href="https://evil/x.gif"/><path d="M0 0"/>')).toBe(
      '<path d="M0 0"/>',
    );
  });

  it("removes a paired <image>...</image> element", () => {
    expect(stripImageTags('<image href="x"></image><circle r="1"/>')).toBe('<circle r="1"/>');
  });

  it("leaves markup without <image> untouched", () => {
    expect(stripImageTags('<path d="M0 0"/>')).toBe('<path d="M0 0"/>');
  });
});

describe("stripUnsupportedTags", () => {
  it("removes a self-closing SMIL animation element", () => {
    expect(
      stripUnsupportedTags('<path d="M0 0"><animate attributeName="opacity" values="0;1"/></path>'),
    ).toBe('<path d="M0 0"></path>');
  });

  it("removes animateTransform/animateMotion/set/mpath", () => {
    expect(
      stripUnsupportedTags(
        '<animateTransform type="rotate"/><animateMotion/><set to="1"/><mpath href="#p"/>',
      ),
    ).toBe("");
  });

  it("keeps marker/textPath/switch (static, allowed by both client and server)", () => {
    // These are script-free static elements the server wp_kses allowlist also permits, so they must
    // survive here for parity - stripping them would drop content from already-published icons.
    expect(stripUnsupportedTags('<marker id="a"><path d="M0 0"/></marker>')).toBe(
      '<marker id="a"><path d="M0 0"/></marker>',
    );
    expect(stripUnsupportedTags('<switch><rect width="1" height="1"/></switch>')).toBe(
      '<switch><rect width="1" height="1"/></switch>',
    );
  });

  it("does not match elements whose name merely starts with a listed tag", () => {
    // <animateThing> is not <animate>; the name-terminator lookahead must not let the shorter alt
    // swallow it.
    expect(stripUnsupportedTags('<set-like x="1"/>')).toBe('<set-like x="1"/>');
    expect(stripUnsupportedTags("<setup/>")).toBe("<setup/>");
  });

  it("leaves normal icon markup untouched", () => {
    expect(stripUnsupportedTags('<path d="M0 0"/><circle r="1"/>')).toBe(
      '<path d="M0 0"/><circle r="1"/>',
    );
  });
});

describe("stripRemoteRefs", () => {
  it("removes an @import at-rule", () => {
    expect(stripRemoteRefs("<style>@import url(https://evil/x.css);path{fill:red}</style>")).toBe(
      "<style>path{fill:red}</style>",
    );
  });

  it("rewrites a remote https url() paint to none", () => {
    expect(stripRemoteRefs('<path fill="url(https://evil/track.svg#x)" d="M0 0"/>')).toBe(
      '<path fill="none" d="M0 0"/>',
    );
  });

  it("rewrites a protocol-relative url() to none", () => {
    expect(stripRemoteRefs('<path fill="url(//evil/track.svg)" d="M0 0"/>')).toBe(
      '<path fill="none" d="M0 0"/>',
    );
  });

  it("keeps a local url(#id) gradient/pattern reference", () => {
    expect(stripRemoteRefs('<path fill="url(#grad)" d="M0 0"/>')).toBe(
      '<path fill="url(#grad)" d="M0 0"/>',
    );
  });

  it("removes a remote xlink:href (e.g. feImage that phones home)", () => {
    expect(stripRemoteRefs('<feImage xlink:href="https://evil/pixel.png"></feImage>')).toBe(
      "<feImage></feImage>",
    );
  });

  it("removes a protocol-relative href", () => {
    expect(stripRemoteRefs('<feImage href="//evil/pixel.png"></feImage>')).toBe(
      "<feImage></feImage>",
    );
  });

  it("removes a data: xlink:href (embedded payload phone-home vector)", () => {
    expect(
      stripRemoteRefs('<use xlink:href="data:image/svg+xml;base64,PHN2Zz48L3N2Zz4="></use>'),
    ).toBe("<use></use>");
  });

  it("removes a javascript: href", () => {
    expect(stripRemoteRefs('<use href="javascript:alert(1)"></use>')).toBe("<use></use>");
  });

  it("is not bypassed by leading whitespace before the scheme", () => {
    // The browser trims leading whitespace, so " https://" must still be stripped.
    expect(stripRemoteRefs('<use xlink:href=" https://evil/x"></use>')).toBe("<use></use>");
    expect(stripRemoteRefs('<path fill="url( https://evil/track.svg)" d="M0 0"/>')).toBe(
      '<path fill="none" d="M0 0"/>',
    );
  });

  it("keeps a local href='#id' fragment reference (use/gradient)", () => {
    expect(stripRemoteRefs('<use href="#icon"/>')).toBe('<use href="#icon"/>');
    expect(stripRemoteRefs('<use xlink:href="#icon"/>')).toBe('<use xlink:href="#icon"/>');
  });

  it("leaves markup with no external refs untouched", () => {
    expect(stripRemoteRefs('<path fill="#f00" d="M0 0"/>')).toBe('<path fill="#f00" d="M0 0"/>');
  });

  it("is not bypassed by an HTML-entity-encoded scheme on xlink:href", () => {
    // Bug fix: a literal-scheme match runs on pre-decode markup, so `&#104;ttps://` (which the
    // browser decodes to `https://` and fetches) slipped past. Allowlisting by decoded #ref closes it.
    expect(stripRemoteRefs('<feImage xlink:href="&#104;ttps://evil/pixel.png"></feImage>')).toBe(
      "<feImage></feImage>",
    );
  });

  it("is not bypassed by an HTML-entity-encoded scheme inside url()", () => {
    expect(stripRemoteRefs('<path fill="url(&#104;ttps://evil/track.svg)" d="M0 0"/>')).toBe(
      '<path fill="none" d="M0 0"/>',
    );
  });

  it("drops a relative (non-#) href/url() an icon should never need", () => {
    // Only local #fragment refs are kept now; a relative path is still a potential phone-home.
    expect(stripRemoteRefs('<use xlink:href="sprite.svg#icon"/>')).toBe("<use/>");
    expect(stripRemoteRefs('<path fill="url(sprite.svg)" d="M0 0"/>')).toBe(
      '<path fill="none" d="M0 0"/>',
    );
  });

  it("neutralizes a bare-string remote url in image-set()/image() that has no url() token", () => {
    // Bug fix: image-set()/image() carry the url as a bare string, so the url() strip missed them and
    // the remote resource still phoned home. The whole function call is now neutralized to none.
    expect(
      stripRemoteRefs('<style>.a{background:image-set("https://evil/x.png" 1x)}</style>'),
    ).toBe("<style>.a{background:none}</style>");
    expect(stripRemoteRefs('<rect style="background:image(&#104;ttps://evil/x.png)"/>')).toBe(
      '<rect style="background:none"/>',
    );
    // -webkit- prefix and a nested url() variant collapse to none too.
    expect(
      stripRemoteRefs(
        "<style>.a{background:-webkit-image-set(url(https://evil/x.png) 2x)}</style>",
      ),
    ).toBe("<style>.a{background:none}</style>");
    // A comma-separated list position (after `,`) is also a CSS value context and is neutralized.
    expect(
      stripRemoteRefs('<style>.a{background:url(#g),image("https://evil/x.png")}</style>'),
    ).toBe("<style>.a{background:url(#g),none}</style>");
  });

  it("does not corrupt literal 'image (...)' prose in text content", () => {
    // Regression: the image()/image-set() strip ran over flat markup with no CSS-value boundary, so
    // `image (` in a <desc>/<text> body matched and was replaced with none. The leading [:,(] guard
    // confines the match to a real CSS value position.
    expect(stripRemoteRefs("<desc>This is an image (icon)</desc>")).toBe(
      "<desc>This is an image (icon)</desc>",
    );
    expect(stripRemoteRefs("<text>image (2)</text>")).toBe("<text>image (2)</text>");
  });

  it("is not bypassed by a CSS-escaped url() token in a <style> body", () => {
    // Bug fix: the url() strip matched the literal `url(` token, so a CSS escape hiding it
    // (`\75rl(` where \75 == "u", or `\url(`) survived and the browser reconstituted url() and
    // phoned home. neutralizeCssEscapes drops the backslashes first, so the hidden token is either
    // caught by the url() strip (\url( -> url( -> none) or collapses to inert CSS (\75rl( -> 75rl().
    expect(stripRemoteRefs("<style>.a{background:\\url(https://evil/x.png)}</style>")).toBe(
      "<style>.a{background:none}</style>",
    );
    // `\75rl(` -> `75rl(`: an inert token the browser never fetches. The URL text harmlessly remains,
    // but there is no `url(` (or image()) function wrapping a remote scheme, so nothing phones home.
    expect(stripRemoteRefs("<style>.a{background:\\75rl(https://evil/x.png)}</style>")).not.toMatch(
      /(?:url|image(?:-set)?)\(\s*['"]?https/i,
    );
    // Hex escape with a 6-digit form is defused the same way.
    expect(
      stripRemoteRefs("<style>.a{background:\\000075rl(https://evil/x.png)}</style>"),
    ).not.toMatch(/(?:url|image(?:-set)?)\(\s*['"]?https/i);
  });

  it("is not bypassed by a CSS-escaped url() token in an inline style attribute", () => {
    expect(stripRemoteRefs('<rect style="background:\\url(https://evil/x.png)"/>')).toBe(
      '<rect style="background:none"/>',
    );
    expect(stripRemoteRefs('<rect style="background:\\75rl(https://evil/x.png)"/>')).not.toMatch(
      /url\(\s*['"]?https/i,
    );
  });

  it("keeps a local escaped-but-harmless <style> intact (no phone-home target)", () => {
    // Backslash removal is blanket in CSS contexts; a legit local ref still survives the strips.
    expect(stripRemoteRefs("<style>.a{fill:url(#grad)}</style>")).toBe(
      "<style>.a{fill:url(#grad)}</style>",
    );
  });

  it("neutralizes an UNTERMINATED url( with no closing ')' that consumes to end-of-input", () => {
    // Bug fix: the balanced url() strip requires a ')'. Per the CSS Syntax spec a url-token with no
    // closing paren consumes to end-of-input, so `<style>svg{background:url(//evil` still resolves in
    // the browser and phones home on every page view. The end-of-string url( pass neutralizes it.
    expect(
      stripRemoteRefs("<style>svg{background:url(//evil.example/beacon</style>"),
    ).not.toContain("evil.example");
    // Unquoted, quoted, and http-scheme unterminated variants are all caught.
    expect(stripRemoteRefs("<style>svg{background:url('https://evil.example/x")).not.toContain(
      "evil.example",
    );
  });

  it("does not touch a balanced local url(#id) while stripping an unterminated one", () => {
    // The end-of-string pass matches ONLY when no ')' exists from url( to EOF, so a balanced
    // url(#id) that has its ')' is left intact.
    expect(stripRemoteRefs('<path fill="url(#grad)" d="M0 0"/>')).toBe(
      '<path fill="url(#grad)" d="M0 0"/>',
    );
  });
});

describe("sanitizeSvg", () => {
  it("returns the inner markup of a safe svg fragment", () => {
    const result = sanitizeSvg('<path d="M0 0h24v24H0z"/>');
    expect(result).toContain("path");
    expect(result).toContain("M0 0h24v24H0z");
  });

  it("strips script content", () => {
    const result = sanitizeSvg('<script>alert(1)</script><path d="M0 0"/>');
    expect(result).not.toContain("<script>");
    expect(result).not.toContain("alert");
  });

  it("strips <image> so a remote href can't leak the visitor's IP", () => {
    const result = sanitizeSvg('<image href="https://evil.example/pixel.gif"/><path d="M0 0"/>');
    expect(result).not.toContain("<image");
    expect(result).not.toContain("evil.example");
  });

  it("neutralizes a remote url() paint so it can't leak the visitor's IP", () => {
    const result = sanitizeSvg('<path fill="url(https://evil.example/track.svg#x)" d="M0 0"/>');
    expect(result).not.toContain("evil.example");
  });

  it("strips a remote feImage href so a filter can't leak the visitor's IP", () => {
    const result = sanitizeSvg(
      '<filter id="f"><feImage xlink:href="https://evil.example/pixel.png"/></filter><path filter="url(#f)" d="M0 0"/>',
    );
    expect(result).not.toContain("evil.example");
  });

  // The "keep original colors" path in the custom-SVG modal stores sanitizeSvg output
  // WITHOUT normalizing colors, so this must both preserve colors and strip XSS.
  it("preserves original fill/stroke colors", () => {
    const result = sanitizeSvg('<path fill="#FF0000" stroke="#0000FF" d="M0 0"/>');
    expect(result).toContain('fill="#FF0000"');
    expect(result).toContain('stroke="#0000FF"');
  });

  // Parity with the widened server wp_kses allowlist (which now permits <style> and <filter>/fe*):
  // whatever this sanitizer keeps must also render on the public frontend. happy-dom's DOMPurify
  // returns empty for SVG-embedded <style>/<filter> (a parse quirk it guards as mXSS); a real
  // browser keeps them, so DOMPurify is mocked to emulate the browser and confirm our strip chain
  // does NOT drop them anymore (only remote refs are neutralized).
  it("keeps <style> blocks for parity with the server allowlist", () => {
    const spy = vi
      .spyOn(DOMPurify, "sanitize")
      .mockReturnValue(
        '<svg xmlns="http://www.w3.org/2000/svg"><style>.cls-1{fill:red}</style><path class="cls-1" d="M0 0"></path></svg>',
      );
    try {
      const result = sanitizeSvg('<style>.cls-1{fill:red}</style><path class="cls-1" d="M0 0"/>');
      expect(result).toContain("<style");
      expect(result).toContain("cls-1{fill:red}");
      expect(result).toContain("path");
    } finally {
      spy.mockRestore();
    }
  });

  it("strips a remote @import from a kept <style> block but keeps the rest", () => {
    const spy = vi
      .spyOn(DOMPurify, "sanitize")
      .mockReturnValue(
        '<svg xmlns="http://www.w3.org/2000/svg"><style>@import url(https://evil.example/x.css);.a{fill:red}</style><path class="a" d="M0 0"></path></svg>',
      );
    try {
      const result = sanitizeSvg(
        '<style>@import url(https://evil.example/x.css);.a{fill:red}</style><path class="a" d="M0 0"/>',
      );
      expect(result).not.toContain("evil.example");
      expect(result).toContain(".a{fill:red}");
    } finally {
      spy.mockRestore();
    }
  });

  // Real-world Inkscape export: chained gradients where each <linearGradient> pulls its stops from
  // another via xlink:href="#id", and paints reference them via style="fill:url(#id)". These are all
  // LOCAL fragment refs and must survive (the keep-local branch of stripRemoteRefs), else the icon
  // renders unpainted. Guards against a regression that treats #fragment hrefs/url()s as remote.
  it("keeps chained local gradient refs (xlink:href='#id' + style fill:url(#id))", () => {
    const result = sanitizeSvg(
      "<defs>" +
        '<linearGradient id="base"><stop style="stop-color:#3f2600;stop-opacity:0.6;" offset="0"/></linearGradient>' +
        '<linearGradient xlink:href="#base" id="grad1" x1="0" y1="0" x2="1" y2="1" gradientUnits="objectBoundingBox"/>' +
        '<radialGradient xlink:href="#base" id="rad1"/>' +
        "</defs>" +
        '<path style="fill:url(#grad1);stroke:none" d="M0 0h24v24H0z"/>' +
        '<path style="fill:url(#rad1);stroke:#e68c3f;stroke-width:6.25" d="M1 1"/>',
    );
    // Local fragment hrefs on the chained gradients survive.
    expect(result).toContain('xlink:href="#base"');
    // Local paint refs in style survive (not rewritten to none).
    expect(result).toContain("url(#grad1)");
    expect(result).toContain("url(#rad1)");
    expect(result).toContain("stop-color:#3f2600");
    // No remote leak introduced.
    expect(result).not.toContain("http");
  });

  it("keeps SVG filter elements for parity with the server allowlist", () => {
    const spy = vi
      .spyOn(DOMPurify, "sanitize")
      .mockReturnValue(
        '<svg xmlns="http://www.w3.org/2000/svg"><filter id="b"><feGaussianBlur stdDeviation="2"></feGaussianBlur></filter><path filter="url(#b)" d="M0 0"></path></svg>',
      );
    try {
      const result = sanitizeSvg(
        '<filter id="b"><feGaussianBlur stdDeviation="2"/></filter><path filter="url(#b)" d="M0 0"/>',
      );
      expect(result).toContain("<filter");
      expect(result).toContain("feGaussianBlur");
      expect(result).toContain("path");
    } finally {
      spy.mockRestore();
    }
  });
});

describe("getSvgCache", () => {
  it("returns null for a path that has not been fetched", () => {
    expect(getSvgCache("never/fetched")).toBeNull();
  });
});

describe("fetchSvgContent", () => {
  it("fetches, sanitizes, caches and returns the svg body", async () => {
    const fetchFn = vi.fn(() =>
      Promise.resolve({ ok: true, text: () => Promise.resolve('<path d="M1 1"/>') } as Response),
    );
    vi.stubGlobal("fetch", fetchFn);

    const result = await fetchSvgContent("https://root", "libA", "iconA");

    expect(result).toContain("path");
    expect(fetchFn).toHaveBeenCalledOnce();
    const [url] = fetchFn.mock.calls[0] as unknown as [string];
    expect(url).toBe("https://root/icons/libA/iconA");
    expect(getSvgCache("libA/iconA")).toBe(result);
  });

  it("serves a cached result without re-fetching", async () => {
    const fetchFn = vi.fn(() =>
      Promise.resolve({ ok: true, text: () => Promise.resolve('<path d="M2 2"/>') } as Response),
    );
    vi.stubGlobal("fetch", fetchFn);

    await fetchSvgContent("https://root", "libB", "iconB");
    await fetchSvgContent("https://root", "libB", "iconB");

    expect(fetchFn).toHaveBeenCalledOnce();
  });

  // A non-2xx body would otherwise sanitize to a non-empty string, get cached, and defeat the
  // caller's `!svgContent` guard, leaving a permanently blank icon with no retry. It must throw and
  // must NOT cache, so a later fetch of the same path can succeed once the file is available.
  it("throws on a non-ok response and does not cache it", async () => {
    const okBody = '<path d="M3 3"/>';
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 404, text: () => Promise.resolve("Not Found") })
      .mockResolvedValueOnce({ ok: true, text: () => Promise.resolve(okBody) });
    vi.stubGlobal("fetch", fetchFn);

    await expect(fetchSvgContent("https://root", "libC", "iconC")).rejects.toThrow("404");
    expect(getSvgCache("libC/iconC")).toBeNull();

    // The error was not cached, so a retry re-fetches and succeeds.
    const result = await fetchSvgContent("https://root", "libC", "iconC");
    expect(result).toContain("path");
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });
});
