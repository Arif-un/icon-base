/* eslint-disable @typescript-eslint/no-explicit-any */
import { fireEvent, render, screen, within } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useIcons } from "@/common/hooks/useIcons";
import { useIconTypes } from "@/common/hooks/useIconTypes";
import { useLibraries } from "@/common/hooks/useLibraries";

// @wordpress/icons ships pre-built elements from its own React copy, which React 19 rejects when
// rendered directly. The modal only needs the decorative `close` glyph.
vi.mock("@wordpress/icons", () => ({ close: null }));
vi.mock("@/common/hooks/useIcons", () => ({ useIcons: vi.fn() }));
vi.mock("@/common/hooks/useIconTypes", () => ({ useIconTypes: vi.fn() }));
vi.mock("@/common/hooks/useLibraries", () => ({ useLibraries: vi.fn() }));
// Collapse the debounce so a search keystroke reaches the hook synchronously.
vi.mock("@/common/hooks/useDebounce", () => ({ useDebounce: (v: any) => v }));

const el = React.createElement;

// Stub IconGrid: surface the computed preview props and emit a pick on click.
const PICKED = {
  svgContent: "<path/>",
  iconId: 42,
  iconName: "star",
  iconFilename: "star.svg",
  librarySlug: "lucide",
  libraryDir: "010-lucide",
  iconWidth: 24,
  iconHeight: 24,
};

vi.mock("./IconGrid", () => ({
  default: (props: any) =>
    el(
      "button",
      {
        "data-testid": "grid",
        "data-selected": String(props.selectedIconId),
        "data-size": String(props.size),
        "data-stroke": String(props.strokeWidth),
        "data-color": props.color,
        onClick: () => props.onSelectIcon(PICKED),
      },
      "grid",
    ),
}));

// Swap in SelectControl / RangeControl stand-ins that can additionally emit the exotic
// (array / undefined) onChange shapes the modal defends against, then dynamically import so the
// component captures these at module-eval time (mirrors IconPickerPopover.test.tsx).
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

const { default: IconPickerModal } = await import("./IconPickerModal");

const LIBS = [
  { id: 1, slug: "lucide", name: "Lucide", meta: { w: 24, h: 24 } },
  { id: 2, slug: "feather", name: "Feather", meta: null },
];
const TYPES = [
  { id: 1, type: "outline" },
  { id: 2, type: "solid" },
];

function iconsData(over: Record<string, unknown> = {}) {
  return {
    items: [{ id: 42, name: "star", type_id: 1, tags: null, library_id: 1, filename: "star.svg" }],
    total: 5,
    page: 1,
    per_page: 100,
    total_pages: 1,
    ...over,
  };
}

function setIcons(over: Record<string, unknown> = {}) {
  vi.mocked(useIcons).mockReturnValue({
    data: iconsData(),
    isLoading: false,
    error: null,
    ...over,
  } as any);
}

function baseProps(over: Record<string, unknown> = {}) {
  return { selectedIconId: 7, onSelectIcon: vi.fn(), onClose: vi.fn(), ...over };
}

function lastIconsCall() {
  return (vi.mocked(useIcons).mock.calls.at(-1) as any[])[0];
}

beforeEach(() => {
  vi.mocked(useLibraries).mockReturnValue({ data: LIBS } as any);
  vi.mocked(useIconTypes).mockReturnValue({ data: TYPES } as any);
  setIcons();
});

afterEach(() => vi.clearAllMocks());

describe("IconPickerModal states", () => {
  it("shows a spinner while loading and hides the grid", () => {
    setIcons({ data: undefined, isLoading: true });
    render(<IconPickerModal {...(baseProps() as any)} />);

    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.queryByTestId("grid")).not.toBeInTheDocument();
  });

  it("shows an error message when the request fails", () => {
    setIcons({ data: undefined, error: new Error("boom") });
    render(<IconPickerModal {...(baseProps() as any)} />);

    expect(screen.getByText("Failed to load icons")).toBeInTheDocument();
    expect(screen.queryByTestId("grid")).not.toBeInTheDocument();
  });

  it("shows an empty message and no pagination when there are no results", () => {
    setIcons({ data: iconsData({ items: [], total: 0, total_pages: 0 }) });
    render(<IconPickerModal {...(baseProps() as any)} />);

    expect(screen.getByText("No icons found")).toBeInTheDocument();
    expect(screen.queryByText("Next")).not.toBeInTheDocument();
  });

  it("renders the grid with the current preview settings and selected id", () => {
    render(<IconPickerModal {...(baseProps({ selectedIconId: 7 }) as any)} />);

    const grid = screen.getByTestId("grid");
    expect(grid).toHaveAttribute("data-selected", "7");
    expect(grid).toHaveAttribute("data-size", "24");
    expect(grid).toHaveAttribute("data-stroke", "1.5");
    expect(grid).toHaveAttribute("data-color", "");
  });
});

describe("IconPickerModal selection", () => {
  it("enables Add Icon after a pick and commits it on click", () => {
    const onSelectIcon = vi.fn();
    const onClose = vi.fn();
    render(<IconPickerModal {...(baseProps({ onSelectIcon, onClose }) as any)} />);

    const add = screen.getByRole("button", { name: "Add Icon" });
    expect(add).toBeDisabled();

    fireEvent.click(screen.getByTestId("grid"));

    // the pending pick drives the highlighted id and enables Add Icon
    expect(screen.getByTestId("grid")).toHaveAttribute("data-selected", "42");
    expect(add).toBeEnabled();

    fireEvent.click(add);
    expect(onSelectIcon).toHaveBeenCalledWith(PICKED);
    expect(onClose).toHaveBeenCalledOnce();
  });
});

