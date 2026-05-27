import { Link, Outlet, createRootRoute } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";

import { useShadowRoot } from "../bootstrap/createReactShadow";

export const Route = createRootRoute({
  component: RootLayout,
});

function RootLayout() {
  const shadowRoot = useShadowRoot();

  return (
    <div style={{ display: "flex" }}>
      <nav style={{ width: 200, padding: 16, borderRight: "1px solid #e0e0e0" }}>
        <h3 style={{ margin: "0 0 16px" }}>Icon Base</h3>
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          <NavItem to="/">Dashboard</NavItem>
          <NavItem to="/icons">Icons</NavItem>
          <NavItem to="/settings">Settings</NavItem>
          <NavItem to="/about">About</NavItem>
        </ul>
      </nav>
      <main style={{ flex: 1, padding: 24 }}>
        <Outlet />
      </main>
      <TanStackRouterDevtools position="bottom-right" shadowDOMTarget={shadowRoot} />
    </div>
  );
}

function NavItem({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <li style={{ marginBottom: 4 }}>
      <Link
        to={to}
        activeProps={{ style: { fontWeight: 700, color: "#1677ff" } }}
        style={{
          textDecoration: "none",
          color: "#333",
          display: "block",
          padding: "6px 8px",
          borderRadius: 4,
        }}
      >
        {children}
      </Link>
    </li>
  );
}
