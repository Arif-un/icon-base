import { StyleProvider } from "@ant-design/cssinjs";
import { App, ConfigProvider } from "antd";
import { createContext, useContext, type ReactNode } from "react";
import { createRoot } from "react-dom/client";

type Options = {
  children: ReactNode;
  css: string;
};

type Handle = {
  replaceCss: (next: string) => void;
};

const ShadowRootContext = createContext<ShadowRoot | undefined>(undefined);

export function useShadowRoot(): ShadowRoot | undefined {
  return useContext(ShadowRootContext);
}

export function createReactShadow(host: Element, { children, css }: Options): Handle {
  const shadow = host.shadowRoot ?? host.attachShadow({ mode: "open" });

  // Inline <style> in the shadow. Its `@layer ...;` declaration on line 1 of
  // global.css is the first @layer mention the cascade sees, locking the order
  // before antd's later cssinjs injections register `antd` at position 0.
  const styleEl = ensureChild(shadow, "style[data-app-styles]", () => {
    const el = document.createElement("style");
    el.dataset.appStyles = "";

    return el;
  });
  styleEl.textContent = css;

  const mount = ensureChild(shadow, "div[data-app-root]", () => {
    const el = document.createElement("div");
    el.dataset.appRoot = "";

    return el;
  });

  createRoot(mount).render(
    <ShadowRootContext.Provider value={shadow}>
      <StyleProvider container={shadow} layer>
        <ConfigProvider getPopupContainer={() => mount}>
          <App>{children}</App>
        </ConfigProvider>
      </StyleProvider>
    </ShadowRootContext.Provider>,
  );

  return {
    replaceCss(next) {
      styleEl.textContent = next;
    },
  };
}

function ensureChild<T extends Element>(parent: ShadowRoot, selector: string, factory: () => T): T {
  const existing = parent.querySelector<T>(selector);
  if (existing) return existing;
  const created = factory();
  parent.appendChild(created);

  return created;
}
