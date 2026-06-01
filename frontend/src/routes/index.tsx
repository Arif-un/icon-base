import { createFileRoute } from "@tanstack/react-router";
import { Pagination, Spin } from "antd";
import { useMemo, useState } from "react";

import { useIcons } from "@/common/hooks/useIcons";
import { useLibraries } from "@/common/hooks/useLibraries";
import IconRender from "@/components/IconRender";

export const Route = createFileRoute("/")({
  component: Icons,
});

const PAGE_SIZE = 100;

function Icons() {
  const [page, setPage] = useState(1);
  const { data: icons, isLoading, error } = useIcons(page, PAGE_SIZE);
  const { data: libraries } = useLibraries();

  const libraryDirMap = useMemo(() => {
    const map: Record<number, string> = {};

    if (!libraries) return map;

    for (let i = 0; i < libraries.length; i++) {
      const id = libraries[i].id;
      const slug = libraries[i].slug;

      map[id] = `${String(id).padStart(3, "0")}-${slug}`;
    }

    return map;
  }, [libraries]);

  return (
    <div>
      {isLoading && <Spin />}
      {error ? <p>Failed to load icons</p> : null}
      <div className="mx-2 flex flex-wrap justify-center gap-1">
        {icons?.items.map(
          (icon: { id: number; name: string; filename: string; library_id: number }) => (
            <div
              key={icon.id}
              className="flex w-20 flex-col items-center justify-center gap-1 rounded-md border border-solid border-transparent p-3 hover:border-slate-300 hover:bg-slate-100"
              title={icon.name}
            >
              <IconRender
                fileName={icon.filename}
                libraryDir={libraryDirMap[icon.library_id] ?? ""}
                size={32}
              />
              <span className="max-w-[95%] truncate text-[10px] text-gray-500 capitalize">
                {icon.name}
              </span>
            </div>
          ),
        )}
      </div>
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
