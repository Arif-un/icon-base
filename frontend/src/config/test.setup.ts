/* eslint-disable @typescript-eslint/no-explicit-any */
import "@testing-library/jest-dom/vitest";
import React from "react";

// SERVER_VARIABLES is injected by the PHP side at runtime (see vite.config.ts `define`, which is
// intentionally skipped in test mode). Config reads it at import time, so it must exist globally
// before any module that imports @/config/config is loaded.
(globalThis as any).SERVER_VARIABLES = {
  nonce: "test-nonce",
  restNonce: "test-rest-nonce",
  rootURL: "https://example.test/wp-content/plugins/icon-indexa",
  siteURL: "https://example.test",
  siteBaseURL: "https://example.test",
  assetsURL: "https://example.test/assets",
  pluginAdminURL: "https://example.test/wp-admin/admin.php?page=icon-indexa",
  redirectUri: "https://example.test/redirect",
  ajaxURL: "https://example.test/wp-admin/admin-ajax.php",
  apiURL: { base: "https://example.test/wp-json/IconIndexa/v1", separator: "?" },
  routePrefix: "ICON_INDEXA_",
  dateFormat: "F j, Y",
  timeFormat: "g:i a",
  timeZone: "UTC",
  pluginSlug: "icon-indexa",
  uploadBaseUrl: "https://example.test/uploads",
  version: "1.0.0",
  lang: "en_US",
  translations: {},
  onboarding: { adminTour: false, editorGuide: false, version: 1, wizard: false },
};

// Minimal but functional stand-ins for the @wordpress/* UI primitives the block reads off
// window.wp at runtime. Each mock forwards the props (onClick/onChange/value/label) that tests
// interact with, following the WordPress onChange conventions (value-first, not event-first).
const el = React.createElement;

const useBlockProps = Object.assign((props: Record<string, unknown> = {}) => props, {
  save: (props: Record<string, unknown> = {}) => props,
});

const Button = ({ children, onClick, disabled, label, icon: _icon, ...rest }: any) =>
  el("button", { onClick, disabled, "aria-label": label, ...rest }, children ?? label);

const Modal = ({ children, title, onRequestClose, className }: any) =>
  el("div", { role: "dialog", "aria-label": title, className }, [
    el("button", { key: "close", "aria-label": "Close", onClick: onRequestClose }, "×"),
    children,
  ]);

// core's Guide, as used by the block's welcome guide: a labelled dialog holding every page
// plus the finish button. Rendered flat rather than paginated — the tests assert on the
// copy across all pages and on onFinish, not on core's own next/previous behaviour.
const Guide = ({ contentLabel, className, finishButtonText, onFinish, pages = [] }: any) =>
  el(
    "div",
    { role: "dialog", "aria-label": contentLabel, className },
    ...pages.map((page: any, index: number) => el("div", { key: index }, page.image, page.content)),
    el("button", { key: "finish", onClick: onFinish }, finishButtonText ?? "Finish"),
  );

const PanelBody = ({ children, title }: any) => el("div", { "data-panel": title }, children);

const passthrough = ({ children }: any) => children ?? null;

const SelectControl = ({ label, value, options = [], onChange }: any) =>
  el(
    "select",
    { "aria-label": label, value, onChange: (e: any) => onChange?.(e.target.value) },
    options.map((o: any) => el("option", { key: String(o.value), value: o.value }, o.label)),
  );

const numberControl =
  (type: string) =>
  ({ label, value, onChange }: any) =>
    el("input", {
      type,
      "aria-label": label,
      value: value ?? "",
      onChange: (e: any) => onChange?.(Number(e.target.value)),
    });

const textControl =
  (type: string) =>
  ({ label, value, onChange, placeholder }: any) =>
    el("input", {
      type,
      "aria-label": label,
      placeholder,
      value: value ?? "",
      onChange: (e: any) => onChange?.(e.target.value),
    });

const ColorPicker = ({ color, onChange }: any) =>
  el("input", {
    type: "color",
    "aria-label": "Color",
    value: color ?? "#000000",
    onChange: (e: any) => onChange?.(e.target.value),
  });

const Spinner = () => el("span", { role: "status", "aria-label": "Loading" });

const DropdownMenu = ({ toggleProps, controls = [], label }: any) =>
  el("div", { "data-dropdown": label }, [
    el("button", { key: "toggle", ...toggleProps }, toggleProps?.children ?? label),
    ...controls.map((c: any, i: number) =>
      el("button", { key: i, onClick: c.onClick, "aria-label": c.title }, c.title),
    ),
  ]);

const ToolbarButton = ({ children, onClick, label, ...rest }: any) =>
  el("button", { onClick, "aria-label": label, ...rest }, children ?? label);

const Popover = ({ children }: any) => el("div", { role: "tooltip" }, children);

const PanelColorGradientSettings = ({ children, settings = [] }: any) =>
  el("div", { "data-color-settings": true }, [
    ...settings.map((s: any, i: number) => el("div", { key: i, "data-setting": s.label }, s.label)),
    children,
  ]);

const LinkControl = ({ value, onChange }: any) =>
  el("input", {
    "aria-label": "Link",
    value: value?.url ?? "",
    onChange: (e: any) => onChange?.({ url: e.target.value }),
  });

(window as any).wp = {
  blocks: {
    registerBlockType: (name: string, settings: unknown) => ({ name, settings }),
  },
  blockEditor: {
    useBlockProps,
    InspectorControls: passthrough,
    BlockControls: passthrough,
    __experimentalPanelColorGradientSettings: PanelColorGradientSettings,
    __experimentalLinkControl: LinkControl,
    useSetting: () => [],
  },
  components: {
    Button,
    Modal,
    Guide,
    PanelBody,
    SelectControl,
    TextControl: textControl("text"),
    __experimentalUnitControl: textControl("text"),
    RangeControl: numberControl("range"),
    SearchControl: textControl("search"),
    ColorPicker,
    Spinner,
    Popover,
    DropdownMenu,
    ToolbarButton,
    ToolbarGroup: passthrough,
  },
  data: {
    dispatch: () => ({ createNotice: () => undefined }),
  },
  i18n: { __: (s: string) => s, sprintf: (s: string) => s },
  media: () => ({
    on: () => undefined,
    open: () => undefined,
    state: () => ({ get: () => ({ first: () => ({ toJSON: () => ({}) }) }) }),
  }),
};
