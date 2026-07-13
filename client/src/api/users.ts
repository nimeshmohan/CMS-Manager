import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AppUser } from "@cms-manager/shared";
import { apiClient } from "@/lib/apiClient";

const USERS_KEY = ["users"] as const;

export function useUsers() {
  return useQuery({
    queryKey: USERS_KEY,
    queryFn: () => apiClient.get<{ users: AppUser[] }>("/api/users"),
    select: (data) => data.users,
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      uid,
      ...patch
    }: {
      uid: string;
      isSuperAdmin?: boolean;
      disabled?: boolean;
    }) => apiClient.patch<{ user: AppUser }>(`/api/users/${uid}`, patch),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: USERS_KEY });
    },
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (uid: string) => apiClient.del<void>(`/api/users/${uid}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: USERS_KEY });
    },
  });
}

export function useResetUserPassword() {
  return useMutation({
    mutationFn: (uid: string) =>
      apiClient.post<{ resetUrl: string }>(`/api/users/${uid}/reset-password`),
  });
}
