import DOMPurify from "dompurify";

export function stripSvgColors(svgContent: string): string {
  const wrapped = `<svg xmlns="http://www.w3.org/2000/svg">${svgContent}</svg>`;
  const clean = DOMPurify.sanitize(wrapped, {
    USE_PROFILES: { svg: true, svgFilters: true },
  });
  const innerMatch = clean.match(/^<svg[^>]*>([\s\S]*)<\/svg>$/);
  // Fall back to the sanitized DOMPurify output (`clean`), never the raw input:
  // returning raw `svgContent` on a regex miss would re-introduce stripped XSS vectors.
  const sanitized = innerMatch ? innerMatch[1] : clean;

  const div = document.createElement("div");
  div.innerHTML = `<svg>${sanitized}</svg>`;
  const svg = div.querySelector("svg");
  if (!svg) return sanitized;

  const elements = svg.querySelectorAll("*");
  for (const el of elements) {
    const fill = el.getAttribute("fill");
    if (fill && fill !== "none" && fill !== "currentColor") {
      el.setAttribute("fill", "currentColor");
    }

    const stroke = el.getAttribute("stroke");
    if (stroke && stroke !== "none" && stroke !== "currentColor") {
      el.setAttribute("stroke", "currentColor");
    }

    const style = el.getAttribute("style");
    if (style) {
      const cleaned = style
        .replace(/fill\s*:\s*(?!none)[^;]+;?/gi, "")
        .replace(/stroke\s*:\s*(?!none)[^;]+;?/gi, "")
        .trim();
      if (cleaned) {
        el.setAttribute("style", cleaned);
      } else {
        el.removeAttribute("style");
      }
    }
  }

  return svg.innerHTML;
}

const EMBEDDED_RASTER = /<image[\s/>]|data:image\/(?:png|jpe?g|gif|bmp|webp|tiff?|x-icon)/i;

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
  if (EMBEDDED_RASTER.test(rawMarkup)) {
    return "This SVG can't be used as an icon because it contains an embedded image (PNG/JPEG). Please use a vector SVG made of paths and shapes.";
  }

  if (!sanitizedInner.trim()) {
    return "This SVG has no usable vector content. Please use a vector SVG made of paths and shapes.";
  }

  return null;
}

export function svgHasStrokes(svgContent: string): boolean {
  const matches = svgContent.matchAll(/\bstroke\s*=\s*["']([^"']*)["']/gi);
  for (const match of matches) {
    if (match[1] && match[1] !== "none") return true;
  }

  return false;
}

const SAFE_URL_PROTOCOLS = /^(https?:|mailto:|tel:|#)/i;

export function isSafeUrl(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith("/") || trimmed.startsWith("#")) return true;

  return SAFE_URL_PROTOCOLS.test(trimmed);
}
