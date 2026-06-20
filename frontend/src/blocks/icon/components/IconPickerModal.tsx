import clsx from "clsx";
import { useMemo, useState } from "react";

import { useDebounce } from "@/common/hooks/useDebounce";
import { useIcons } from "@/common/hooks/useIcons";
import { useIconTypes } from "@/common/hooks/useIconTypes";
import { useLibraries } from "@/common/hooks/useLibraries";

import type { SelectedIconData } from "../types";
import IconGrid from "./IconGrid";

const { Modal, Button, SelectControl, RangeControl, ColorPicker, Spinner } = window.wp.components;

const PAGE_SIZE = 100;

function LogoIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 104 104"
      width="28"
      height="28"
      aria-hidden="true"
      focusable="false"
    >
      <path
        fill="currentColor"
        d="M97.8721 3C99.5994 3 101 4.41527 101 6.16113V97.8389L100.996 98.001C100.912 99.6713 99.5455 101 97.8721 101H6.12793L5.9668 100.996C4.31424 100.911 3.00007 99.5302 3 97.8389V6.16113C3.00008 4.4698 4.31425 3.08853 5.9668 3.00391L6.12793 3H97.8721ZM52 44.0967C32.4133 44.0967 18.6387 58.6721 18.6387 74.1289V85.1934H36.3594C35.031 82.6808 34.2764 79.8115 34.2764 76.7637C34.2764 66.8701 42.2117 58.8497 52 58.8496C53.9287 58.8496 55.7851 59.1625 57.5234 59.7383C55.4707 60.9153 54.085 63.1434 54.085 65.6992C54.0852 69.4817 57.119 72.5486 60.8613 72.5488C63.8929 72.5488 66.4584 70.5357 67.3242 67.7607C68.8487 70.4061 69.7236 73.4816 69.7236 76.7637C69.7236 79.8114 68.9699 82.6809 67.6416 85.1934H85.3613V74.1289C85.3613 58.6721 71.5867 44.0967 52 44.0967ZM18.6387 40.5596C27.3865 32.9482 39.111 28.29 52 28.29C64.889 28.29 76.6135 32.9482 85.3613 40.5596V18.8066H18.6387V40.5596Z"
      />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  );
}

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
  const [showSidebar] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
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
            <LogoIcon />
            <span className="text-[13px] font-semibold text-[#1e1e1e]">Icon Base</span>
          </div>

          {/* Close */}
          <button
            type="button"
            onClick={onClose}
            className="ib-icon-btn flex h-8 w-8 items-center justify-center rounded border border-[#ddd] bg-white text-[#666] transition-colors hover:border-[#cc1818] hover:text-[#cc1818]"
            title="Close"
          >
            <CloseIcon />
          </button>
        </div>

        {/* ── Body ── */}
        <div className="flex min-h-0 flex-1">
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

          {/* Settings sidebar */}
          {showSidebar && (
            <div className="ib-settings-sidebar w-52 shrink-0 overflow-y-auto border-l border-[#e0e0e0] p-3">
              <div className="flex flex-col gap-4">
                {/* Search */}
                <label
                  className={clsx(
                    "ib-sidebar-search flex cursor-text items-center gap-1.5 rounded border px-2.5 py-1.5 transition-colors duration-150",
                    searchFocused ? "border-[#3858e9] shadow-[0_0_0_1px_#3858e9]" : "border-[#ddd]",
                  )}
                >
                  <span className="shrink-0 text-[#aaa]">
                    <SearchIcon />
                  </span>
                  <input
                    type="text"
                    value={searchInput}
                    onChange={(e) => {
                      setSearchInput(e.target.value);
                      setPage(1);
                    }}
                    onFocus={() => setSearchFocused(true)}
                    onBlur={() => setSearchFocused(false)}
                    placeholder="Search icons…"
                    className="w-full bg-transparent text-[12px] text-[#1e1e1e] outline-none placeholder:text-[#bbb]"
                  />
                </label>
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
          )}
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
