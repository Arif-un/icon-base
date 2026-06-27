import clsx from "clsx";
import { useMemo } from "react";

import { fetchSvgContent } from "@/common/helpers/fetchSvgContent";
import IconRender from "@/components/IconRender";
import config from "@/config/config";
import type { Icon, Library } from "@/types/icon";

import type { SelectedIconData } from "../types";

interface IconGridProps {
  icons: Icon[];
  libraries: Library[] | undefined;
  selectedIconId: number;
  size: number;
  strokeWidth: number;
  color: string;
  onSelectIcon: (data: SelectedIconData) => void;
}

export default function IconGrid({
  icons,
  libraries,
  selectedIconId,
  size,
  strokeWidth,
  color,
  onSelectIcon,
}: IconGridProps) {
  const libraryMap = useMemo(() => {
    const map: Partial<Record<number, { dir: string; slug: string; w?: number; h?: number }>> = {};

    if (!libraries) return map;

    for (let i = 0; i < libraries.length; i++) {
      const { id, slug, meta } = libraries[i];

      map[id] = {
        dir: `${String(id).padStart(3, "0")}-${slug}`,
        slug,
        w: meta?.w,
        h: meta?.h,
      };
    }

    return map;
  }, [libraries]);

  async function handleIconClick(icon: Icon) {
    const lib = libraryMap[icon.library_id];
    if (!lib) return;

    const svgContent = await fetchSvgContent(config.ROOT_URL, lib.dir, icon.filename);

    onSelectIcon({
      svgContent,
      iconId: icon.id,
      iconName: icon.name,
      iconFilename: icon.filename,
      librarySlug: lib.slug,
      libraryDir: lib.dir,
      iconWidth: lib.w ?? 24,
      iconHeight: lib.h ?? 24,
    });
  }

  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(5.5rem,1fr))] gap-0.5">
      {icons.map((icon) => {
        const lib = libraryMap[icon.library_id];
        const isSelected = icon.id === selectedIconId;

        return (
          <button
            key={icon.id}
            type="button"
            className={clsx(
              "flex flex-col items-center justify-center gap-1 p-2 rounded bg-transparent cursor-pointer transition-colors duration-100",
              isSelected
                ? "bg-[#e7f5fe] border border-[#007cba]"
                : "border border-transparent hover:bg-[#f0f0f0] hover:border-[#ccc]",
            )}
            title={icon.name}
            onClick={() => handleIconClick(icon)}
          >
            <IconRender
              fileName={icon.filename}
              libraryDir={lib?.dir ?? ""}
              iconWidth={lib?.w}
              iconHeight={lib?.h}
              size={size}
              strokeWidth={strokeWidth}
              color={color}
            />
            <span className="max-w-full truncate text-center text-[10px] text-[#757575] capitalize">
              {icon.name}
            </span>
          </button>
        );
      })}
    </div>
  );
}
