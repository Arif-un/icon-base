import { afterEach, describe, expect, it, vi } from "vitest";

import { queryClient } from "./constants";

describe("constants", () => {
  it("exposes a query client with the configured defaults", () => {
    const defaults = queryClient.getDefaultOptions().queries;
    expect(defaults?.staleTime).toBe(5 * 60 * 1000);
    expect(defaults?.refetchOnWindowFocus).toBe(false);
  });
});

describe("block registration", () => {
  afterEach(() => vi.restoreAllMocks());

  it("registers the icon-shelf/icon block with edit and save implementations", async () => {
    const spy = vi.fn((name: string, settings: unknown) => ({ name, settings }));
    (window as unknown as { wp: { blocks: { registerBlockType: unknown } } }).wp.blocks.registerBlockType = spy;

    // ./index runs registerBlockType as an import side-effect; it is imported nowhere else,
    // so a dynamic import here executes it exactly once against the spy above.
    await import("./index");

    expect(spy).toHaveBeenCalledWith(
      "icon-shelf/icon",
      expect.objectContaining({ edit: expect.any(Function), save: expect.any(Function) }),
    );
  });
});
