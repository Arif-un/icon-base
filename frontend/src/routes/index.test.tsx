import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ComponentType } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Route } from "./index";

const { useIconsMock, useLibrariesMock, useIconTypesMock } = vi.hoisted(() => ({
  useIconsMock: vi.fn(),
  useLibrariesMock: vi.fn(),
  useIconTypesMock: vi.fn(),
}));

vi.mock("@/common/hooks/useIcons", () => ({ useIcons: useIconsMock }));
vi.mock("@/common/hooks/useLibraries", () => ({ useLibraries: useLibrariesMock }));
vi.mock("@/common/hooks/useIconTypes", () => ({ useIconTypes: useIconTypesMock }));
// Debounce synchronously so filter/search state feeds useIcons within the same tick.
vi.mock("@/common/hooks/useDebounce", () => ({ useDebounce: (v: unknown) => v }));
vi.mock("@/components/IconRender", () => ({
  default: (props: { fileName: string; libraryDir: string; color?: string }) => (
    <div
      data-testid="icon-render"
      data-filename={props.fileName}
      data-librarydir={props.libraryDir}
      data-color={props.color ?? ""}
    />
  ),
}));

const Icons = Route.options.component as ComponentType;

const LIBRARIES = [
  { id: 1, slug: "antd", name: "Ant Design", meta: { w: 1024, h: 1024 } },
  { id: 2, slug: "feather", name: "Feather", meta: null },
];

const ICON_TYPES = [
  { id: 3, type: "outlined" },
  { id: 4, type: "filled" },
];

function iconsPage(overrides: Record<string, unknown> = {}) {
  return {
    items: [
      { id: 10, name: "arrow", filename: "arrow.svg", library_id: 1 },
      { id: 11, name: "menu", filename: "menu.svg", library_id: 999 },
    ],
    total: 2,
    page: 1,
    per_page: 100,
    total_pages: 1,
    ...overrides,
  };
}

function lastIconsArgs() {
  return useIconsMock.mock.calls.at(-1)?.[0] as {
    page: number;
    search: string;
    libraryIds: number[];
    typeIds: number[];
  };
}

beforeEach(() => {
  useIconsMock.mockReturnValue({ data: undefined, isLoading: false, error: null });
  useLibrariesMock.mockReturnValue({ data: undefined });
  useIconTypesMock.mockReturnValue({ data: undefined });
});

afterEach(() => vi.clearAllMocks());

describe("Icons route — data states", () => {
  it("shows a spinner while loading", () => {
    useIconsMock.mockReturnValue({ data: undefined, isLoading: true, error: null });

    const { container } = render(<Icons />);

    expect(container.querySelector(".ant-spin")).not.toBeNull();
  });

  it("shows an error message when the request fails", () => {
    useIconsMock.mockReturnValue({ data: undefined, isLoading: false, error: new Error("boom") });

    render(<Icons />);

    expect(screen.getByText("Failed to load icons")).toBeInTheDocument();
  });

  it("shows the empty state when no icons match and not loading", () => {
    useIconsMock.mockReturnValue({
      data: iconsPage({ items: [], total: 0 }),
      isLoading: false,
      error: null,
    });

    render(<Icons />);

    expect(screen.getByText("No icons found")).toBeInTheDocument();
  });

  it("renders the icon grid and resolves library dirs (falling back to empty for unknown libraries)", () => {
    useLibrariesMock.mockReturnValue({ data: LIBRARIES });
    useIconTypesMock.mockReturnValue({ data: ICON_TYPES });
    useIconsMock.mockReturnValue({ data: iconsPage(), isLoading: false, error: null });

    render(<Icons />);

    const rendered = screen.getAllByTestId("icon-render");
    expect(rendered).toHaveLength(2);
    // known library id 1 -> "001-antd", unknown library id 999 -> "" fallback
    expect(rendered[0]).toHaveAttribute("data-librarydir", "001-antd");
    expect(rendered[1]).toHaveAttribute("data-librarydir", "");
    // icon names shown as captions
    expect(screen.getByText("arrow")).toBeInTheDocument();
    expect(screen.getByText("menu")).toBeInTheDocument();
  });

  it("does not crash when libraries are undefined (empty library map)", () => {
    useIconsMock.mockReturnValue({ data: iconsPage(), isLoading: false, error: null });

    render(<Icons />);

    const rendered = screen.getAllByTestId("icon-render");
    expect(rendered[0]).toHaveAttribute("data-librarydir", "");
  });
});

