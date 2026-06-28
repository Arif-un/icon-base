import { sanitizeSvg } from "@/common/helpers/fetchSvgContent";

import { getUnsupportedSvgReason } from "./svgUtils";

export function openMediaLibrary(
  onSuccess: (svgContent: string, width: number, height: number) => void,
  onError: (message: string) => void,
) {
  const frame = window.wp.media({
    title: "Select SVG Icon",
    multiple: false,
    library: { type: "image/svg+xml" },
    button: { text: "Use this SVG" },
  });

  frame.on("select", () => {
    const attachment = frame.state().get("selection").first().toJSON();

    if (attachment.subtype !== "svg+xml" && !attachment.filename.endsWith(".svg")) {
      onError("Selected file is not an SVG.");

      return;
    }

    fetch(attachment.url)
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to fetch SVG (${String(res.status)})`);

        return res.text();
      })
      .then((text) => {
        if (!text.includes("<svg")) {
          throw new Error("File does not contain valid SVG markup.");
        }

        const viewBoxMatch = text.match(/viewBox=["']([^"']+)["']/);
        let width = 24;
        let height = 24;
        if (viewBoxMatch) {
          const parts = viewBoxMatch[1].split(/[\s,]+/).map(Number);
          if (parts.length === 4 && parts[2] > 0 && parts[3] > 0) {
            width = parts[2];
            height = parts[3];
          }
        }

        const innerMatch = text.match(/<svg[^>]*>([\s\S]*)<\/svg>/i);
        const inner = innerMatch ? innerMatch[1].trim() : text;
        const sanitized = sanitizeSvg(inner);

        const unsupportedReason = getUnsupportedSvgReason(text, sanitized);
        if (unsupportedReason) {
          throw new Error(unsupportedReason);
        }

        onSuccess(sanitized, width, height);

        return undefined;
      })
      .catch((err: unknown) => {
        onError(err instanceof Error ? err.message : "Failed to load SVG from media library.");
      });
  });

  frame.open();
}
