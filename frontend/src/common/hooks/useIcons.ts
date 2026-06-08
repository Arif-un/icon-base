import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { restRequest } from "@/common/helpers/restRequest";
import type { IconsResponse, PaginatedIcons } from "@/types/icon";

interface UseIconsParams {
  page?: number;
  perPage?: number;
  search?: string;
  libraryIds?: number[];
  typeIds?: number[];
}

export function useIcons({
  page = 1,
  perPage = 100,
  search,
  libraryIds = [],
  typeIds = [],
}: UseIconsParams = {}) {
  return useQuery<PaginatedIcons>({
    queryKey: ["icons", page, perPage, search ?? "", libraryIds, typeIds],
    queryFn: async ({ signal }) => {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("per_page", String(perPage));

      if (search) {
        params.set("search", search);
      }

      if (libraryIds.length > 0) {
        params.set("library_ids", libraryIds.join(","));
      }

      if (typeIds.length > 0) {
        params.set("type_ids", typeIds.join(","));
      }

      const response = await restRequest<IconsResponse>(`icons?${params.toString()}`, { signal });

      return response.data;
    },
    placeholderData: keepPreviousData,
  });
}
