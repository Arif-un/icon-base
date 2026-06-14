import DOMPurify from "dompurify";

const svgCache: Record<string, string> = {};

export function sanitizePathSegment(segment: string): string {
  return segment.replace(/[^a-zA-Z0-9._-]/g, "");
}

export function sanitizeSvg(raw: string): string {
  const wrapped = `<svg xmlns="http://www.w3.org/2000/svg">${raw}</svg>`;
  const clean = DOMPurify.sanitize(wrapped, {
    USE_PROFILES: { svg: true, svgFilters: true },
  });
  const match = clean.match(/^<svg[^>]*>([\s\S]*)<\/svg>$/);

  return match ? match[1] : clean;
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
  const text = await res.text();
  const sanitized = sanitizeSvg(text);
  svgCache[path] = sanitized;

  return sanitized;
}
