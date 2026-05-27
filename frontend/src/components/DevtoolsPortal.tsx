import React from "react";
import ReactDOM from "react-dom";

const TanStackRouterDevtools = import.meta.env.DEV
  ? React.lazy(() =>
      import("@tanstack/react-router-devtools").then((mod) => ({
        default: mod.TanStackRouterDevtools,
      }))
    )
  : () => null;

export function DevtoolsPortal() {
  const [container, setContainer] = React.useState<HTMLDivElement | null>(null);

  React.useEffect(() => {
    const el = document.createElement("div");
    el.id = "tanstack-router-devtools";
    document.body.prepend(el);
    setContainer(el);

    return () => {
      el.remove();
    };
  }, []);

  if (!container) return null;

  return ReactDOM.createPortal(
    <React.Suspense>
      <TanStackRouterDevtools position="bottom-right" />
    </React.Suspense>,
    container
  );
}