describe("Icons route — search and filters", () => {
  it("updates the search term and resets to page 1", () => {
    render(<Icons />);

    const input = screen.getByPlaceholderText("Search icons...");
    fireEvent.change(input, { target: { value: "arrow" } });

    expect(lastIconsArgs().search).toBe("arrow");
    expect(lastIconsArgs().page).toBe(1);
  });

  it("selecting a library filter forwards its id and resets to page 1", async () => {
    useLibrariesMock.mockReturnValue({ data: LIBRARIES });
    render(<Icons />);

    const libSelect = screen.getByText("All Libraries").closest(".ant-select") as HTMLElement;
    fireEvent.mouseDown(libSelect);

    fireEvent.click(await screen.findByText("Ant Design"));

    await waitFor(() => expect(lastIconsArgs().libraryIds).toEqual([1]));
    expect(lastIconsArgs().page).toBe(1);
  });

  it("selecting a type filter forwards its id and resets to page 1", async () => {
    useIconTypesMock.mockReturnValue({ data: ICON_TYPES });
    render(<Icons />);

    const typeSelect = screen.getByText("All Types").closest(".ant-select") as HTMLElement;
    fireEvent.mouseDown(typeSelect);

    fireEvent.click(await screen.findByText("outlined"));

    await waitFor(() => expect(lastIconsArgs().typeIds).toEqual([3]));
    expect(lastIconsArgs().page).toBe(1);
  });
});

describe("Icons route — display controls", () => {
  it("increments the icon size via keyboard on the size slider", () => {
    render(<Icons />);

    const [sizeSlider] = screen.getAllByRole("slider");
    fireEvent.keyDown(sizeSlider, { key: "ArrowRight", keyCode: 39 });

    expect(sizeSlider).toHaveAttribute("aria-valuenow", "33");
  });

  it("increments the stroke width via keyboard on the stroke slider", () => {
    render(<Icons />);

    const strokeSlider = screen.getAllByRole("slider")[1];
    fireEvent.keyDown(strokeSlider, { key: "ArrowRight", keyCode: 39 });

    expect(strokeSlider).toHaveAttribute("aria-valuenow", "1.75");
  });

  it("applies a chosen hex color and then clears it back to the default", async () => {
    useLibrariesMock.mockReturnValue({ data: LIBRARIES });
    useIconsMock.mockReturnValue({ data: iconsPage(), isLoading: false, error: null });

    const { container } = render(<Icons />);

    // no color applied initially
    expect(screen.getAllByTestId("icon-render")[0]).toHaveAttribute("data-color", "");

    fireEvent.click(container.querySelector(".ant-color-picker-trigger")!);

    const hexInput = await waitFor(() => {
      const input = document.querySelector(
        ".ant-color-picker-input input, input.ant-color-picker-hex-input",
      );
      if (!input) throw new Error("hex input not ready");

      return input as HTMLInputElement;
    });
    fireEvent.change(hexInput, { target: { value: "ff0000" } });

    // onChange propagates the hex to the rendered icons
    await waitFor(() =>
      expect(screen.getAllByTestId("icon-render")[0].getAttribute("data-color")).not.toBe(""),
    );

    // The clear control resets the color (onClear). Prefer the panel's control (last one),
    // which is only active once a value is set.
    const clears = document.querySelectorAll(".ant-color-picker-clear");
    fireEvent.click(clears[clears.length - 1]);

    await waitFor(() =>
      expect(screen.getAllByTestId("icon-render")[0]).toHaveAttribute("data-color", ""),
    );
  });
});

describe("Icons route — pagination", () => {
  it("renders pagination only when total exceeds the page size and changes page", async () => {
    useIconsMock.mockReturnValue({
      data: iconsPage({ total: 250 }),
      isLoading: false,
      error: null,
    });

    render(<Icons />);

    // showTotal summary text
    expect(screen.getByText("1-100 of 250")).toBeInTheDocument();

    fireEvent.click(screen.getByTitle("2"));

    await waitFor(() => expect(lastIconsArgs().page).toBe(2));
  });

  it("hides pagination when total fits in a single page", () => {
    useIconsMock.mockReturnValue({ data: iconsPage({ total: 2 }), isLoading: false, error: null });

    const { container } = render(<Icons />);

    expect(container.querySelector(".ant-pagination")).toBeNull();
  });
});
