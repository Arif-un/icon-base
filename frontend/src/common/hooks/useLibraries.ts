import { useQuery } from "@tanstack/react-query";

import { restRequest } from "@/common/helpers/restRequest";
import type { LibrariesResponse, Library } from "@/types/icon";

export function useLibraries() {
  return useQuery<Library[]>({
    queryKey: ["libraries"],
    queryFn: async ({ signal }) => {
      const response = await restRequest<LibrariesResponse>("libraries", { signal });

      return response.data;
    },
  });
}
