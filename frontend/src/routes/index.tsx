import { createFileRoute } from "@tanstack/react-router";
import { Input, Pagination, Select, Spin } from "antd";
import { useMemo, useState } from "react";
import { FiSearch } from "react-icons/fi";

import { useDebounce } from "@/common/hooks/useDebounce";
import { useIcons } from "@/common/hooks/useIcons";
import { useIconTypes } from "@/common/hooks/useIconTypes";
import { useLibraries } from "@/common/hooks/useLibraries";
import IconRender from "@/components/IconRender";

export const Route = createFileRoute("/")({
  component: Icons,
});

const PAGE_SIZE = 100;

function Icons() {
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [libraryIds, setLibraryIds] = useState<number[]>([]);
  const [typeIds, setTypeIds] = useState<number[]>([]);

  const debouncedSearch = useDebounce(searchInput, 300);

  const {
    data: icons,
    isLoading,
    error,
  } = useIcons({
    page,
    perPage: PAGE_SIZE,
    search: debouncedSearch,
    libraryIds,
    typeIds,
  });

  const { data: libraries } = useLibraries();
  const { data: iconTypes } = useIconTypes();

  const libraryMap = useMemo(() => {
    const map: Record<number, { dir: string; w?: number; h?: number }> = {};

    if (!libraries) return map;

    for (let i = 0; i < libraries.length; i++) {
      const { id, slug, meta } = libraries[i];

      map[id] = {
        dir: `${String(id).padStart(3, "0")}-${slug}`,
        w: meta?.w,
        h: meta?.h,
      };
    }

    return map;
  }, [libraries]);

  const libraryOptions = useMemo(
    () => libraries?.map((lib) => ({ label: lib.name, value: lib.id })),
    [libraries],
  );

  const typeOptions = useMemo(
    () => iconTypes?.map((t) => ({ label: t.type, value: t.id })),
    [iconTypes],
  );

  return (
    <div>
      <div className="mx-4 mb-4 ml-10 flex flex-wrap items-center gap-3">
        <Input
          prefix={<FiSearch />}
          placeholder="Search icons..."
          value={searchInput}
          onChange={(e) => {
            setSearchInput(e.target.value);
            setPage(1);
          }}
          allowClear
          className="w-64!"
        />
        <Select
          mode="multiple"
          placeholder="All Libraries"
          value={libraryIds}
          onChange={(values: number[]) => {
            setLibraryIds(values);
            setPage(1);
          }}
          allowClear
          className="min-w-44!"
          options={libraryOptions}
        />
        <Select
          mode="multiple"
          placeholder="All Types"
          value={typeIds}
          onChange={(values: number[]) => {
            setTypeIds(values);
            setPage(1);
          }}
          allowClear
          className="min-w-36! capitalize"
          options={typeOptions}
        />
      </div>
      {isLoading && <Spin />}
      {error ? <p>Failed to load icons</p> : null}
      {icons?.items.length === 0 && !isLoading ? (
        <p className="py-8 text-center text-gray-400">No icons found</p>
      ) : (
        <div className="mx-2 flex flex-wrap justify-center gap-1">
          {icons?.items.map(
            (icon: { id: number; name: string; filename: string; library_id: number }) => {
              const lib = libraryMap[icon.library_id] as
                | { dir: string; w?: number; h?: number }
                | undefined;

              return (
                <div
                  key={icon.id}
                  className="flex w-20 flex-col items-center justify-center gap-1 rounded-md border border-solid border-transparent p-3 hover:border-slate-300 hover:bg-slate-100"
                  title={icon.name}
                >
                  <IconRender
                    fileName={icon.filename}
                    libraryDir={lib?.dir ?? ""}
                    iconWidth={lib?.w}
                    iconHeight={lib?.h}
                    size={32}
                  />
                  <span className="max-w-[95%] truncate text-[10px] text-gray-500 capitalize">
                    {icon.name}
                  </span>
                </div>
              );
            },
          )}
        </div>
      )}
      {icons && icons.total > PAGE_SIZE && (
        <div className="mt-4 flex justify-center">
          <Pagination
            current={icons.page}
            pageSize={PAGE_SIZE}
            total={icons.total}
            onChange={setPage}
            showSizeChanger={false}
            showTotal={(total: number, range: [number, number]) =>
              `${range[0]}-${range[1]} of ${total}`
            }
          />
        </div>
      )}
    </div>
  );
}
