import { useMemo, useState } from "react";

import { useIconTypes } from "@/common/hooks/useIconTypes";
import { useLibraries } from "@/common/hooks/useLibraries";

import type { SelectedIconData } from "../types";
import IconPickerPanel from "./IconPickerPanel";

const { Button, ColorPicker, Popover, RangeControl, SelectControl } = window.wp.components;

const LOGO_PATH =
  "M97.8721 3C99.5994 3 101 4.41527 101 6.16113V97.8389L100.996 98.001C100.912 99.6713 99.5455 101 97.8721 101H6.12793L5.9668 100.996C4.31424 100.911 3.00007 99.5302 3 97.8389V6.16113C3.00008 4.4698 4.31425 3.08853 5.9668 3.00391L6.12793 3H97.8721ZM52 44.0967C32.4133 44.0967 18.6387 58.6721 18.6387 74.1289V85.1934H36.3594C35.031 82.6808 34.2764 79.8115 34.2764 76.7637C34.2764 66.8701 42.2117 58.8497 52 58.8496C53.9287 58.8496 55.7851 59.1625 57.5234 59.7383C55.4707 60.9153 54.085 63.1434 54.085 65.6992C54.0852 69.4817 57.119 72.5486 60.8613 72.5488C63.8929 72.5488 66.4584 70.5357 67.3242 67.7607C68.8487 70.4061 69.7236 73.4816 69.7236 76.7637C69.7236 79.8114 68.9699 82.6809 67.6416 85.1934H85.3613V74.1289C85.3613 58.6721 71.5867 44.0967 52 44.0967ZM18.6387 40.5596C27.3865 32.9482 39.111 28.29 52 28.29C64.889 28.29 76.6135 32.9482 85.3613 40.5596V18.8066H18.6387V40.5596Z";

export default function IconPickerPopover({
  anchor,
  selectedIconId,
  size,
  strokeWidth,
  color,
  onSelectIcon,
  onSizeChange,
  onStrokeWidthChange,
  onColorChange,
  onExpand,
  onClose,
}: {
  anchor: Element | null;
  selectedIconId: number;
  size: number;
  strokeWidth: number;
  color: string;
  onSelectIcon: (data: SelectedIconData) => void;
  onSizeChange: (size: number) => void;
  onStrokeWidthChange: (strokeWidth: number) => void;
  onColorChange: (color: string) => void;
  onExpand: () => void;
  onClose: () => void;
}) {
  const [pendingIcon, setPendingIcon] = useState<SelectedIconData | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [libraryIds, setLibraryIds] = useState<string[]>([]);
  const [typeIds, setTypeIds] = useState<string[]>([]);

  const { data: libraries } = useLibraries();
  const { data: iconTypes } = useIconTypes();

  const libraryOptions = useMemo(
    () => [
      { label: "All Libraries", value: "" },
      ...(libraries?.map((lib) => ({ label: lib.name, value: String(lib.id) })) ?? []),
    ],
    [libraries],
  );

  const typeOptions = useMemo(
    () => [
      { label: "All Types", value: "" },
      ...(iconTypes?.map((t) => ({ label: t.type, value: String(t.id) })) ?? []),
    ],
    [iconTypes],
  );

  function handleConfirmSelect() {
    if (pendingIcon) {
      onSelectIcon(pendingIcon);
      onClose();
    }
  }

  return (
    <Popover anchor={anchor} onClose={onClose} placement="bottom-start" className="ib-popover">
      <div
        role="presentation"
        className="flex max-h-130 w-105 flex-col"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-2 border-b border-[#e0e0e0] p-2 pl-3">
          <div className="flex min-w-0 items-center gap-1.5">
            <svg
              className="shrink-0"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 104 104"
              width="20"
              height="20"
              fill="currentColor"
            >
              <path d={LOGO_PATH} />
            </svg>
            <span className="text-[13px] font-semibold whitespace-nowrap">Icon Base</span>
          </div>
          <div className="flex shrink-0 items-center gap-0.5">
            <Button
              variant="primary"
              size="compact"
              disabled={!pendingIcon}
              onClick={handleConfirmSelect}
            >
              Select
            </Button>
            <Button
              icon="admin-generic"
              label="Settings"
              onClick={() => setShowSettings(!showSettings)}
              isPressed={showSettings}
              size="compact"
            />
            <Button
              icon="fullscreen-alt"
              label="Expand to modal"
              onClick={onExpand}
              size="compact"
            />
            <Button icon="no-alt" label="Close" onClick={onClose} size="compact" />
          </div>
        </div>

        {showSettings && (
          <div className="flex flex-col gap-2 border-b border-[#e0e0e0] px-4 py-3">
            <div className="flex gap-2">
              <SelectControl
                label="Library"
                hideLabelFromVision
                value={libraryIds.length === 1 ? libraryIds[0] : ""}
                onChange={(value: string | string[]) => {
                  const val = typeof value === "string" ? value : (value[0] ?? "");
                  setLibraryIds(val ? [val] : []);
                }}
                options={libraryOptions}
                className="ib-select"
              />
              <SelectControl
                label="Type"
                hideLabelFromVision
                value={typeIds.length === 1 ? typeIds[0] : ""}
                onChange={(value: string | string[]) => {
                  const val = typeof value === "string" ? value : (value[0] ?? "");
                  setTypeIds(val ? [val] : []);
                }}
                options={typeOptions}
                className="ib-select"
              />
            </div>
            <div className="ib-adjustments flex flex-wrap items-center gap-3">
              <RangeControl
                label="Size"
                value={size}
                onChange={(val) => val !== undefined && onSizeChange(val)}
                min={16}
                max={64}
                withInputField={false}
              />
              <RangeControl
                label="Stroke"
                value={strokeWidth}
                onChange={(val) => val !== undefined && onStrokeWidthChange(val)}
                min={0.5}
                max={4}
                step={0.25}
                withInputField={false}
              />
              <div className="flex items-center gap-1">
                <Button
                  variant="secondary"
                  onClick={() => setShowColorPicker(!showColorPicker)}
                  className="whitespace-nowrap"
                  size="compact"
                >
                  <span
                    className="mr-1 inline-block h-3.5 w-3.5 rounded-full border border-[#ccc]"
                    style={{ backgroundColor: color || "#000" }}
                  />
                  Color
                </Button>
                {color && (
                  <Button variant="tertiary" onClick={() => onColorChange("")} size="compact">
                    Clear
                  </Button>
                )}
              </div>
              {showColorPicker && (
                <div className="py-2">
                  <ColorPicker color={color || "#000000"} onChange={onColorChange} />
                </div>
              )}
            </div>
          </div>
        )}

        <IconPickerPanel
          selectedIconId={pendingIcon?.iconId ?? selectedIconId}
          size={size}
          strokeWidth={strokeWidth}
          color={color}
          onSelectIcon={(data) => setPendingIcon(data)}
          onSizeChange={onSizeChange}
          onStrokeWidthChange={onStrokeWidthChange}
          onColorChange={onColorChange}
          compact
          libraryIds={libraryIds}
          onLibraryIdsChange={setLibraryIds}
          typeIds={typeIds}
          onTypeIdsChange={setTypeIds}
        />
      </div>
    </Popover>
  );
}
