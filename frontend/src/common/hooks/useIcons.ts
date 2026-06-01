import { useQuery } from "@tanstack/react-query";

import { restRequest } from "@/common/helpers/restRequest";
import type { IconsResponse, PaginatedIcons } from "@/types/icon";

export function useIcons(page: number = 1, perPage: number = 100) {
  return useQuery<PaginatedIcons>({
    queryKey: ["icons", page, perPage],
    queryFn: async ({ signal }) => {
      const response = await restRequest<IconsResponse>(`icons?page=${page}&per_page=${perPage}`, {
        signal,
      });

      return response.data;
    },
  });
}
