import { fireEvent, render, screen } from "@testing-library/react";
import { App } from "antd";
import type { ComponentType } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Route } from "./settings";

const { useSettingsMock, useUpdateSettingsMock } = vi.hoisted(() => ({
  useSettingsMock: vi.fn(),
  useUpdateSettingsMock: vi.fn(),
}));

vi.mock("@/common/hooks/useSettings", () => ({
  useSettings: useSettingsMock,
  useUpdateSettings: useUpdateSettingsMock,
}));

const SettingsPage = Route.options.component as ComponentType;

function renderPage() {
  return render(
    <App>
      <SettingsPage />
    </App>,
  );
}

beforeEach(() => {
  useSettingsMock.mockReturnValue({
    data: { showSidebarMenu: true },
    isLoading: false,
    error: null,
  });
  useUpdateSettingsMock.mockReturnValue({ mutate: vi.fn(), isPending: false });
});

afterEach(() => vi.clearAllMocks());

describe("Settings route", () => {
  it("shows a spinner while loading", () => {
    useSettingsMock.mockReturnValue({ data: undefined, isLoading: true, error: null });

    const { container } = renderPage();

    expect(container.querySelector(".ant-spin")).not.toBeNull();
  });

  it("shows an error message when settings fail to load", () => {
    useSettingsMock.mockReturnValue({ data: undefined, isLoading: false, error: new Error("x") });

    renderPage();

    expect(screen.getByText("Failed to load settings")).toBeInTheDocument();
  });

  it("reflects the current showSidebarMenu value on the switch", () => {
    renderPage();

    expect(screen.getByRole("switch")).toBeChecked();
  });

  it("toggles the setting off and notifies on success", async () => {
    const mutate = vi.fn((_vars, opts) => opts.onSuccess?.({ showSidebarMenu: false }));
    useUpdateSettingsMock.mockReturnValue({ mutate, isPending: false });

    renderPage();
    fireEvent.click(screen.getByRole("switch"));

    expect(mutate).toHaveBeenCalledWith({ showSidebarMenu: false }, expect.anything());
    expect(await screen.findByText("Setting saved")).toBeInTheDocument();

    const reload = vi.fn();
    Object.defineProperty(window.location, "reload", {
      configurable: true,
      value: reload,
    });
    fireEvent.click(screen.getByRole("button", { name: "Reload" }));
    expect(reload).toHaveBeenCalled();
  });

  it("shows an error toast when saving fails", async () => {
    const mutate = vi.fn((_vars, opts) => opts.onError?.(new Error("boom")));
    useUpdateSettingsMock.mockReturnValue({ mutate, isPending: false });

    renderPage();
    fireEvent.click(screen.getByRole("switch"));

    expect(await screen.findByText("Failed to save setting")).toBeInTheDocument();
  });
});
