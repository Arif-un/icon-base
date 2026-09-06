import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { restRequest } from "@/common/helpers/restRequest";

import { useSettings, useUpdateSettings } from "./useSettings";

vi.mock("@/common/helpers/restRequest", () => ({ restRequest: vi.fn() }));
const restRequestMock = vi.mocked(restRequest);

function makeWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );

  return { client, wrapper };
}

beforeEach(() => restRequestMock.mockReset());
afterEach(() => vi.clearAllMocks());

describe("useSettings", () => {
  it("fetches settings and unwraps response.data", async () => {
    restRequestMock.mockResolvedValue({ data: { showSidebarMenu: true } });
    const { wrapper } = makeWrapper();

    const { result } = renderHook(() => useSettings(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({ showSidebarMenu: true });
    expect(restRequestMock.mock.calls.at(-1)?.[0]).toBe("settings");
  });
});

describe("useUpdateSettings", () => {
  it("POSTs the settings body and writes the response into the query cache", async () => {
    restRequestMock.mockResolvedValue({ data: { showSidebarMenu: false } });
    const { client, wrapper } = makeWrapper();

    const { result } = renderHook(() => useUpdateSettings(), { wrapper });

    result.current.mutate({ showSidebarMenu: false });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const [endpoint, options] = restRequestMock.mock.calls.at(-1)!;
    expect(endpoint).toBe("settings");
    expect(options).toMatchObject({ method: "POST", body: { showSidebarMenu: false } });
    expect(client.getQueryData(["settings"])).toEqual({ showSidebarMenu: false });
  });
});
