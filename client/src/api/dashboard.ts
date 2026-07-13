import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";

export interface CollectionStat {
  collectionId: string;
  collectionName: string;
  total: number;
  published: number;
  draft: number;
}

export interface ProjectSummary {
  collections: CollectionStat[];
}

export interface PlatformSummary {
  totalProjects: number;
  activeProjects: number;
  archivedProjects: number;
}

export function useProjectDashboardSummary(projectId: string, enabled: boolean) {
  return useQuery({
    queryKey: ["projects", projectId, "dashboard", "summary"],
    queryFn: () =>
      apiClient.get<ProjectSummary>(`/api/projects/${projectId}/dashboard/summary`),
    enabled,
  });
}

export function usePlatformDashboardSummary(enabled: boolean) {
  return useQuery({
    queryKey: ["dashboard", "summary"],
    queryFn: () => apiClient.get<PlatformSummary>("/api/dashboard/summary"),
    enabled,
  });
}
