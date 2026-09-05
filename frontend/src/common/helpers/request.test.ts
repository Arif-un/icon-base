import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import queryRequest, { RequestError, proxyRequest, request } from "./request";

function mockFetch(impl: () => Partial<Response>) {
  const fn = vi.fn(() => Promise.resolve(impl() as Response));
  vi.stubGlobal("fetch", fn);
  return fn;
}

beforeEach(() => vi.unstubAllGlobals());
afterEach(() => vi.restoreAllMocks());

const ok = (data: unknown) => ({ ok: true, status: 200, json: () => Promise.resolve(data) });

describe("queryRequest", () => {
  it("builds the ajax url with the prefixed action and nonce", async () => {
    const fetchFn = mockFetch(() => ok({ code: "SUCCESS", data: {}, status: "success" }));

    await queryRequest("myaction");

    const [uri] = fetchFn.mock.calls[0] as unknown as [URL];
    expect(uri.searchParams.get("action")).toBe("ICON_INDEXA_myaction");
    expect(uri.searchParams.get("_ajax_nonce")).toBe("test-nonce");
  });

  it("appends query parameters", async () => {
    const fetchFn = mockFetch(() => ok({ code: "SUCCESS", data: {}, status: "success" }));

    await queryRequest("act", undefined, { page: 2, q: "arrow" });

    const [uri] = fetchFn.mock.calls[0] as unknown as [URL];
    expect(uri.searchParams.get("page")).toBe("2");
    expect(uri.searchParams.get("q")).toBe("arrow");
  });

  it("serialises a POST body, converting undefined to null", async () => {
    const fetchFn = mockFetch(() => ok({ code: "SUCCESS", data: {}, status: "success" }));

    await queryRequest("act", { a: undefined, b: 1 });

    const [, opts] = fetchFn.mock.calls[0] as unknown as [URL, RequestInit];
    expect(opts.body).toBe('{"a":null,"b":1}');
  });

  it("passes a FormData body through untouched", async () => {
    const fetchFn = mockFetch(() => ok({ code: "SUCCESS", data: {}, status: "success" }));
    const fd = new FormData();
    fd.append("f", "v");

    await queryRequest("act", fd);

    const [, opts] = fetchFn.mock.calls[0] as unknown as [URL, RequestInit];
    expect(opts.body).toBeInstanceOf(FormData);
  });

  it("rethrows the response payload on a non-ok response", async () => {
    const payload = { code: "ERROR", data: "bad", status: "error" };
    mockFetch(() => ({ ok: false, status: 400, json: () => Promise.resolve(payload) }));

    await expect(queryRequest("act")).rejects.toEqual(payload);
  });

  it("wraps a thrown network Error in a RequestError", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("offline"))));

    await expect(queryRequest("act")).rejects.toBeInstanceOf(RequestError);
  });
});

describe("request", () => {
  it("returns the data on success", async () => {
    mockFetch(() => ok({ code: "SUCCESS", data: { n: 1 }, status: "success" }));

    const res = await request<{ n: number }>("act");
    expect(res.data).toEqual({ n: 1 });
  });

  it("resolves to the error response when a RequestError is thrown", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("offline"))));

    const res = await request("act");
    expect(res.code).toBe("ERROR");
    expect(res.status).toBe("error");
  });

  it("resolves to the raw payload when a non-RequestError is thrown", async () => {
    const payload = { code: "VALIDATION", data: "invalid", status: "error" };
    mockFetch(() => ({ ok: false, status: 422, json: () => Promise.resolve(payload) }));

    const res = await request("act");
    expect(res).toEqual(payload);
  });
});

describe("proxyRequest", () => {
  it("posts to the proxy/route action", async () => {
    const fetchFn = mockFetch(() => ok({ code: "SUCCESS", data: {}, status: "success" }));

    await proxyRequest({ url: "https://x", method: "GET" });

    const [uri] = fetchFn.mock.calls[0] as unknown as [URL];
    expect(uri.searchParams.get("action")).toBe("ICON_INDEXA_proxy/route");
  });
});
