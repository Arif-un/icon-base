import { render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { fetchSvgContent, getSvgCache } from "@/common/helpers/fetchSvgContent";

import IconRender from "./IconRender";

vi.mock("@/common/helpers/fetchSvgContent", () => ({
  sanitizePathSegment: (s: string) => s,
  getSvgCache: vi.fn(),
  fetchSvgContent: vi.fn(),
}));

const getSvgCacheMock = vi.mocked(getSvgCache);
const fetchSvgContentMock = vi.mocked(fetchSvgContent);

beforeEach(() => {
  getSvgCacheMock.mockReset();
  fetchSvgContentMock.mockReset();
});
afterEach(() => vi.clearAllMocks());

describe("IconRender", () => {
  it("renders nothing while the svg is not yet loaded", () => {
    getSvgCacheMock.mockReturnValue(null);
    fetchSvgContentMock.mockReturnValue(new Promise(() => undefined));

    const { container } = render(<IconRender fileName="a" libraryDir="lib" />);
    expect(container.querySelector("svg")).toBeNull();
  });

  it("fetches and renders the svg on a cache miss", async () => {
    getSvgCacheMock.mockReturnValue(null);
    fetchSvgContentMock.mockResolvedValue('<path d="M0 0"/>');

    const { container } = render(
      <IconRender
        fileName="a"
        libraryDir="lib"
        size={32}
        iconWidth={48}
        iconHeight={48}
        color="red"
        strokeWidth={2}
      />,
    );

    await waitFor(() => expect(container.querySelector("svg.icon-render")).not.toBeNull());
    const svg = container.querySelector("svg.icon-render")!;
    expect(svg.getAttribute("viewBox")).toBe("0 0 48 48");
    expect(svg.getAttribute("width")).toBe("32");
    expect(svg.innerHTML).toContain("path");
    expect(fetchSvgContentMock).toHaveBeenCalledOnce();
  });

  it("renders immediately from cache without fetching", () => {
    getSvgCacheMock.mockReturnValue('<path d="M9 9"/>');

    const { container } = render(<IconRender fileName="b" libraryDir="lib" />);

    expect(container.querySelector("svg.icon-render")).not.toBeNull();
    expect(fetchSvgContentMock).not.toHaveBeenCalled();
  });

  it("uses default viewBox dimensions when none are supplied", () => {
    getSvgCacheMock.mockReturnValue('<path d="M0 0"/>');

    const { container } = render(<IconRender fileName="c" libraryDir="lib" />);

    const svg = container.querySelector("svg.icon-render")!;
    expect(svg.getAttribute("viewBox")).toBe("0 0 1024 1024");
  });

  it("re-reads the cache when the icon path changes between renders", () => {
    getSvgCacheMock.mockImplementation((p: string) =>
      p === "lib/second" ? '<path d="M5 5"/>' : null,
    );
    fetchSvgContentMock.mockReturnValue(new Promise(() => undefined));

    const { container, rerender } = render(<IconRender fileName="first" libraryDir="lib" />);
    expect(container.querySelector("svg")).toBeNull();

    rerender(<IconRender fileName="second" libraryDir="lib" />);
    expect(container.querySelector("svg.icon-render")).not.toBeNull();
  });

  it("swallows an AbortError from an in-flight fetch", async () => {
    getSvgCacheMock.mockReturnValue(null);
    fetchSvgContentMock.mockRejectedValue(new DOMException("aborted", "AbortError"));

    const { container } = render(<IconRender fileName="d" libraryDir="lib" />);

    await waitFor(() => expect(fetchSvgContentMock).toHaveBeenCalled());
    expect(container.querySelector("svg")).toBeNull();
  });

  it("ignores a non-abort rejection without rendering", async () => {
    getSvgCacheMock.mockReturnValue(null);
    fetchSvgContentMock.mockRejectedValue(new Error("network"));

    const { container } = render(<IconRender fileName="e" libraryDir="lib" />);

    await waitFor(() => expect(fetchSvgContentMock).toHaveBeenCalled());
    expect(container.querySelector("svg")).toBeNull();
  });
});
