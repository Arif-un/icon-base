import { close as closeIcon } from "@wordpress/icons";
import { useMemo, useState } from "react";

import { useDebounce } from "@/common/hooks/useDebounce";
import { useIcons } from "@/common/hooks/useIcons";
import { useIconTypes } from "@/common/hooks/useIconTypes";
import { useLibraries } from "@/common/hooks/useLibraries";
import Logo from "@/components/Logo";

import type { SelectedIconData } from "../types";
import IconGrid from "./IconGrid";

const { Modal, Button, SearchControl, SelectControl, RangeControl, ColorPicker, Spinner } =
  window.wp.components;

const PAGE_SIZE = 100;

export default function IconPickerModal({
  selectedIconId,
  onSelectIcon,
  onClose,
}: {
  selectedIconId: number;
  onSelectIcon: (data: SelectedIconData) => void;
  onClose: () => void;
}) {
  const [previewSize, setPreviewSize] = useState(24);
  const [previewStrokeWidth, setPreviewStrokeWidth] = useState(1.5);
  const [previewColor, setPreviewColor] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [libraryIds, setLibraryIds] = useState<string[]>([]);
  const [typeIds, setTypeIds] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [pendingIconData, setPendingIconData] = useState<SelectedIconData | null>(null);
  const [showColorPicker, setShowColorPicker] = useState(false);

  const debouncedSearch = useDebounce(searchInput, 300);

  const {
    data: icons,
    isLoading,
    error,
  } = useIcons({
    page,
    perPage: PAGE_SIZE,
    search: debouncedSearch,
    libraryIds: libraryIds.map(Number),
    typeIds: typeIds.map(Number),
  });

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

  const totalPages = icons ? Math.ceil(icons.total / PAGE_SIZE) : 0;
  const displaySelectedId = pendingIconData?.iconId ?? selectedIconId;

  function handleAddIcon() {
    if (pendingIconData) {
      onSelectIcon(pendingIconData);
      onClose();
    }
  }

  return (
    <Modal
      title="Icon Base"
      onRequestClose={onClose}
      className="ib-picker-modal"
      // @ts-expect-error — experimental WP prop to suppress default header
      __experimentalHideHeader
    >
      <div className="flex flex-col" style={{ height: "70vh" }}>
        {/* ── Header ── */}
        <div className="flex shrink-0 items-center justify-between border-b border-[#e0e0e0] px-4 py-2.5">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <Logo />
            <span className="text-[13px] font-semibold text-[#1e1e1e]">Icon Base</span>
          </div>

          {/* Close */}
          <button
            type="button"
            onClick={onClose}
            className="ib-icon-btn flex h-8 w-8 items-center justify-center rounded border border-[#ddd] bg-white text-[#666] transition-colors hover:border-[#cc1818] hover:text-[#cc1818]"
            title="Close"
          >
            {closeIcon}
          </button>
        </div>

        {/* ── Body ── */}
        <div className="flex min-h-0 flex-1">
          {/* Settings sidebar */}
          <div className="ib-settings-sidebar w-52 shrink-0 overflow-y-auto border-r border-[#e0e0e0] p-3">
            <div className="flex flex-col gap-4">
              {/* Search */}
              <SearchControl
                value={searchInput}
                onChange={(value: string) => {
                  setSearchInput(value);
                  setPage(1);
                }}
                placeholder="Search icons…"
              />
              <SelectControl
                __next40pxDefaultSize
                label="Library"
                value={libraryIds.length === 1 ? libraryIds[0] : ""}
                onChange={(value: string | string[]) => {
                  const val = typeof value === "string" ? value : (value[0] ?? "");
                  setLibraryIds(val ? [val] : []);
                  setPage(1);
                }}
                options={libraryOptions}
              />
              <SelectControl
                __next40pxDefaultSize
                label="Type"
                value={typeIds.length === 1 ? typeIds[0] : ""}
                onChange={(value: string | string[]) => {
                  const val = typeof value === "string" ? value : (value[0] ?? "");
                  setTypeIds(val ? [val] : []);
                  setPage(1);
                }}
                options={typeOptions}
              />

              <div className="ib-sidebar-range">
                <RangeControl
                  label="Size"
                  value={previewSize}
                  onChange={(val: number | undefined) => val !== undefined && setPreviewSize(val)}
                  min={16}
                  max={64}
                  withInputField={false}
                />
              </div>
              <div className="ib-sidebar-range">
                <RangeControl
                  label="Stroke"
                  value={previewStrokeWidth}
                  onChange={(val: number | undefined) =>
                    val !== undefined && setPreviewStrokeWidth(val)
                  }
                  min={0.5}
                  max={4}
                  step={0.25}
                  withInputField={false}
                />
              </div>

              <div>
                <p className="mb-1.5 text-[11px] font-medium text-[#1e1e1e]">Color</p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowColorPicker((v) => !v)}
                    className="flex items-center gap-1.5 rounded border border-[#ddd] px-2 py-1 text-[11px] transition-colors hover:border-[#3858e9]"
                  >
                    <span
                      className="h-3.5 w-3.5 rounded-full border border-[#ccc]"
                      style={{ backgroundColor: previewColor || "#000" }}
                    />
                    {previewColor || "Pick color"}
                  </button>
                  {previewColor && (
                    <button
                      type="button"
                      onClick={() => setPreviewColor("")}
                      className="text-[11px] text-[#999] transition-colors hover:text-[#cc1818]"
                    >
                      Clear
                    </button>
                  )}
                </div>
                {showColorPicker && (
                  <div className="mt-2">
                    <ColorPicker color={previewColor || "#000000"} onChange={setPreviewColor} />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Icon grid */}
          <div className="flex-1 overflow-y-auto p-3">
            {isLoading && (
              <div className="flex items-center justify-center p-8">
                <Spinner />
              </div>
            )}
            {!isLoading && error && (
              <p className="flex items-center justify-center p-8 text-[13px] text-[#cc1818]">
                Failed to load icons
              </p>
            )}
            {!isLoading && !error && icons && icons.items.length === 0 && (
              <p className="flex items-center justify-center p-8 text-[13px] text-[#757575]">
                No icons found
              </p>
            )}
            {icons && icons.items.length > 0 && (
              <IconGrid
                icons={icons.items}
                libraries={libraries}
                selectedIconId={displaySelectedId}
                size={previewSize}
                strokeWidth={previewStrokeWidth}
                color={previewColor}
                onSelectIcon={setPendingIconData}
              />
            )}
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="flex shrink-0 items-center justify-between border-t border-[#e0e0e0] px-4 py-2">
          {/* Pagination – left */}
          {totalPages > 1 ? (
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                size="compact"
              >
                Previous
              </Button>
              <span className="text-xs text-[#757575]">
                {page} / {totalPages}
              </span>
              <Button
                variant="secondary"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                size="compact"
              >
                Next
              </Button>
            </div>
          ) : (
            <div />
          )}

          {/* Add Icon – right */}
          <Button variant="primary" disabled={!pendingIconData} onClick={handleAddIcon}>
            Add Icon
          </Button>
        </div>
      </div>
    </Modal>
  );
}
