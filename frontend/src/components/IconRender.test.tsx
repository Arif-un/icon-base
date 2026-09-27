import { act, render, waitFor } from "@testing-library/react";
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
  it("renders no svg while the svg is not yet loaded", () => {
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

  it("reserves a size x size placeholder while the svg is loading", () => {
    getSvgCacheMock.mockReturnValue(null);
    fetchSvgContentMock.mockReturnValue(new Promise(() => undefined));

    const { getByTestId, rerender } = render(<IconRender fileName="a" libraryDir="lib" />);
    const placeholder = getByTestId("icon-render-placeholder");
    expect(placeholder).toHaveStyle({ width: "24px", height: "24px" });
    expect(placeholder).toHaveAttribute("aria-hidden", "true");

    rerender(<IconRender fileName="a" libraryDir="lib" size={48} />);
    expect(getByTestId("icon-render-placeholder")).toHaveStyle({ width: "48px", height: "48px" });
  });

  it("swaps the placeholder for the svg once it loads", async () => {
    getSvgCacheMock.mockReturnValue(null);
    fetchSvgContentMock.mockResolvedValue('<path d="M0 0"/>');

    const { container, queryByTestId } = render(<IconRender fileName="a" libraryDir="lib" />);
    expect(queryByTestId("icon-render-placeholder")).not.toBeNull();

    await waitFor(() => expect(container.querySelector("svg.icon-render")).not.toBeNull());
    expect(queryByTestId("icon-render-placeholder")).toBeNull();
  });

  it("shows no placeholder on a cache hit", () => {
    getSvgCacheMock.mockReturnValue('<path d="M9 9"/>');

    const { queryByTestId } = render(<IconRender fileName="b" libraryDir="lib" />);

    expect(queryByTestId("icon-render-placeholder")).toBeNull();
  });

  it("keeps the placeholder after a failed fetch so the cell does not collapse", async () => {
    getSvgCacheMock.mockReturnValue(null);
    let rejectFetch!: (err: unknown) => void;
    fetchSvgContentMock.mockReturnValue(
      new Promise<string>((_resolve, reject) => {
        rejectFetch = reject;
      }),
    );

    const { getByTestId } = render(<IconRender fileName="e" libraryDir="lib" size={40} />);
    await act(async () => {
      rejectFetch(new Error("network"));
      await Promise.resolve();
    });

    expect(getByTestId("icon-render-placeholder")).toHaveStyle({ width: "40px", height: "40px" });
  });
});
