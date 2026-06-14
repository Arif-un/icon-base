import { useState } from "react";

import { sanitizeSvg } from "@/common/helpers/fetchSvgContent";

const { Button, Modal } = window.wp.components;

function extractViewBox(svgMarkup: string): { width: number; height: number } {
  const viewBoxMatch = svgMarkup.match(/viewBox=["']([^"']+)["']/);
  if (viewBoxMatch) {
    const parts = viewBoxMatch[1].split(/[\s,]+/).map(Number);
    if (parts.length === 4 && parts[2] > 0 && parts[3] > 0) {
      return { width: parts[2], height: parts[3] };
    }
  }

  const wMatch = svgMarkup.match(/\bwidth=["'](\d+(?:\.\d+)?)["']/);
  const hMatch = svgMarkup.match(/\bheight=["'](\d+(?:\.\d+)?)["']/);
  if (wMatch && hMatch) {
    return { width: Number(wMatch[1]), height: Number(hMatch[1]) };
  }

  return { width: 24, height: 24 };
}

function extractInnerSvg(raw: string): string {
  const match = raw.match(/<svg[^>]*>([\s\S]*)<\/svg>/i);

  return match ? match[1].trim() : raw;
}

export default function CustomSvgModal({
  onInsert,
  onClose,
}: {
  onInsert: (svgContent: string, width: number, height: number) => void;
  onClose: () => void;
}) {
  const [rawSvg, setRawSvg] = useState("");

  const trimmed = rawSvg.trim();
  const sanitized = trimmed ? sanitizeSvg(extractInnerSvg(trimmed)) : "";
  const { width, height } = trimmed ? extractViewBox(trimmed) : { width: 24, height: 24 };
  const isValid = sanitized.length > 0;

  function handleInsert() {
    if (!isValid) return;
    onInsert(sanitized, width, height);
  }

  return (
    <Modal title="Insert Custom SVG" onRequestClose={onClose} className="ib-svg-modal" size="large">
      <div className="flex min-h-100 flex-1 overflow-hidden">
        <div className="flex flex-1 flex-col border-r border-[#e0e0e0] p-4">
          <label
            htmlFor="icon-base-svg-input"
            className="mb-2 text-[11px] font-medium tracking-[0.5px] text-[#757575] uppercase"
          >
            SVG Markup
          </label>
          <textarea
            id="icon-base-svg-input"
            className="box-border w-full flex-1 resize-none rounded border border-[#e0e0e0] p-3 font-mono text-[13px] leading-normal focus:border-[#007cba] focus:ring-1 focus:ring-[#007cba] focus:outline-none"
            value={rawSvg}
            onChange={(e) => setRawSvg(e.target.value)}
            placeholder={'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">...</svg>'}
            spellCheck={false}
          />
        </div>
        <div className="flex flex-1 flex-col p-4">
          <div className="mb-2 text-[11px] font-medium tracking-[0.5px] text-[#757575] uppercase">
            Preview
          </div>
          <div className="flex min-h-50 flex-1 items-center justify-center rounded border border-[#e0e0e0] bg-[#fafafa]">
            {isValid ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox={`0 0 ${width} ${height}`}
                width={64}
                height={64}
                fill="currentColor"
                dangerouslySetInnerHTML={{ __html: sanitized }}
              />
            ) : (
              <span className="text-[13px] text-[#a0a0a0] italic">
                {trimmed ? "Invalid SVG" : "Paste SVG markup to preview"}
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="flex justify-end gap-2 border-t border-[#e0e0e0] px-4 py-3">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="primary" onClick={handleInsert} disabled={!isValid}>
          Insert
        </Button>
      </div>
    </Modal>
  );
}