describe("IconPickerModal filters", () => {
  it("builds library/type options and filters icons by them", () => {
    render(<IconPickerModal {...(baseProps() as any)} />);

    expect(screen.getByRole("option", { name: "All Libraries" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Lucide" })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Library"), { target: { value: "1" } });
    expect(lastIconsCall().libraryIds).toEqual([1]);
    expect(lastIconsCall().page).toBe(1);

    fireEvent.change(screen.getByLabelText("Library"), { target: { value: "" } });
    expect(lastIconsCall().libraryIds).toEqual([]);

    expect(screen.getByRole("option", { name: "All Types" })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Type"), { target: { value: "2" } });
    expect(lastIconsCall().typeIds).toEqual([2]);
    fireEvent.change(screen.getByLabelText("Type"), { target: { value: "" } });
    expect(lastIconsCall().typeIds).toEqual([]);
  });

  it("handles array-shaped SelectControl onChange values", () => {
    render(<IconPickerModal {...(baseProps() as any)} />);

    fireEvent.click(screen.getByLabelText("Library emit-array"));
    expect(lastIconsCall().libraryIds).toEqual([7]);
    fireEvent.click(screen.getByLabelText("Library emit-empty"));
    expect(lastIconsCall().libraryIds).toEqual([]);

    fireEvent.click(screen.getByLabelText("Type emit-array"));
    expect(lastIconsCall().typeIds).toEqual([7]);
    fireEvent.click(screen.getByLabelText("Type emit-empty"));
    expect(lastIconsCall().typeIds).toEqual([]);
  });

  it("falls back to bare options when libraries/types are undefined", () => {
    vi.mocked(useLibraries).mockReturnValue({ data: undefined } as any);
    vi.mocked(useIconTypes).mockReturnValue({ data: undefined } as any);
    render(<IconPickerModal {...(baseProps() as any)} />);

    const libOptions = within(screen.getByLabelText("Library")).getAllByRole("option");
    expect(libOptions).toHaveLength(1);
    expect(libOptions[0]).toHaveTextContent("All Libraries");

    const typeOptions = within(screen.getByLabelText("Type")).getAllByRole("option");
    expect(typeOptions).toHaveLength(1);
    expect(typeOptions[0]).toHaveTextContent("All Types");
  });

  it("passes the debounced search term to the hook and resets the page", () => {
    render(<IconPickerModal {...(baseProps() as any)} />);

    fireEvent.change(screen.getByPlaceholderText("Search icons…"), { target: { value: "arrow" } });

    expect(lastIconsCall().search).toBe("arrow");
    expect(lastIconsCall().page).toBe(1);
  });
});

describe("IconPickerModal preview controls", () => {
  it("updates size and stroke and ignores undefined values", () => {
    render(<IconPickerModal {...(baseProps() as any)} />);

    fireEvent.change(screen.getByLabelText("Size"), { target: { value: "40" } });
    expect(screen.getByTestId("grid")).toHaveAttribute("data-size", "40");

    fireEvent.change(screen.getByLabelText("Stroke"), { target: { value: "3" } });
    expect(screen.getByTestId("grid")).toHaveAttribute("data-stroke", "3");

    fireEvent.click(screen.getByLabelText("Size emit-undefined"));
    fireEvent.click(screen.getByLabelText("Stroke emit-undefined"));
    expect(screen.getByTestId("grid")).toHaveAttribute("data-size", "40");
    expect(screen.getByTestId("grid")).toHaveAttribute("data-stroke", "3");
  });

  it("toggles the color picker, applies and clears a color", () => {
    render(<IconPickerModal {...(baseProps() as any)} />);

    expect(screen.queryByLabelText("Color")).not.toBeInTheDocument();
    expect(screen.queryByText("Clear")).not.toBeInTheDocument();

    fireEvent.click(screen.getByText("Pick color"));
    expect(screen.getByLabelText("Color")).toHaveValue("#000000");

    fireEvent.change(screen.getByLabelText("Color"), { target: { value: "#ff0000" } });
    expect(screen.getByTestId("grid")).toHaveAttribute("data-color", "#ff0000");
    expect(screen.getByText("#ff0000")).toBeInTheDocument();
    expect(screen.getByLabelText("Color")).toHaveValue("#ff0000");

    fireEvent.click(screen.getByText("Clear"));
    expect(screen.queryByText("Clear")).not.toBeInTheDocument();
    expect(screen.getByTestId("grid")).toHaveAttribute("data-color", "");
    // picker stays open, back to the default color
    expect(screen.getByLabelText("Color")).toHaveValue("#000000");

    fireEvent.click(screen.getByText("Pick color"));
    expect(screen.queryByLabelText("Color")).not.toBeInTheDocument();
  });
});

describe("IconPickerModal pagination", () => {
  it("steps through pages and disables the ends", () => {
    setIcons({ data: iconsData({ total: 250, total_pages: 3 }) });
    render(<IconPickerModal {...(baseProps() as any)} />);

    expect(screen.getByText("1 / 3")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Previous" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Next" })).toBeEnabled();

    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(lastIconsCall().page).toBe(2);
    expect(screen.getByText("2 / 3")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Previous" })).toBeEnabled();

    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(lastIconsCall().page).toBe(3);
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Previous" }));
    expect(lastIconsCall().page).toBe(2);
  });
});

describe("IconPickerModal close", () => {
  it("closes from the header button", () => {
    const onClose = vi.fn();
    render(<IconPickerModal {...(baseProps({ onClose }) as any)} />);

    fireEvent.click(screen.getByTitle("Close"));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("closes from the modal onRequestClose control", () => {
    const onClose = vi.fn();
    render(<IconPickerModal {...(baseProps({ onClose }) as any)} />);

    fireEvent.click(screen.getByLabelText("Close"));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
