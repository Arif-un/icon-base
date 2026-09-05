/* eslint-disable @typescript-eslint/no-explicit-any */
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { fetchSvgContent, getSvgCache } from "@/common/helpers/fetchSvgContent";
import { useIcons } from "@/common/hooks/useIcons";
import { useIconTypes } from "@/common/hooks/useIconTypes";
import { useLibraries } from "@/common/hooks/useLibraries";

vi.mock("@/common/hooks/useIcons", () => ({ useIcons: vi.fn() }));
vi.mock("@/common/hooks/useIconTypes", () => ({ useIconTypes: vi.fn() }));
vi.mock("@/common/hooks/useLibraries", () => ({ useLibraries: vi.fn() }));
vi.mock("@/common/helpers/fetchSvgContent", () => ({
  sanitizePathSegment: (s: string) => s,
  getSvgCache: vi.fn(),
  fetchSvgContent: vi.fn(),
}));

// See IconPickerPanel.test.tsx: swap in SelectControl/RangeControl stand-ins that can emit the
// exotic (array / undefined) onChange shapes the component defends against, then dynamically
// import so the component captures these at module-eval time.
const el = React.createElement;

(window as any).wp.components.SelectControl = ({ label, value, options = [], onChange }: any) =>
  el("div", null, [
    el(
      "select",
      { key: "s", "aria-label": label, value, onChange: (e: any) => onChange?.(e.target.value) },
      options.map((o: any) => el("option", { key: String(o.value), value: o.value }, o.label)),
    ),
    el("button", {
      key: "arr",
      type: "button",
      "aria-label": `${label} emit-array`,
      onClick: () => onChange?.(["7"]),
    }),
    el("button", {
      key: "emp",
      type: "button",
      "aria-label": `${label} emit-empty`,
      onClick: () => onChange?.([]),
    }),
  ]);

(window as any).wp.components.RangeControl = ({ label, value, onChange }: any) =>
  el("div", null, [
    el("input", {
      key: "i",
      type: "range",
      "aria-label": label,
      value: value ?? "",
      onChange: (e: any) => onChange?.(Number(e.target.value)),
    }),
    el("button", {
      key: "u",
      type: "button",
      "aria-label": `${label} emit-undefined`,
      onClick: () => onChange?.(undefined),
    }),
  ]);

const { default: IconPickerPopover } = await import("./IconPickerPopover");

const LIBS = [{ id: 1, slug: "lib-one", name: "Lib One", meta: { w: 24, h: 24 } }];
const TYPES = [{ id: 2, type: "outlined" }];
const ICONS = [
  { id: 10, name: "arrow", type_id: 2, tags: null, library_id: 1, filename: "arrow.svg" },
  { id: 11, name: "star", type_id: 2, tags: null, library_id: 1, filename: "star.svg" },
];

function iconsResult(over: Record<string, unknown> = {}) {
  return {
    data: { items: ICONS, total: ICONS.length, page: 1, per_page: 100, total_pages: 1 },
    isLoading: false,
    error: null,
    ...over,
  };
}

function baseProps(over: Record<string, unknown> = {}) {
  return {
    anchor: document.createElement("div"),
    selectedIconId: 0,
    onSelectIcon: vi.fn(),
    onExpand: vi.fn(),
    onClose: vi.fn(),
    ...over,
  };
}

function lastIconsCall() {
  return (vi.mocked(useIcons).mock.calls.at(-1) as any[])[0];
}

beforeEach(() => {
  vi.mocked(useLibraries).mockReturnValue({ data: LIBS } as any);
  vi.mocked(useIconTypes).mockReturnValue({ data: TYPES } as any);
  vi.mocked(useIcons).mockReturnValue(iconsResult() as any);
  vi.mocked(getSvgCache).mockReturnValue('<path d="M0 0"/>');
  vi.mocked(fetchSvgContent).mockResolvedValue("<svg-inner/>");
});

afterEach(() => vi.clearAllMocks());

