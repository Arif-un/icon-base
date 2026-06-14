import clsx from "clsx";
import { useMemo, useState } from "react";

import { useDebounce } from "@/common/hooks/useDebounce";
import { useIcons } from "@/common/hooks/useIcons";
import { useIconTypes } from "@/common/hooks/useIconTypes";
import { useLibraries } from "@/common/hooks/useLibraries";

import type { SelectedIconData } from "../types";
import IconGrid from "./IconGrid";

const { SearchControl, SelectControl, RangeControl, ColorPicker, Button, Spinner } =
  window.wp.components;

const PAGE_SIZE = 100;

interface IconPickerPanelProps {
  selectedIconId: number;
  size: number;
  strokeWidth: number;
  color: string;
  onSelectIcon: (data: SelectedIconData) => void;
  onSizeChange: (size: number) => void;
  onStrokeWidthChange: (strokeWidth: number) => void;
  onColorChange: (color: string) => void;
  compact: boolean;
  className?: string;
  libraryIds?: string[];
  onLibraryIdsChange?: (ids: string[]) => void;
  typeIds?: string[];
  onTypeIdsChange?: (ids: string[]) => void;
}

export default function IconPickerPanel(props: IconPickerPanelProps) {
  const {
    selectedIconId,
    size,
    strokeWidth,
    color,
    onSelectIcon,
    onSizeChange,
    onStrokeWidthChange,
    onColorChange,
    compact,
    className,
  } = props;
  const [searchInput, setSearchInput] = useState("");
  const [internalLibraryIds, setInternalLibraryIds] = useState<string[]>([]);
  const [internalTypeIds, setInternalTypeIds] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [showColorPicker, setShowColorPicker] = useState(false);

  const hasExternalFilters = props.libraryIds !== undefined;
  const libraryIds = props.libraryIds ?? internalLibraryIds;
  const typeIds = hasExternalFilters ? (props.typeIds ?? []) : internalTypeIds;

  const externalFilterKey = hasExternalFilters
    ? `${libraryIds.join(",")}-${typeIds.join(",")}`
    : "";
  const [prevFilterKey, setPrevFilterKey] = useState(externalFilterKey);
  if (hasExternalFilters && prevFilterKey !== externalFilterKey) {
    setPrevFilterKey(externalFilterKey);
    setPage(1);
  }

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

  return (
    <div className={clsx("flex flex-col overflow-hidden", compact && "max-h-110", className)}>
      <div className="flex shrink-0 flex-col gap-2 border-b border-[#e0e0e0] px-4 py-3">
        <SearchControl
          value={searchInput}
          onChange={(value: string) => {
            setSearchInput(value);
            setPage(1);
          }}
          placeholder="Search icons..."
          className="ib-search"
        />

        {!hasExternalFilters && (
          <>
            <div className="flex gap-2">
              <SelectControl
                label="Library"
                hideLabelFromVision
                value={libraryIds.length === 1 ? libraryIds[0] : ""}
                onChange={(value: string | string[]) => {
                  const val = typeof value === "string" ? value : (value[0] ?? "");
                  setInternalLibraryIds(val ? [val] : []);
                  setPage(1);
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
                  setInternalTypeIds(val ? [val] : []);
                  setPage(1);
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
          </>
        )}
      </div>

      <div className="max-h-42.5 flex-1 overflow-y-auto p-2">
        {isLoading && (
          <div className="flex items-center justify-center p-6 text-[13px] text-[#757575]">
            <Spinner />
          </div>
        )}
        {error ? (
          <p className="flex items-center justify-center p-6 text-[13px] text-[#cc1818]">
            Failed to load icons
          </p>
        ) : null}
        {icons && icons.items.length === 0 && (
          <p className="flex items-center justify-center p-6 text-[13px] text-[#757575]">
            No icons found
          </p>
        )}
        {icons && icons.items.length > 0 && (
          <IconGrid
            icons={icons.items}
            libraries={libraries}
            selectedIconId={selectedIconId}
            size={size}
            strokeWidth={strokeWidth}
            color={color}
            onSelectIcon={onSelectIcon}
          />
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex shrink-0 items-center justify-center gap-3 border-t border-[#e0e0e0] px-4 py-2">
          <Button
            variant="secondary"
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
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
            onClick={() => setPage(page + 1)}
            size="compact"
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
