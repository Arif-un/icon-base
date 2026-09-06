import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { restRequest } from "@/common/helpers/restRequest";

export interface Settings {
  showSidebarMenu: boolean;
}

interface SettingsResponse {
  data: Settings;
}

export function useSettings() {
  return useQuery<Settings>({
    queryKey: ["settings"],
    queryFn: async ({ signal }) => {
      const response = await restRequest<SettingsResponse>("settings", { signal });

      return response.data;
    },
  });
}

export function useUpdateSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (settings: Partial<Settings>) => {
      const response = await restRequest<SettingsResponse>("settings", {
        method: "POST",
        body: settings,
      });

      return response.data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["settings"], data);
    },
  });
}
