import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { fetchSvgContent } from "@/common/helpers/fetchSvgContent";
import config from "@/config/config";
import type { Icon, Library } from "@/types/icon";

import IconGrid from "./IconGrid";

// Stub IconRender so no real network fetch / effect runs. Forward the props IconGrid computes
// (libraryDir via libraryMap, w/h off library meta, size/stroke/color pass-through) so we can
// assert on them.
vi.mock("@/components/IconRender", () => ({
  default: (props: {
    fileName: string;
    libraryDir: string;
    iconWidth?: number;
    iconHeight?: number;
    size?: number;
    strokeWidth?: number;
    color?: string;
  }) =>
    React.createElement("span", {
      "data-testid": "icon-render",
      "data-file": props.fileName,
      "data-lib-dir": props.libraryDir,
      "data-w": props.iconWidth === undefined ? "undef" : String(props.iconWidth),
      "data-h": props.iconHeight === undefined ? "undef" : String(props.iconHeight),
      "data-size": String(props.size),
      "data-stroke": String(props.strokeWidth),
      "data-color": props.color,
    }),
}));

vi.mock("@/common/helpers/fetchSvgContent", () => ({
  fetchSvgContent: vi.fn().mockResolvedValue("<path d='m0 0'/>"),
  sanitizePathSegment: (s: string) => s,
  getSvgCache: () => null,
  sanitizeSvg: (s: string) => s,
}));

const fetchMock = vi.mocked(fetchSvgContent);

const icons: Icon[] = [
  { id: 1, name: "arrow", type_id: 1, tags: null, library_id: 10, filename: "arrow.svg" },
  { id: 2, name: "home", type_id: 1, tags: null, library_id: 20, filename: "home.svg" },
  { id: 3, name: "orphan", type_id: 1, tags: null, library_id: 99, filename: "orphan.svg" },
];

const libraries: Library[] = [
  { id: 10, slug: "lucide", name: "Lucide", meta: { w: 32, h: 48 } },
  { id: 20, slug: "feather", name: "Feather", meta: null },
];

function renderGrid(overrides: Partial<React.ComponentProps<typeof IconGrid>> = {}) {
  const props: React.ComponentProps<typeof IconGrid> = {
    icons,
    libraries,
    selectedIconId: 0,
    size: 24,
    strokeWidth: 1.5,
    color: "",
    onSelectIcon: vi.fn(),
    ...overrides,
  };

  return { ...render(<IconGrid {...props} />), props };
}

beforeEach(() => fetchMock.mockClear());
afterEach(() => vi.clearAllMocks());

describe("IconGrid", () => {
  it("renders a button per icon and maps library dir with zero-padded id", () => {
    renderGrid();

    expect(screen.getByTitle("arrow")).toBeInTheDocument();
    expect(screen.getByTitle("home")).toBeInTheDocument();
    expect(screen.getByTitle("orphan")).toBeInTheDocument();

    const renders = screen.getAllByTestId("icon-render");
    expect(renders[0]).toHaveAttribute("data-lib-dir", "010-lucide");
    expect(renders[1]).toHaveAttribute("data-lib-dir", "020-feather");
    // Orphan icon has no matching library -> libraryDir falls back to "".
    expect(renders[2]).toHaveAttribute("data-lib-dir", "");
  });

  it("forwards meta w/h to IconRender, and undefined when meta is missing", () => {
    renderGrid();
    const renders = screen.getAllByTestId("icon-render");

    expect(renders[0]).toHaveAttribute("data-w", "32");
    expect(renders[0]).toHaveAttribute("data-h", "48");
    // meta null -> lib.w / lib.h undefined
    expect(renders[1]).toHaveAttribute("data-w", "undef");
    expect(renders[1]).toHaveAttribute("data-h", "undef");
  });

  it("passes size / strokeWidth / color through to IconRender", () => {
    renderGrid({ size: 40, strokeWidth: 2.5, color: "#ff0000" });
    const render0 = screen.getAllByTestId("icon-render")[0];

    expect(render0).toHaveAttribute("data-size", "40");
    expect(render0).toHaveAttribute("data-stroke", "2.5");
    expect(render0).toHaveAttribute("data-color", "#ff0000");
  });

  it("renders an empty libraryMap and empty dirs when libraries is undefined", () => {
    renderGrid({ libraries: undefined });
    const renders = screen.getAllByTestId("icon-render");

    for (const r of renders) {
      expect(r).toHaveAttribute("data-lib-dir", "");
    }
  });

  it("marks the selected icon and leaves the rest unselected", () => {
    renderGrid({ selectedIconId: 1 });

    expect(screen.getByTitle("arrow").className).toContain("bg-[#e7f5fe]");
    expect(screen.getByTitle("arrow").className).toContain("border-[#007cba]");
    expect(screen.getByTitle("home").className).toContain("border-transparent");
    expect(screen.getByTitle("home").className).not.toContain("bg-[#e7f5fe]");
  });

  it("fetches the svg and calls onSelectIcon with meta dimensions on click", async () => {
    const onSelectIcon = vi.fn();
    renderGrid({ onSelectIcon });

    fireEvent.click(screen.getByTitle("arrow"));

    await waitFor(() => expect(onSelectIcon).toHaveBeenCalledOnce());
    expect(fetchMock).toHaveBeenCalledWith(config.ROOT_URL, "010-lucide", "arrow.svg");
    expect(onSelectIcon).toHaveBeenCalledWith({
      svgContent: "<path d='m0 0'/>",
      iconId: 1,
      iconName: "arrow",
      iconFilename: "arrow.svg",
      librarySlug: "lucide",
      libraryDir: "010-lucide",
      iconWidth: 32,
      iconHeight: 48,
    });
  });

  it("defaults width/height to 24 when the library has no meta", async () => {
    const onSelectIcon = vi.fn();
    renderGrid({ onSelectIcon });

    fireEvent.click(screen.getByTitle("home"));

    await waitFor(() => expect(onSelectIcon).toHaveBeenCalledOnce());
    expect(onSelectIcon).toHaveBeenCalledWith(
      expect.objectContaining({
        iconId: 2,
        librarySlug: "feather",
        libraryDir: "020-feather",
        iconWidth: 24,
        iconHeight: 24,
      }),
    );
  });

  it("does nothing on click when the icon has no matching library", async () => {
    const onSelectIcon = vi.fn();
    renderGrid({ onSelectIcon });

    fireEvent.click(screen.getByTitle("orphan"));

    // give any (mistaken) async work a tick to settle
    await Promise.resolve();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(onSelectIcon).not.toHaveBeenCalled();
  });
});