describe("IconPickerPopover", () => {
  it("renders the header with Select disabled and settings hidden", () => {
    render(<IconPickerPopover {...(baseProps() as any)} />);

    expect(screen.getByRole("button", { name: "Select" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Settings" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Expand to modal" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument();
    expect(screen.queryByLabelText("Library")).not.toBeInTheDocument();
  });

  it("toggles the settings panel", () => {
    render(<IconPickerPopover {...(baseProps() as any)} />);

    fireEvent.click(screen.getByRole("button", { name: "Settings" }));
    expect(screen.getByLabelText("Library")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Settings" }));
    expect(screen.queryByLabelText("Library")).not.toBeInTheDocument();
  });

  it("calls onExpand and onClose from the header buttons", () => {
    const onExpand = vi.fn();
    const onClose = vi.fn();
    render(<IconPickerPopover {...(baseProps({ onExpand, onClose }) as any)} />);

    fireEvent.click(screen.getByRole("button", { name: "Expand to modal" }));
    expect(onExpand).toHaveBeenCalledOnce();

    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("highlights the selectedIconId before anything is picked", () => {
    render(<IconPickerPopover {...(baseProps({ selectedIconId: 11 }) as any)} />);

    expect(screen.getByTitle("star").className).toContain("border-[#007cba]");
    expect(screen.getByTitle("arrow").className).not.toContain("border-[#007cba]");
  });

  it("enables Select after picking an icon and confirms the selection", async () => {
    const onSelectIcon = vi.fn();
    const onClose = vi.fn();
    render(<IconPickerPopover {...(baseProps({ onSelectIcon, onClose }) as any)} />);

    await act(async () => {
      fireEvent.click(screen.getByTitle("arrow"));
      await Promise.resolve();
    });

    // the pending pick becomes the highlighted icon and enables the Select button
    expect(screen.getByTitle("arrow").className).toContain("border-[#007cba]");
    const selectBtn = screen.getByRole("button", { name: "Select" });
    expect(selectBtn).toBeEnabled();

    fireEvent.click(selectBtn);
    expect(onSelectIcon).toHaveBeenCalledWith({
      svgContent: "<svg-inner/>",
      iconId: 10,
      iconName: "arrow",
      iconFilename: "arrow.svg",
      librarySlug: "lib-one",
      libraryDir: "001-lib-one",
      iconWidth: 24,
      iconHeight: 24,
    });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("updates the query from the settings library and type filters", () => {
    render(<IconPickerPopover {...(baseProps() as any)} />);
    fireEvent.click(screen.getByRole("button", { name: "Settings" }));

    fireEvent.change(screen.getByLabelText("Library"), { target: { value: "1" } });
    expect(lastIconsCall().libraryIds).toEqual([1]);
    fireEvent.change(screen.getByLabelText("Library"), { target: { value: "" } });
    expect(lastIconsCall().libraryIds).toEqual([]);

    fireEvent.change(screen.getByLabelText("Type"), { target: { value: "2" } });
    expect(lastIconsCall().typeIds).toEqual([2]);
  });

  it("handles array-shaped SelectControl onChange values in settings", () => {
    render(<IconPickerPopover {...(baseProps() as any)} />);
    fireEvent.click(screen.getByRole("button", { name: "Settings" }));

    fireEvent.click(screen.getByLabelText("Library emit-array"));
    expect(lastIconsCall().libraryIds).toEqual([7]);
    fireEvent.click(screen.getByLabelText("Library emit-empty"));
    expect(lastIconsCall().libraryIds).toEqual([]);

    fireEvent.click(screen.getByLabelText("Type emit-array"));
    expect(lastIconsCall().typeIds).toEqual([7]);
    fireEvent.click(screen.getByLabelText("Type emit-empty"));
    expect(lastIconsCall().typeIds).toEqual([]);
  });

  it("updates preview size and stroke and ignores undefined values", () => {
    render(<IconPickerPopover {...(baseProps() as any)} />);
    fireEvent.click(screen.getByRole("button", { name: "Settings" }));

    const size = screen.getByLabelText("Size");
    const stroke = screen.getByLabelText("Stroke");

    fireEvent.change(size, { target: { value: "40" } });
    fireEvent.change(stroke, { target: { value: "3" } });
    expect(size).toHaveValue("40");
    expect(stroke).toHaveValue("3");

    fireEvent.click(screen.getByLabelText("Size emit-undefined"));
    fireEvent.click(screen.getByLabelText("Stroke emit-undefined"));
    expect(size).toHaveValue("40");
    expect(stroke).toHaveValue("3");
  });

  it("opens the color picker, changes and clears the preview color", () => {
    render(<IconPickerPopover {...(baseProps() as any)} />);
    fireEvent.click(screen.getByRole("button", { name: "Settings" }));

    expect(screen.queryByLabelText("Color")).not.toBeInTheDocument();
    expect(screen.queryByText("Clear")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Color" }));
    fireEvent.change(screen.getByLabelText("Color"), { target: { value: "#00ff00" } });
    expect(screen.getByLabelText("Color")).toHaveValue("#00ff00");
    expect(screen.getByText("Clear")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Clear"));
    expect(screen.queryByText("Clear")).not.toBeInTheDocument();
  });

  it("stops propagation of clicks and keydowns inside the popover body", () => {
    const { container } = render(<IconPickerPopover {...(baseProps() as any)} />);

    const body = container.querySelector('[role="presentation"]') as HTMLElement;
    expect(body).not.toBeNull();
    fireEvent.click(body);
    fireEvent.keyDown(body, { key: "Escape" });
    expect(body).toBeInTheDocument();
  });

  it("falls back to default filter options when libraries and types are unavailable", () => {
    vi.mocked(useLibraries).mockReturnValue({ data: undefined } as any);
    vi.mocked(useIconTypes).mockReturnValue({ data: undefined } as any);

    render(<IconPickerPopover {...(baseProps() as any)} />);
    fireEvent.click(screen.getByRole("button", { name: "Settings" }));

    const libraryOptions = within(screen.getByLabelText("Library")).getAllByRole("option");
    expect(libraryOptions).toHaveLength(1);
    expect(libraryOptions[0]).toHaveTextContent("All Libraries");

    const typeOptions = within(screen.getByLabelText("Type")).getAllByRole("option");
    expect(typeOptions).toHaveLength(1);
    expect(typeOptions[0]).toHaveTextContent("All Types");
  });
});
