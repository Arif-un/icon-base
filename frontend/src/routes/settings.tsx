import { createFileRoute } from "@tanstack/react-router";
import { App, Button, Spin, Switch, notification } from "antd";

import { __ } from "@/common/helpers/i18nWrap";
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
            title: __("Setting saved"),
            description: __("Reload the page for the sidebar menu to update."),
            duration: 0,
            actions: (
              <Button
                data-testid="settings-saved-reload"
                type="primary"
                size="small"
                onClick={() => window.location.reload()}
              >
                {__("Reload")}
              </Button>
            ),
          });
        },
        onError: () => {
          message.error(__("Failed to save setting"));
        },
      },
    );
  };

  if (isLoading) return <Spin className="m-10" />;
  if (error || !settings) return <p className="m-10">{__("Failed to load settings")}</p>;

  const sidebarLabel = __("Show dedicated menu in sidebar");

  return (
    <div data-testid="settings-page" className="mx-10 my-6 max-w-2xl">
      {notifyContext}
      <h2 className="mb-4 text-xl font-semibold">{__("Settings")}</h2>

      <div className="flex items-start justify-between gap-4 rounded-md border border-solid border-gray-200 p-4">
        <div>
          <p className="m-0 font-medium">{sidebarLabel}</p>
          <p className="m-0 mt-1 text-xs text-gray-500">
            {__(
              "Adds an Icon Indexa item to the WordPress admin sidebar. Icon Indexa is always available under Tools regardless of this setting. Menu updates on next page load.",
            )}
          </p>
        </div>
        <Switch
          data-testid="settings-sidebar-toggle"
          aria-label={sidebarLabel}
          checked={settings.showSidebarMenu}
          loading={updateSettings.isPending}
          onChange={handleToggle}
        />
      </div>
    </div>
  );
}
