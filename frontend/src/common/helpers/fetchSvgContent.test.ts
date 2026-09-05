import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  fetchSvgContent,
  getSvgCache,
  sanitizePathSegment,
  sanitizeSvg,
} from "./fetchSvgContent";

beforeEach(() => vi.unstubAllGlobals());
afterEach(() => vi.restoreAllMocks());

describe("sanitizePathSegment", () => {
  it("keeps alphanumerics, dots, dashes and underscores", () => {
    expect(sanitizePathSegment("ant-design_01.svg")).toBe("ant-design_01.svg");
  });

  it("strips path separators and other unsafe characters", () => {
    expect(sanitizePathSegment("a/b c?d")).toBe("abcd");
  });
});

describe("sanitizeSvg", () => {
  it("returns the inner markup of a safe svg fragment", () => {
    const result = sanitizeSvg('<path d="M0 0h24v24H0z"/>');
    expect(result).toContain("path");
    expect(result).toContain("M0 0h24v24H0z");
  });

  it("strips script content", () => {
    const result = sanitizeSvg('<script>alert(1)</script><path d="M0 0"/>');
    expect(result).not.toContain("<script>");
    expect(result).not.toContain("alert");
  });
});

describe("getSvgCache", () => {
  it("returns null for a path that has not been fetched", () => {
    expect(getSvgCache("never/fetched")).toBeNull();
  });
});

describe("fetchSvgContent", () => {
  it("fetches, sanitizes, caches and returns the svg body", async () => {
    const fetchFn = vi.fn(() =>
      Promise.resolve({ text: () => Promise.resolve('<path d="M1 1"/>') } as Response),
    );
    vi.stubGlobal("fetch", fetchFn);

    const result = await fetchSvgContent("https://root", "libA", "iconA");

    expect(result).toContain("path");
    expect(fetchFn).toHaveBeenCalledOnce();
    const [url] = fetchFn.mock.calls[0] as unknown as [string];
    expect(url).toBe("https://root/icons/libA/iconA");
    expect(getSvgCache("libA/iconA")).toBe(result);
  });

  it("serves a cached result without re-fetching", async () => {
    const fetchFn = vi.fn(() =>
      Promise.resolve({ text: () => Promise.resolve('<path d="M2 2"/>') } as Response),
    );
    vi.stubGlobal("fetch", fetchFn);

    await fetchSvgContent("https://root", "libB", "iconB");
    await fetchSvgContent("https://root", "libB", "iconB");

    expect(fetchFn).toHaveBeenCalledOnce();
  });
});
