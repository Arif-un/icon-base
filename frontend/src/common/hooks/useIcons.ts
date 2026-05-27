import { restRequest } from "@common/helpers/restRequest";
import { useQuery } from "@tanstack/react-query";

import type { IconsResponse } from "@/types/icon";

export function useIcons() {
  return useQuery({
    queryKey: ["icons"],
    queryFn: async ({ signal }) => {
      const response = await restRequest<IconsResponse>("icons", { signal });

      return response.data;
    },
  });
}
