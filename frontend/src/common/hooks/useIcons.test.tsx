import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { restRequest } from "@/common/helpers/restRequest";

import { useIcons } from "./useIcons";
import { useIconTypes } from "./useIconTypes";
import { useLibraries } from "./useLibraries";

vi.mock("@/common/helpers/restRequest", () => ({ restRequest: vi.fn() }));
const restRequestMock = vi.mocked(restRequest);

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

function lastUrl() {
  return restRequestMock.mock.calls.at(-1)?.[0] ?? "";
}

beforeEach(() => restRequestMock.mockReset());
afterEach(() => vi.clearAllMocks());

describe("useIcons", () => {
  it("requests the default first page and unwraps response.data", async () => {
    const page = { items: [{ id: 1 }], total: 1, page: 1, per_page: 100, total_pages: 1 };
    restRequestMock.mockResolvedValue({ data: page });

    const { result } = renderHook(() => useIcons(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(page);
    expect(lastUrl()).toContain("page=1");
    expect(lastUrl()).toContain("per_page=100");
    expect(lastUrl()).not.toContain("search=");
  });

  it("includes search, library and type filters when provided", async () => {
    restRequestMock.mockResolvedValue({ data: { items: [] } });

    const { result } = renderHook(
      () => useIcons({ page: 2, perPage: 50, search: "arrow", libraryIds: [1, 2], typeIds: [3] }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const url = lastUrl();
    expect(url).toContain("page=2");
    expect(url).toContain("per_page=50");
    expect(url).toContain("search=arrow");
    expect(url).toContain("library_ids=1%2C2");
    expect(url).toContain("type_ids=3");
  });
});

describe("useIconTypes", () => {
  it("fetches icon types and unwraps the data", async () => {
    restRequestMock.mockResolvedValue({ data: [{ id: 1, type: "outlined" }] });

    const { result } = renderHook(() => useIconTypes(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([{ id: 1, type: "outlined" }]);
    expect(lastUrl()).toBe("icon-types");
  });
});

describe("useLibraries", () => {
  it("fetches libraries and unwraps the data", async () => {
    restRequestMock.mockResolvedValue({ data: [{ id: 1, slug: "antd", name: "Ant Design" }] });

    const { result } = renderHook(() => useLibraries(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(1);
    expect(lastUrl()).toBe("libraries");
  });
});
