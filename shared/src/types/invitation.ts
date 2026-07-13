import { z } from "zod";
import { collectionPermissionSchema, type CollectionPermission } from "./permission";

export type InvitationStatus = "pending" | "accepted" | "expired" | "revoked";

/**
 * A pending grant of project access, created by a Project Manager or Super
 * Admin (Section 3.4). Accepting it (via its single-use `token`) converts
 * it into an active Membership scoped to exactly the permissions specified
 * here — nothing more.
 *
 * `isProjectManager` mirrors the same field on `Membership` (see that
 * type's comment) — set from the picked role at invite time, carried
 * through to the Membership created on acceptance.
 */
export interface Invitation {
  id: string;
  projectId: string;
  email: string;
  roleId: string;
  isProjectManager: boolean;
  collectionPermissions: CollectionPermission[];
  token: string;
  invitedBy: string;
  invitedAt: string;
  expiresAt: string;
  status: InvitationStatus;
}

export const createInvitationSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  roleId: z.string().trim().min(1, "Select a role"),
  isProjectManager: z.boolean(),
  collectionPermissions: z
    .array(collectionPermissionSchema)
    .min(1, "Select at least one collection"),
});
export type CreateInvitationInput = z.infer<typeof createInvitationSchema>;

export const updateMemberPermissionsSchema = z.object({
  collectionPermissions: z.array(collectionPermissionSchema),
});
export type UpdateMemberPermissionsInput = z.infer<
  typeof updateMemberPermissionsSchema
>;

/** An Invitation joined with the inviter's email — the shape the pending-invitations list UI renders (Section 4.2). */
export interface ProjectInvitation extends Invitation {
  invitedByEmail: string;
}

/** The safe preview a not-yet-authenticated invitee sees before creating an account or logging in — no token value, no permission internals. */
export interface InvitationPreview {
  email: string;
  projectName: string;
  roleName: string;
  invitedByEmail: string;
  expiresAt: string;
}
