import { useEffect, useState } from "react";

import config from "@/config/config";
import DOMPurify from "dompurify";

const svgCache: Record<string, string> = {};

function sanitizePathSegment(segment: string): string {
  return segment.replace(/[^a-zA-Z0-9._-]/g, "");
}

function sanitizeSvg(raw: string): string {
  const wrapped = `<svg xmlns="http://www.w3.org/2000/svg">${raw}</svg>`;
  const clean = DOMPurify.sanitize(wrapped, {
    USE_PROFILES: { svg: true, svgFilters: true },
  });
  const match = clean.match(/^<svg[^>]*>([\s\S]*)<\/svg>$/);

  return match ? match[1] : clean;
}

export default function IconRender({
  fileName,
  libraryDir,
  size = 24,
}: {
  fileName: string;
  libraryDir: string;
  size?: number;
}) {
  const path = `${sanitizePathSegment(libraryDir)}/${sanitizePathSegment(fileName)}`;
  const [svgContent, setSvgContent] = useState<string | null>(svgCache[path] ?? null);
  const [prevPath, setPrevPath] = useState(path);

  if (prevPath !== path) {
    setPrevPath(path);
    setSvgContent(svgCache[path] ?? null);
  }

  useEffect(() => {
    if (svgCache[path]) return;

    const controller = new AbortController();

    fetch(`${config.ROOT_URL}/icons/${path}`, {
      signal: controller.signal,
      cache: "force-cache",
    })
      .then((res) => res.text())
      .then((text) => {
        const sanitized = sanitizeSvg(text);
        svgCache[path] = sanitized;
        setSvgContent(sanitized);

        return sanitized;
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
      });

    return () => controller.abort();
  }, [path]);

  if (!svgContent) return null;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 1024 1024"
      width={size}
      height={size}
      fill="currentColor"
      dangerouslySetInnerHTML={{ __html: svgContent }}
    />
  );
}
