/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return */
import "@testing-library/jest-dom";
import React from "react";

// Mock window.wp globals injected by WordPress at runtime.
// These stubs are intentionally minimal — only what tested components actually use.
const useBlockProps = Object.assign((props: Record<string, unknown> = {}) => props, {
  save: (props: Record<string, unknown> = {}) => props,
});

(window as any).wp = {
  blockEditor: {
    useBlockProps,
    InspectorControls: ({ children }: any) => children,
    BlockControls: ({ children }: any) => children,
  },
  components: {
    Button: ({ children, onClick, disabled }: any) =>
      React.createElement("button", { onClick, disabled }, children),
    Modal: ({ children, title, className }: any) =>
      React.createElement("div", { role: "dialog", "aria-label": title, className }, children),
  },
};
