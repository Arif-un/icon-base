import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider, createHashHistory, createRouter } from "@tanstack/react-router";

import { createReactShadow } from "./bootstrap/createReactShadow";
import { routeTree } from "./routeTree.gen";

import "./resource/styles/light-dom.css";
import globalCss from "./resource/styles/global.css?inline";

const hashHistory = createHashHistory();

const router = createRouter({
  routeTree,
  history: hashHistory,
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});

const host = document.querySelector("#wp-starter-kit-root");
if (host) {
  const { replaceCss } = createReactShadow(host, {
    css: globalCss,
    children: (
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    ),
  });

  if (import.meta.hot) {
    import.meta.hot.accept("./resource/styles/global.css?inline", (mod) => {
      if (typeof mod?.default === "string") replaceCss(mod.default);
    });
  }
}
