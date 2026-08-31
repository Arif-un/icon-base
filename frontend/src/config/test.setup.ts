/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return */
import "@testing-library/jest-dom";
import React from "react";

// vite.config.ts skips the SERVER_VARIABLES define in test mode, so the compile-time global
// is a free identifier here. Anything reaching config.ts or i18nWrap needs it to exist.
(globalThis as any).SERVER_VARIABLES = {
  ajaxURL: "http://localhost/wp-admin/admin-ajax.php",
  apiURL: { base: "http://localhost/wp-json/IconIndexa/v1", separator: "?" },
  assetsURL: "http://localhost/wp-content/plugins/icon-indexa/assets",
  dateFormat: "F j, Y",
  loggedInUserName: "admin",
  newPostURL: "http://localhost/wp-admin/post-new.php",
  nonce: "test-nonce",
  onboarding: { adminTour: false, editorGuide: false, version: 1, wizard: false },
  pluginAdminURL: "http://localhost/wp-admin/admin.php?page=icon-indexa#",
  pluginSlug: "icon-indexa",
  redirectUri: "http://localhost/icon-indexa/oauth-callback/",
  restNonce: "test-rest-nonce",
  rootURL: "http://localhost/wp-content/plugins/icon-indexa",
  routePrefix: "ICON_INDEXA_",
  settings: "",
  siteBaseURL: "http://localhost",
  siteURL: "http://localhost",
  timeFormat: "g:i a",
  timeZone: "UTC",
  uploadBaseUrl: "http://localhost/wp-content/uploads",
  version: "1.0.0",
};

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
    Guide: ({ contentLabel, className, finishButtonText, onFinish, pages }: any) =>
      React.createElement(
        "div",
        { role: "dialog", "aria-label": contentLabel, className },
        ...(pages ?? []).map((page: any, index: number) =>
          React.createElement("div", { key: index }, page.image, page.content),
        ),
        React.createElement("button", { onClick: onFinish }, finishButtonText ?? "Finish"),
      ),
    PanelBody: ({ children, title }: any) =>
      React.createElement("section", { "aria-label": title }, children),
  },
};
