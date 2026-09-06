import { useState } from "react";

import { sanitizeSvg } from "@/common/helpers/fetchSvgContent";

import { getUnsupportedSvgReason, stripSvgColors } from "../utils/svgUtils";

const { Button, CheckboxControl, Modal } = window.wp.components;

function extractViewBox(svgMarkup: string): { width: number; height: number } {
  const viewBoxMatch = svgMarkup.match(/viewBox=["']([^"']+)["']/);
  if (viewBoxMatch) {
    const parts = viewBoxMatch[1].split(/[\s,]+/).map(Number);
    if (parts.length === 4 && parts[2] > 0 && parts[3] > 0) {
      return { width: parts[2], height: parts[3] };
    }
  }

  // Only read width/height from the root <svg ...> opening tag, never a child element's
  // (a child rect/path width= would otherwise be picked up and size/clip the icon wrongly).
  const svgOpenTag = svgMarkup.match(/<svg\b[^>]*>/i)?.[0] ?? "";
  // Accept a leading number with an optional unit suffix (px, pt, em, %, ...): SVGs often
  // declare width="500pt" with no viewBox, and a strict digits-only match would miss it and
  // fall back to 24x24, clipping the artwork out of view.
  // (?:^|[^-\w]) so "stroke-width"/"data-width" on the root tag can't be mistaken for width.
  // A consumed boundary char is used instead of a lookbehind so it parses on Safari < 16.4.
  const wMatch = svgOpenTag.match(/(?:^|[^-\w])width=["'](\d+(?:\.\d+)?)/);
  const hMatch = svgOpenTag.match(/(?:^|[^-\w])height=["'](\d+(?:\.\d+)?)/);
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
  initialSvg = "",
  initialNormalize = true,
}: {
  onInsert: (svgContent: string, width: number, height: number, normalize: boolean) => void;
  onClose: () => void;
  initialSvg?: string;
  initialNormalize?: boolean;
}) {
  const isEditing = initialSvg.trim().length > 0;
  const [rawSvg, setRawSvg] = useState(initialSvg);
  const [normalize, setNormalize] = useState(initialNormalize);
  // Editing an already-normalized SVG: its original colors were stripped to currentColor at
  // insert time and can't be recovered from the stored content, so unchecking here would be a
  // no-op lie. Lock the toggle on in that case.
  const normalizeLocked = isEditing && initialNormalize;

  const trimmed = rawSvg.trim();
  const sanitized = trimmed ? sanitizeSvg(extractInnerSvg(trimmed)) : "";
  const { width, height } = trimmed ? extractViewBox(trimmed) : { width: 24, height: 24 };
  // Mirror what insert stores (edit.tsx) so the preview is true WYSIWYG: normalized -> currentColor.
  const previewSvg = normalize ? stripSvgColors(sanitized) : sanitized;
  const unsupportedReason = trimmed ? getUnsupportedSvgReason(trimmed, sanitized) : null;
  const isValid = sanitized.length > 0 && !unsupportedReason;

  function handleInsert() {
    if (!isValid) return;
    onInsert(sanitized, width, height, normalize);
  }

  return (
    <Modal
      title={isEditing ? "Edit Custom SVG" : "Insert Custom SVG"}
      onRequestClose={onClose}
      className="ib-svg-modal"
      size="large"
    >
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
                dangerouslySetInnerHTML={{ __html: previewSvg }}
              />
            ) : (
              <span className="text-[13px] text-[#a0a0a0] italic">
                {trimmed
                  ? unsupportedReason
                    ? "Unsupported SVG"
                    : "Invalid SVG"
                  : "Paste SVG markup to preview"}
              </span>
            )}
          </div>
        </div>
      </div>
      {unsupportedReason && (
        <div className="mx-4 mb-1 flex items-start gap-2 rounded-sm border-l-4 border-l-[#cc1818] bg-[#fcf0f1] px-3 py-2 text-[13px] text-[#cc1818]">
          {unsupportedReason}
        </div>
      )}
      <div className="flex items-center justify-between gap-2 border-t border-[#e0e0e0] px-4 py-3">
        <CheckboxControl
          label="Normalize colors to theme color"
          help={
            normalizeLocked
              ? "This icon's colors were already normalized to the theme color and can't be reverted here. Re-insert the SVG to keep its original colors."
              : "Lets the block's color controls recolor this icon. Uncheck to keep the SVG's original colors."
          }
          checked={normalize}
          onChange={setNormalize}
          disabled={normalizeLocked}
          __nextHasNoMarginBottom
        />
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleInsert} disabled={!isValid}>
            {isEditing ? "Save" : "Insert"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
