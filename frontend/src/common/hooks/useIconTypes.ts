import { useQuery } from "@tanstack/react-query";

import { restRequest } from "@/common/helpers/restRequest";
import type { IconType, IconTypesResponse } from "@/types/icon";

export function useIconTypes() {
  return useQuery<IconType[]>({
    queryKey: ["icon-types"],
    queryFn: async ({ signal }) => {
      const response = await restRequest<IconTypesResponse>("icon-types", { signal });

      return response.data;
    },
  });
}
