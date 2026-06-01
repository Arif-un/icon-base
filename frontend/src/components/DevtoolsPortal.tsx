import React from "react";
import ReactDOM from "react-dom";

const TanStackRouterDevtools = import.meta.env.DEV
  ? React.lazy(() =>
      import("@tanstack/react-router-devtools").then((mod) => ({
        default: mod.TanStackRouterDevtools,
      })),
    )
  : () => null;

export function DevtoolsPortal() {
  const container = React.useMemo(() => {
    const el = document.createElement("div");
    el.id = "tanstack-router-devtools";

    return el;
  }, []);

  React.useEffect(() => {
    document.body.prepend(container);

    return () => {
      container.remove();
    };
  }, [container]);

  return ReactDOM.createPortal(
    <React.Suspense>
      <TanStackRouterDevtools position="bottom-right" />
    </React.Suspense>,
    container,
  );
}
