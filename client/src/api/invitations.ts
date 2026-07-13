import { useMutation, useQuery } from "@tanstack/react-query";
import type { InvitationPreview, Membership } from "@cms-manager/shared";
import { apiClient } from "@/lib/apiClient";

/** Public — no auth required, safe to call before the invitee has an account (Section 3.4). */
export function useInvitationPreview(token: string | undefined) {
  return useQuery({
    queryKey: ["invitations", token],
    queryFn: () => apiClient.get<InvitationPreview>(`/api/invitations/${token}`),
    enabled: Boolean(token),
    retry: false,
  });
}

export function useAcceptInvitation(token: string | undefined) {
  return useMutation({
    mutationFn: (displayName: string | undefined) =>
      apiClient.post<{ membership: Membership; projectId: string }>(
        `/api/invitations/${token}/accept`,
        { displayName },
      ),
  });
}
