import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  CollectionPermission,
  CreateInvitationInput,
  Invitation,
  Membership,
  ProjectInvitation,
  ProjectMember,
} from "@cms-manager/shared";
import { apiClient } from "@/lib/apiClient";
import { projectKeys } from "./projects";

function membersKey(projectId: string) {
  return [...projectKeys.detail(projectId), "members"] as const;
}

export function useMembers(projectId: string, enabled: boolean) {
  return useQuery({
    queryKey: membersKey(projectId),
    queryFn: () =>
      apiClient.get<{ members: ProjectMember[]; invitations: ProjectInvitation[] }>(
        `/api/projects/${projectId}/members`,
      ),
    enabled,
  });
}

export function useInviteMember(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateInvitationInput) =>
      apiClient.post<{ invitation: Invitation; acceptUrl: string }>(
        `/api/projects/${projectId}/members`,
        input,
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: membersKey(projectId) });
    },
  });
}

export function useUpdateMemberPermissions(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      membershipId,
      collectionPermissions,
    }: {
      membershipId: string;
      collectionPermissions: CollectionPermission[];
    }) =>
      apiClient.patch<{ membership: Membership }>(
        `/api/projects/${projectId}/members/${membershipId}`,
        { collectionPermissions },
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: membersKey(projectId) });
    },
  });
}

export function useRevokeMember(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (membershipId: string) =>
      apiClient.del<void>(`/api/projects/${projectId}/members/${membershipId}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: membersKey(projectId) });
    },
  });
}

export function useRevokeInvitation(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (invitationId: string) =>
      apiClient.post<void>(
        `/api/projects/${projectId}/invitations/${invitationId}/revoke`,
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: membersKey(projectId) });
    },
  });
}
