import { createFileRoute } from "@tanstack/react-router";
import { App, Button, Spin, Switch, notification } from "antd";

import { useSettings, useUpdateSettings } from "@/common/hooks/useSettings";

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const { data: settings, isLoading, error } = useSettings();
  const updateSettings = useUpdateSettings();
  const { message } = App.useApp();
  const [notify, notifyContext] = notification.useNotification({ top: 60 });

  const handleToggle = (checked: boolean) => {
    updateSettings.mutate(
      { showSidebarMenu: checked },
      {
        onSuccess: () => {
          const key = "settings-saved";
          notify.success({
            key,
            message: "Setting saved",
            description: "Reload the page for the sidebar menu to update.",
            duration: 0,
            btn: (
              <Button type="primary" size="small" onClick={() => window.location.reload()}>
                Reload
              </Button>
            ),
          });
        },
        onError: () => {
          message.error("Failed to save setting");
        },
      },
    );
  };

  if (isLoading) return <Spin className="m-10" />;
  if (error || !settings) return <p className="m-10">Failed to load settings</p>;

  return (
    <div className="mx-10 my-6 max-w-2xl">
      {notifyContext}
      <h2 className="mb-4 text-xl font-semibold">Settings</h2>

      <div className="flex items-start justify-between gap-4 rounded-md border border-solid border-gray-200 p-4">
        <div>
          <p className="m-0 font-medium">Show dedicated menu in sidebar</p>
          <p className="m-0 mt-1 text-xs text-gray-500">
            Adds an Icon Indexa item to the WordPress admin sidebar. Icon Indexa is always available
            under Tools regardless of this setting. Menu updates on next page load.
          </p>
        </div>
        <Switch
          checked={settings.showSidebarMenu}
          loading={updateSettings.isPending}
          onChange={handleToggle}
        />
      </div>
    </div>
  );
}
