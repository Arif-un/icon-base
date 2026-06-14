import DOMPurify from "dompurify";

export function stripSvgColors(svgContent: string): string {
  const wrapped = `<svg xmlns="http://www.w3.org/2000/svg">${svgContent}</svg>`;
  const clean = DOMPurify.sanitize(wrapped, {
    USE_PROFILES: { svg: true, svgFilters: true },
  });
  const innerMatch = clean.match(/^<svg[^>]*>([\s\S]*)<\/svg>$/);
  const sanitized = innerMatch ? innerMatch[1] : svgContent;

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
