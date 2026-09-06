import { Link, Outlet, createRootRoute } from "@tanstack/react-router";
import { Tooltip } from "antd";
import { useEffect } from "react";
import { FiSettings } from "react-icons/fi";

import { syncWpBackground } from "../common/helpers/syncWpBackground";
import { DevtoolsPortal } from "../components/DevtoolsPortal";
import Logo from "../components/Logo";

export const Route = createRootRoute({
  component: RootLayout,
});

function RootLayout() {
  useEffect(() => {
    syncWpBackground();
  }, []);

  return (
    <div className="flex h-full flex-col">
      <header className="flex h-12 shrink-0 items-center gap-2 border-b border-gray-200 px-4 pl-10">
        <Logo size={28} />
        <h3 className="m-0 text-lg font-semibold">Icon Indexa</h3>

        <Tooltip title="Settings">
          <Link
            to="/settings"
            aria-label="Settings"
            className="ml-auto flex items-center text-gray-500 hover:text-gray-900"
            activeProps={{ className: "ml-auto flex items-center text-gray-900" }}
          >
            <FiSettings size={18} />
          </Link>
        </Tooltip>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>
      <DevtoolsPortal />
    </div>
  );
}
