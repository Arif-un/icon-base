import { StyleProvider } from "@ant-design/cssinjs";
import { RouterProvider, createHashHistory, createRouter } from "@tanstack/react-router";
import { createRoot } from "react-dom/client";

import { routeTree } from "./routeTree.gen";

import "./resource/styles/global.css";

const hashHistory = createHashHistory();

const router = createRouter({
  routeTree,
  history: hashHistory,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

const elm = document.querySelector("#wp-starter-kit-root");
if (elm) {
  createRoot(elm).render(
    <StyleProvider layer>
      <RouterProvider router={router} />
    </StyleProvider>,
  );
}
