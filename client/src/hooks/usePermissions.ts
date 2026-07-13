import { useMemo } from "react";
import { useAuth } from "@/providers/AuthProvider";

export interface ResolvedPermissions {
  /** Some Membership exists on this project (or the caller is Super Admin) — mirrors the server's "view" project-permission tier. */
  isMember: boolean;
  /** Project-wide: settings, connection, collections, members (Section 3.2's Project Manager row). */
  canManage: boolean;
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canPublish: boolean;
}

const NONE: ResolvedPermissions = {
  isMember: false,
  canManage: false,
  canView: false,
  canCreate: false,
  canEdit: false,
  canDelete: false,
  canPublish: false,
};

const SUPER_ADMIN: ResolvedPermissions = {
  isMember: true,
  canManage: true,
  canView: true,
  canCreate: true,
  canEdit: true,
  canDelete: true,
  canPublish: true,
};

/**
 * The single place components ask "can the current user do X here?"
 * (Section 16). Mirrors the server's resolution rules exactly — Super
 * Admin gets everything; everyone else is resolved from their Membership
 * for `projectId`, and (once `collectionId` is given) that Membership's
 * per-collection grant. Never branches on a role name (Section 3.2).
 */
export function usePermissions(
  projectId: string | undefined,
  collectionId?: string,
): ResolvedPermissions {
  const { profile, memberships } = useAuth();

  return useMemo(() => {
    if (!projectId) return NONE;
    if (profile?.isSuperAdmin) return SUPER_ADMIN;

    const membership = memberships.find((m) => m.projectId === projectId);
    if (!membership) return NONE;

    const collectionPermission = collectionId
      ? membership.collectionPermissions.find(
          (p) => p.collectionId === collectionId,
        )
      : undefined;

    return {
      isMember: true,
      canManage: membership.isProjectManager,
      canView: collectionPermission?.canView ?? false,
      canCreate: collectionPermission?.canCreate ?? false,
      canEdit: collectionPermission?.canEdit ?? false,
      canDelete: collectionPermission?.canDelete ?? false,
      canPublish: collectionPermission?.canPublish ?? false,
    };
  }, [projectId, collectionId, profile, memberships]);
}
