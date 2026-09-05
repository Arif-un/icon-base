import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { RestRequestError, restRequest } from "./restRequest";

function mockFetch(impl: () => Partial<Response>) {
  const fn = vi.fn(() => Promise.resolve(impl() as Response));
  vi.stubGlobal("fetch", fn);

  return fn;
}

beforeEach(() => vi.unstubAllGlobals());
afterEach(() => vi.restoreAllMocks());

describe("restRequest", () => {
  it("performs a GET by default and returns the parsed JSON", async () => {
    const fetchFn = mockFetch(() => ({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ hi: 1 }),
    }));

    const data = await restRequest<{ hi: number }>("icons");

    expect(data).toEqual({ hi: 1 });
    const [url, opts] = fetchFn.mock.calls[0] as unknown as [URL, RequestInit];
    expect(url.toString()).toContain("/wp-json/IconIndexa/v1/icons");
    expect(opts.method).toBe("GET");
    expect((opts.headers as Record<string, string>)["X-WP-Nonce"]).toBe("test-rest-nonce");
    expect((opts.headers as Record<string, string>)["X-Icon-Indexa-Nonce"]).toBe("test-nonce");
    expect(opts.body).toBeUndefined();
  });

  it("encodes a body for non-GET methods, skipping null values and stringifying objects", async () => {
    const fetchFn = mockFetch(() => ({ ok: true, status: 200, json: () => Promise.resolve({}) }));

    await restRequest("icons", {
      method: "POST",
      body: { name: "x", meta: { a: 1 }, skip: null },
    });

    const [, opts] = fetchFn.mock.calls[0] as unknown as [URL, RequestInit];
    const body = opts.body as URLSearchParams;
    expect(body.get("name")).toBe("x");
    expect(body.get("meta")).toBe('{"a":1}');
    expect(body.has("skip")).toBe(false);
  });

  it("does not attach a body to a GET request", async () => {
    const fetchFn = mockFetch(() => ({ ok: true, status: 200, json: () => Promise.resolve({}) }));

    await restRequest("icons", { method: "GET", body: { name: "x" } });

    const [, opts] = fetchFn.mock.calls[0] as unknown as [URL, RequestInit];
    expect(opts.body).toBeUndefined();
  });

  it("throws RestRequestError with the payload when the response is not ok", async () => {
    mockFetch(() => ({ ok: false, status: 404, json: () => Promise.resolve({ message: "nope" }) }));

    await expect(restRequest("icons")).rejects.toMatchObject({
      status: 404,
      data: { message: "nope" },
    });
    await expect(restRequest("icons")).rejects.toBeInstanceOf(RestRequestError);
  });

  it("throws RestRequestError when the response body is not valid JSON", async () => {
    mockFetch(() => ({ ok: true, status: 200, json: () => Promise.reject(new Error("bad")) }));

    await expect(restRequest("icons")).rejects.toMatchObject({
      status: 200,
      data: "Invalid JSON response",
    });
  });
});
