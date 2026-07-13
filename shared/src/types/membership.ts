import type { CollectionPermission } from "./permission";

/**
 * The record that actually grants a specific user access to a specific
 * project. All authorization decisions are made from Membership records —
 * never from `roleId` alone (Section 3.2's critical architectural rule).
 *
 * `isProjectManager` is a project-wide capability (settings, connection,
 * collections, members — Section 3.2's Project Manager row) independent of
 * any single collection's grants, so it can't live inside
 * `collectionPermissions`. It's a resolved boolean on the Membership
 * itself, set when the Membership is created — authorization code reads
 * this flag, never the role's name, so the "never branch on role name"
 * rule (Section 3.2) still holds.
 */
export interface Membership {
  id: string;
  projectId: string;
  userId: string;
  roleId: string;
  isProjectManager: boolean;
  collectionPermissions: CollectionPermission[];
  invitedBy: string;
  createdAt: string;
}

/** A Membership joined with its user's display info — the shape the Members list UI actually renders (Section 4.2). */
export interface ProjectMember extends Membership {
  email: string;
  displayName: string;
}
