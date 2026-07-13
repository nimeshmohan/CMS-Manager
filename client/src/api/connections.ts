import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Project, ProviderSite } from "@cms-manager/shared";
import { apiClient } from "@/lib/apiClient";
import { projectKeys } from "./projects";

export function useStartOAuth(projectId: string) {
  return useMutation({
    mutationFn: () =>
      apiClient.get<{ url: string }>(
        `/api/projects/${projectId}/connect/oauth/start`,
      ),
  });
}

export function useConnectWithApiToken(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (apiToken: string) =>
      apiClient.post<{ project: Project; sites: ProviderSite[] }>(
        `/api/projects/${projectId}/connect/token`,
        { apiToken },
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: projectKeys.detail(projectId),
      });
    },
  });
}

/** Only fetched once a project is connected but has no site selected yet (multiple sites available — Section 4.4 step 4). */
export function useProjectSites(projectId: string, enabled: boolean) {
  return useQuery({
    queryKey: [...projectKeys.detail(projectId), "sites"],
    queryFn: () =>
      apiClient.get<{ sites: ProviderSite[] }>(
        `/api/projects/${projectId}/sites`,
      ),
    select: (data) => data.sites,
    enabled,
  });
}

export function useSelectSite(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (siteId: string) =>
      apiClient.post<{ project: Project }>(
        `/api/projects/${projectId}/site`,
        { siteId },
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: projectKeys.detail(projectId),
      });
    },
  });
}
