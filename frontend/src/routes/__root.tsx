import { Outlet, createRootRoute } from "@tanstack/react-router";
import { useEffect } from "react";

import { syncWpBackground } from "../common/helpers/syncWpBackground";
import { DevtoolsPortal } from "../components/DevtoolsPortal";

export const Route = createRootRoute({
  component: RootLayout,
});

function RootLayout() {
  useEffect(() => {
    syncWpBackground();
  }, []);

  return (
    <div className="flex h-full flex-col">
      <header className="flex h-12 shrink-0 items-center border-b border-gray-200 px-4">
        <h3 className="m-0 text-base font-semibold">Icon Base</h3>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>
      <DevtoolsPortal />
    </div>
  );
}
