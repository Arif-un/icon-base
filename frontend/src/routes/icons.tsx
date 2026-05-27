import { useIcons } from "@common/hooks/useIcons";
import { createFileRoute } from "@tanstack/react-router";
import { Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";

import type { Icon } from "@/types/icon";

export const Route = createFileRoute("/icons")({
  component: Icons,
});

const columns: ColumnsType<Icon> = [
  {
    title: "ID",
    dataIndex: "id",
    key: "id",
    width: 60,
  },
  {
    title: "Slug",
    dataIndex: "slug",
    key: "slug",
    render: (slug: string) => <Tag>{slug}</Tag>,
  },
  {
    title: "Name",
    dataIndex: "name",
    key: "name",
  },
];

function Icons() {
  const { data: icons, isLoading, error } = useIcons();

  return (
    <div>
      <h2 style={{ marginTop: 0, marginBottom: 16 }}>Icons</h2>
      <Table
        columns={columns}
        dataSource={icons}
        rowKey="id"
        loading={isLoading}
        pagination={{ pageSize: 10 }}
        locale={{ emptyText: error ? "Failed to load icons" : "No icons found" }}
        size="middle"
      />
    </div>
  );
}
