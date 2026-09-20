import { useLayoutEffect, useMemo, useState } from "react";

import { sanitizeSvg } from "@/common/helpers/fetchSvgContent";
import { __ } from "@/common/helpers/i18nWrap";

import {
  applyColorNormalization,
  computeSvgFrame,
  getUnsupportedSvgReason,
  svgHasNormalizableColors,
  type SvgFrame,
} from "../utils/svgUtils";

const { Button, CheckboxControl, Modal } = window.wp.components;

const DEFAULT_FRAME: SvgFrame = { x: 0, y: 0, width: 24, height: 24 };

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

  const trimmed = rawSvg.trim();
  // Memoized so DOMPurify only re-runs when the markup changes, not on every re-render
  // (e.g. toggling the normalize checkbox).
  const sanitized = useMemo(
    () => (trimmed ? sanitizeSvg(extractInnerSvg(trimmed)) : ""),
    [trimmed],
  );
  // Editing an already-normalized SVG: its original colors were stripped to currentColor at insert
  // time and can't be recovered from the stored content, so unchecking here would be a no-op lie AND
  // would wrongly store normalize=false on currentColor-only content (hiding the block color control
  // that currentColor still obeys). Lock the toggle on whenever the current markup has no literal
  // colors left to preserve - driven by the actual content, not text divergence, so a geometry-only
  // edit of an already-normalized icon stays locked while pasting a colored SVG unlocks it.
  const hasNormalizableColors = useMemo(() => svgHasNormalizableColors(sanitized), [sanitized]);
  const normalizeLocked = isEditing && initialNormalize && !hasNormalizableColors;
  // While locked, normalize is effectively on regardless of the stored checkbox state, so a stale
  // false (e.g. left over from an earlier colored edit that was then cleared) can never reach the
  // preview or onInsert, and the checkbox never shows the contradictory disabled+unchecked state.
  const effectiveNormalize = normalizeLocked ? true : normalize;
  // computeSvgFrame may append a hidden probe to document.body to measure geometry (getBBox) - a
  // DOM side effect that must not run during render. Compute it in a layout effect (synchronously
  // before paint) and store the result, so render stays pure. Holds the 24x24 default until the
  // SVG changes and the effect re-measures.
  const [frame, setFrame] = useState<SvgFrame>(DEFAULT_FRAME);
  useLayoutEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- measure-then-store: getBBox needs the DOM, can't run during render
    setFrame(trimmed ? computeSvgFrame(trimmed, sanitized) : DEFAULT_FRAME);
  }, [trimmed, sanitized]);
  const { width, height } = frame;
  // When the artwork is offset from the origin (measured bbox), shift it back to 0,0 so the
  // 0 0 width height viewBox convention (used by edit/save/preview) frames it correctly.
  const framed =
    frame.x !== 0 || frame.y !== 0
      ? `<g transform="translate(${-frame.x},${-frame.y})">${sanitized}</g>`
      : sanitized;
  // Mirror what insert stores (edit.tsx) so the preview is true WYSIWYG: normalized -> currentColor.
  // Memoized so stripSvgColors (DOM build + querySelectorAll + attr walk) only re-runs when the
  // framed markup or the normalize toggle changes, not on every re-render.
  const previewSvg = useMemo(
    () => applyColorNormalization(framed, effectiveNormalize),
    [framed, effectiveNormalize],
  );
  const unsupportedReason = trimmed ? getUnsupportedSvgReason(trimmed, sanitized) : null;
  const isValid = sanitized.length > 0 && !unsupportedReason;

  function handleInsert() {
    if (!isValid) return;
    onInsert(framed, width, height, effectiveNormalize);
  }

  return (
    <Modal
      title={isEditing ? __("Edit Custom SVG") : __("Insert Custom SVG")}
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
            {__("SVG Markup")}
          </label>
          <textarea
            id="icon-base-svg-input"
            data-testid="custom-svg-input"
            className="box-border w-full flex-1 resize-none rounded border border-[#e0e0e0] p-3 font-mono text-[13px] leading-normal focus:border-[#007cba] focus:ring-1 focus:ring-[#007cba] focus:outline-none"
            value={rawSvg}
            onChange={(e) => setRawSvg(e.target.value)}
            placeholder={'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">...</svg>'}
            spellCheck={false}
          />
        </div>
        <div className="flex flex-1 flex-col p-4">
          <div className="mb-2 text-[11px] font-medium tracking-[0.5px] text-[#757575] uppercase">
            {__("Preview")}
          </div>
          <div className="flex min-h-50 flex-1 items-center justify-center rounded border border-[#e0e0e0] bg-[#fafafa]">
            {isValid ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox={`0 0 ${width} ${height}`}
                width={64}
                height={64}
                fill="currentColor"
                aria-hidden="true"
                dangerouslySetInnerHTML={{ __html: previewSvg }}
              />
            ) : (
              <span className="text-[13px] text-[#a0a0a0] italic">
                {/* Input present but not rendered above is always unsupported: an empty
                    sanitize result makes getUnsupportedSvgReason return a reason (banner below
                    shows the specifics). */}
                {trimmed ? __("Unsupported SVG") : __("Paste SVG markup to preview")}
              </span>
            )}
          </div>
        </div>
      </div>
      {unsupportedReason && (
        <div
          role="alert"
          className="mx-4 mb-1 flex items-start gap-2 rounded-sm border-l-4 border-l-[#cc1818] bg-[#fcf0f1] px-3 py-2 text-[13px] text-[#cc1818]"
        >
          {unsupportedReason}
        </div>
      )}
      <div className="flex items-center justify-between gap-2 border-t border-[#e0e0e0] px-4 py-3">
        <CheckboxControl
          label={__("Normalize colors to theme color")}
          help={
            normalizeLocked
              ? __(
                  "This icon's colors were already normalized to the theme color and can't be reverted here. Re-insert the SVG to keep its original colors.",
                )
              : __(
                  "Lets the block's color controls recolor this icon. Uncheck to keep the SVG's original colors.",
                )
          }
          checked={effectiveNormalize}
          onChange={setNormalize}
          disabled={normalizeLocked}
          __nextHasNoMarginBottom
        />
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onClose}>
            {__("Cancel")}
          </Button>
          <Button
            data-testid="custom-svg-insert"
            variant="primary"
            onClick={handleInsert}
            disabled={!isValid}
          >
            {isEditing ? __("Save") : __("Insert")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
