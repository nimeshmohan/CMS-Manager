import { useQuery } from "@tanstack/react-query";
import type { Role } from "@cms-manager/shared";
import { apiClient } from "@/lib/apiClient";

export function useRoles() {
  return useQuery({
    queryKey: ["roles"],
    queryFn: () => apiClient.get<{ roles: Role[] }>("/api/roles"),
    select: (data) => data.roles,
    staleTime: 5 * 60 * 1000,
  });
}
