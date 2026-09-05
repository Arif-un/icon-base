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

// The shared test.setup stubs SelectControl/RangeControl to always call onChange with a
// string / Number, so the value-first defensive branches in the component (array-shaped
// SelectControl values, undefined RangeControl values) are unreachable through it. We swap
// in faithful stand-ins that additionally expose buttons which emit those exotic shapes, then
// dynamically import the component so it captures these versions at module-eval time.
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

const { default: IconPickerPanel } = await import("./IconPickerPanel");

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
    selectedIconId: 0,
    size: 24,
    strokeWidth: 1.5,
    color: "",
    onSelectIcon: vi.fn(),
    onSizeChange: vi.fn(),
    onStrokeWidthChange: vi.fn(),
    onColorChange: vi.fn(),
    compact: true,
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

describe("IconPickerPanel", () => {
  it("shows a spinner while the icons query is loading", () => {
    vi.mocked(useIcons).mockReturnValue(iconsResult({ data: undefined, isLoading: true }) as any);

    render(<IconPickerPanel {...(baseProps() as any)} />);

    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.queryByText("No icons found")).not.toBeInTheDocument();
    expect(screen.queryByTitle("arrow")).not.toBeInTheDocument();
  });

  it("renders the empty state when the query returns no icons", () => {
    vi.mocked(useIcons).mockReturnValue(
      iconsResult({ data: { items: [], total: 0, page: 1, per_page: 100, total_pages: 0 } }) as any,
    );

    render(<IconPickerPanel {...(baseProps() as any)} />);

    expect(screen.getByText("No icons found")).toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("renders the error state when the query fails", () => {
    vi.mocked(useIcons).mockReturnValue(
      iconsResult({ data: undefined, error: new Error("boom") }) as any,
    );

    render(<IconPickerPanel {...(baseProps() as any)} />);

    expect(screen.getByText("Failed to load icons")).toBeInTheDocument();
    expect(screen.queryByTitle("arrow")).not.toBeInTheDocument();
  });

  it("renders a grid and forwards the resolved icon data on select", async () => {
    const onSelectIcon = vi.fn();
    render(<IconPickerPanel {...(baseProps({ onSelectIcon }) as any)} />);

    expect(screen.getByTitle("arrow")).toBeInTheDocument();
    expect(screen.getByTitle("star")).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByTitle("arrow"));
      await Promise.resolve();
    });

    expect(fetchSvgContent).toHaveBeenCalledWith(expect.any(String), "001-lib-one", "arrow.svg");
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
  });

  it("highlights the currently selected icon", () => {
    render(<IconPickerPanel {...(baseProps({ selectedIconId: 10 }) as any)} />);

    expect(screen.getByTitle("arrow").className).toContain("border-[#007cba]");
    expect(screen.getByTitle("star").className).not.toContain("border-[#007cba]");
  });

  it("filters by library and type using internal state", () => {
    render(<IconPickerPanel {...(baseProps() as any)} />);

    fireEvent.change(screen.getByLabelText("Library"), { target: { value: "1" } });
    expect(lastIconsCall().libraryIds).toEqual([1]);

    fireEvent.change(screen.getByLabelText("Library"), { target: { value: "" } });
    expect(lastIconsCall().libraryIds).toEqual([]);

    fireEvent.change(screen.getByLabelText("Type"), { target: { value: "2" } });
    expect(lastIconsCall().typeIds).toEqual([2]);

    fireEvent.change(screen.getByLabelText("Type"), { target: { value: "" } });
    expect(lastIconsCall().typeIds).toEqual([]);
  });

  it("handles array-shaped SelectControl onChange values", () => {
    render(<IconPickerPanel {...(baseProps() as any)} />);

    fireEvent.click(screen.getByLabelText("Library emit-array"));
    expect(lastIconsCall().libraryIds).toEqual([7]);
    fireEvent.click(screen.getByLabelText("Library emit-empty"));
    expect(lastIconsCall().libraryIds).toEqual([]);

    fireEvent.click(screen.getByLabelText("Type emit-array"));
    expect(lastIconsCall().typeIds).toEqual([7]);
    fireEvent.click(screen.getByLabelText("Type emit-empty"));
    expect(lastIconsCall().typeIds).toEqual([]);
  });

  it("fires size and stroke callbacks and ignores undefined values", () => {
    const onSizeChange = vi.fn();
    const onStrokeWidthChange = vi.fn();
    render(<IconPickerPanel {...(baseProps({ onSizeChange, onStrokeWidthChange }) as any)} />);

    fireEvent.change(screen.getByLabelText("Size"), { target: { value: "40" } });
    fireEvent.change(screen.getByLabelText("Stroke"), { target: { value: "3" } });
    expect(onSizeChange).toHaveBeenCalledWith(40);
    expect(onStrokeWidthChange).toHaveBeenCalledWith(3);

    fireEvent.click(screen.getByLabelText("Size emit-undefined"));
    fireEvent.click(screen.getByLabelText("Stroke emit-undefined"));
    expect(onSizeChange).toHaveBeenCalledTimes(1);
    expect(onStrokeWidthChange).toHaveBeenCalledTimes(1);
  });

  it("opens the color picker and emits color changes", () => {
    const onColorChange = vi.fn();
    render(<IconPickerPanel {...(baseProps({ color: "", onColorChange }) as any)} />);

    expect(screen.queryByLabelText("Color")).not.toBeInTheDocument();
    expect(screen.queryByText("Clear")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Color" }));
    fireEvent.change(screen.getByLabelText("Color"), { target: { value: "#ff0000" } });
    expect(onColorChange).toHaveBeenCalledWith("#ff0000");
  });

  it("shows the clear button and clears the color when a color is set", () => {
    const onColorChange = vi.fn();
    render(<IconPickerPanel {...(baseProps({ color: "#123456", onColorChange }) as any)} />);

    // open the picker so the `color || "#000000"` truthy branch is exercised
    fireEvent.click(screen.getByRole("button", { name: "Color" }));
    expect(screen.getByLabelText("Color")).toHaveValue("#123456");

    fireEvent.click(screen.getByText("Clear"));
    expect(onColorChange).toHaveBeenCalledWith("");
  });

  it("paginates when there is more than one page of results", () => {
    vi.mocked(useIcons).mockReturnValue(
      iconsResult({
        data: { items: ICONS, total: 250, page: 1, per_page: 100, total_pages: 3 },
      }) as any,
    );

    render(<IconPickerPanel {...(baseProps() as any)} />);

    expect(screen.getByText("1 / 3")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Previous" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Next" })).toBeEnabled();

    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByText("2 / 3")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Previous" })).toBeEnabled();

    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByText("3 / 3")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Previous" }));
    expect(screen.getByText("2 / 3")).toBeInTheDocument();
  });

  it("hides internal filters in external mode and defaults missing typeIds", () => {
    render(
      <IconPickerPanel
        {...(baseProps({
          libraryIds: ["1"],
          onLibraryIdsChange: vi.fn(),
        }) as any)}
      />,
    );

    expect(screen.queryByLabelText("Library")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Size")).not.toBeInTheDocument();
    expect(lastIconsCall().libraryIds).toEqual([1]);
    expect(lastIconsCall().typeIds).toEqual([]);
  });

  it("resets the page to 1 when external filters change", () => {
    const props = baseProps({
      libraryIds: ["1"],
      typeIds: ["2"],
      onLibraryIdsChange: vi.fn(),
      onTypeIdsChange: vi.fn(),
    });
    vi.mocked(useIcons).mockReturnValue(
      iconsResult({
        data: { items: ICONS, total: 250, page: 1, per_page: 100, total_pages: 3 },
      }) as any,
    );

    const { rerender } = render(<IconPickerPanel {...(props as any)} />);
    expect(lastIconsCall().typeIds).toEqual([2]);

    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByText("2 / 3")).toBeInTheDocument();

    rerender(<IconPickerPanel {...{ ...props, libraryIds: ["1", "3"] }} />);
    expect(screen.getByText("1 / 3")).toBeInTheDocument();
    expect(lastIconsCall().libraryIds).toEqual([1, 3]);
  });

  it("omits max-height and applies a custom className when not compact", () => {
    const { container } = render(
      <IconPickerPanel {...(baseProps({ compact: false, className: "my-panel" }) as any)} />,
    );

    const root = container.firstChild as HTMLElement;
    expect(root.className).toContain("my-panel");
    expect(root.className).not.toContain("max-h-110");
  });

  it("falls back to default filter options when libraries and types are unavailable", () => {
    vi.mocked(useLibraries).mockReturnValue({ data: undefined } as any);
    vi.mocked(useIconTypes).mockReturnValue({ data: undefined } as any);

    render(<IconPickerPanel {...(baseProps() as any)} />);

    const libraryOptions = within(screen.getByLabelText("Library")).getAllByRole("option");
    expect(libraryOptions).toHaveLength(1);
    expect(libraryOptions[0]).toHaveTextContent("All Libraries");

    const typeOptions = within(screen.getByLabelText("Type")).getAllByRole("option");
    expect(typeOptions).toHaveLength(1);
    expect(typeOptions[0]).toHaveTextContent("All Types");
  });

  it("debounces the search input before it reaches the query", () => {
    vi.useFakeTimers();
    try {
      render(<IconPickerPanel {...(baseProps() as any)} />);

      fireEvent.change(screen.getByPlaceholderText("Search icons..."), {
        target: { value: "arrow" },
      });
      expect(lastIconsCall().search).toBe("");

      act(() => {
        vi.advanceTimersByTime(300);
      });
      expect(lastIconsCall().search).toBe("arrow");
    } finally {
      vi.useRealTimers();
    }
  });
});
