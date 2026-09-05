import { waitFor } from "@testing-library/dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { openMediaLibrary } from "./openMediaLibrary";

type Attachment = { subtype?: string; filename?: string; url?: string };

/** Wires window.wp.media to a fake frame and returns a fn that fires its "select" handler. */
function stubMediaFrame(attachment: Attachment) {
  let selectCb: (() => void) | undefined;
  const frame = {
    on: (evt: string, cb: () => void) => {
      if (evt === "select") selectCb = cb;
    },
    open: vi.fn(),
    state: () => ({ get: () => ({ first: () => ({ toJSON: () => attachment }) }) }),
  };
  (window as unknown as { wp: { media: () => unknown } }).wp.media = () => frame;

  return () => selectCb?.();
}

function mockFetch(impl: () => Partial<Response>) {
  vi.stubGlobal(
    "fetch",
    vi.fn(() => Promise.resolve(impl() as Response)),
  );
}

beforeEach(() => vi.unstubAllGlobals());
afterEach(() => vi.restoreAllMocks());

describe("openMediaLibrary", () => {
  it("selects a valid svg and reports the parsed dimensions", async () => {
    const fire = stubMediaFrame({ subtype: "svg+xml", filename: "i.svg", url: "https://x/i.svg" });
    mockFetch(() => ({
      ok: true,
      status: 200,
      text: () => Promise.resolve('<svg viewBox="0 0 48 48"><path d="M0 0h24v24H0z"/></svg>'),
    }));
    const onSuccess = vi.fn();
    const onError = vi.fn();

    openMediaLibrary(onSuccess, onError);
    fire();

    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    const [svg, width, height] = onSuccess.mock.calls[0] as [string, number, number];
    expect(svg).toContain("path");
    expect(width).toBe(48);
    expect(height).toBe(48);
    expect(onError).not.toHaveBeenCalled();
  });

  it("defaults to 24x24 when the svg has no viewBox", async () => {
    const fire = stubMediaFrame({ subtype: "svg+xml", filename: "i.svg", url: "https://x/i.svg" });
    mockFetch(() => ({
      ok: true,
      status: 200,
      text: () => Promise.resolve('<svg><path d="M0 0"/></svg>'),
    }));
    const onSuccess = vi.fn();

    openMediaLibrary(onSuccess, vi.fn());
    fire();

    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    const [, width, height] = onSuccess.mock.calls[0] as [string, number, number];
    expect(width).toBe(24);
    expect(height).toBe(24);
  });

  it("rejects a non-svg attachment before fetching", () => {
    const fire = stubMediaFrame({ subtype: "png", filename: "i.png" });
    const onError = vi.fn();

    openMediaLibrary(vi.fn(), onError);
    fire();

    expect(onError).toHaveBeenCalledWith("Selected file is not an SVG.");
  });

  it("reports a failed fetch", async () => {
    const fire = stubMediaFrame({ subtype: "svg+xml", filename: "i.svg", url: "https://x/i.svg" });
    mockFetch(() => ({ ok: false, status: 500, text: () => Promise.resolve("") }));
    const onError = vi.fn();

    openMediaLibrary(vi.fn(), onError);
    fire();

    await waitFor(() => expect(onError).toHaveBeenCalled());
    expect(onError.mock.calls[0][0]).toContain("Failed to fetch SVG");
  });

  it("reports markup that is not an svg", async () => {
    const fire = stubMediaFrame({ subtype: "svg+xml", filename: "i.svg", url: "https://x/i.svg" });
    mockFetch(() => ({ ok: true, status: 200, text: () => Promise.resolve("not svg at all") }));
    const onError = vi.fn();

    openMediaLibrary(vi.fn(), onError);
    fire();

    await waitFor(() => expect(onError).toHaveBeenCalled());
    expect(onError.mock.calls[0][0]).toContain("valid SVG markup");
  });

  it("reports an unsupported svg (embedded raster image)", async () => {
    const fire = stubMediaFrame({ subtype: "svg+xml", filename: "i.svg", url: "https://x/i.svg" });
    mockFetch(() => ({
      ok: true,
      status: 200,
      text: () => Promise.resolve('<svg><image xlink:href="data:image/png;base64,AAAA"/></svg>'),
    }));
    const onError = vi.fn();

    openMediaLibrary(vi.fn(), onError);
    fire();

    await waitFor(() => expect(onError).toHaveBeenCalled());
    expect(onError.mock.calls[0][0]).toContain("embedded image");
  });

  it("accepts a file whose subtype is not svg+xml but whose name ends in .svg", async () => {
    const fire = stubMediaFrame({
      subtype: "octet-stream",
      filename: "logo.svg",
      url: "https://x/logo.svg",
    });
    mockFetch(() => ({
      ok: true,
      status: 200,
      text: () => Promise.resolve('<svg><path d="M0 0"/></svg>'),
    }));
    const onSuccess = vi.fn();

    openMediaLibrary(onSuccess, vi.fn());
    fire();

    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
  });
});
