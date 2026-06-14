import { useEffect, useState } from "react";

import {
  fetchSvgContent,
  getSvgCache,
  sanitizePathSegment,
} from "@/common/helpers/fetchSvgContent";
import config from "@/config/config";

export default function IconRender({
  fileName,
  libraryDir,
  size = 24,
  iconWidth,
  iconHeight,
  strokeWidth,
  color,
}: {
  fileName: string;
  libraryDir: string;
  size?: number;
  iconWidth?: number;
  iconHeight?: number;
  strokeWidth?: number;
  color?: string;
}) {
  const path = `${sanitizePathSegment(libraryDir)}/${sanitizePathSegment(fileName)}`;
  const [svgContent, setSvgContent] = useState<string | null>(getSvgCache(path));
  const [prevPath, setPrevPath] = useState(path);

  if (prevPath !== path) {
    setPrevPath(path);
    setSvgContent(getSvgCache(path));
  }

  useEffect(() => {
    if (getSvgCache(path)) return;

    const controller = new AbortController();

    fetchSvgContent(config.ROOT_URL, libraryDir, fileName, controller.signal)
      .then(setSvgContent)
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
      });

    return () => controller.abort();
  }, [path, libraryDir, fileName]);

  if (!svgContent) return null;

  return (
    <svg
      className="icon-render"
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${String(iconWidth ?? 1024)} ${String(iconHeight ?? 1024)}`}
      width={size}
      height={size}
      fill="currentColor"
      style={{
        color,
        ["--icon-stroke-width" as string]: strokeWidth,
      }}
      dangerouslySetInnerHTML={{ __html: svgContent }}
    />
  );
}
