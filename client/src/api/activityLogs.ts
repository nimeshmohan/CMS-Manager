import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { ActivityLogEntry } from "@cms-manager/shared";
import { apiClient } from "@/lib/apiClient";

export interface ListActivityLogResult {
  entries: ActivityLogEntry[];
  total: number;
  page: number;
  pageSize: number;
}

export function useProjectActivityLogs(
  projectId: string,
  params: { page?: number; pageSize?: number },
  enabled: boolean,
) {
  return useQuery({
    queryKey: ["projects", projectId, "activity-logs", params],
    queryFn: () =>
      apiClient.get<ListActivityLogResult>(
        `/api/projects/${projectId}/activity-logs`,
        params,
      ),
    enabled,
    placeholderData: keepPreviousData,
  });
}

export function useGlobalActivityLogs(
  params: { projectId?: string; page?: number; pageSize?: number },
  enabled: boolean,
) {
  return useQuery({
    queryKey: ["activity-logs", params],
    queryFn: () => apiClient.get<ListActivityLogResult>("/api/activity-logs", params),
    enabled,
    placeholderData: keepPreviousData,
  });
}
