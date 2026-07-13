import type { CollectionPermission } from "./permission";

/**
 * A named, reusable permission template applied when inviting a user to a
 * project (Section 3.4) — pre-fills but never locks their per-collection
 * permissions. Super Admin is deliberately not modeled as a Role: it's a
 * platform-wide tier of authority (`AppUser.isSuperAdmin`), orthogonal to
 * the project-scoped Membership/Role system (Section 3.1).
 */
export interface Role {
  id: string;
  /** "Project Manager", "Content Manager", "Editor", "Publisher", "Viewer", or a custom name (Section 3.5). */
  name: string;
  isSystemDefault: boolean;
  defaultPermissionTemplate: Omit<CollectionPermission, "collectionId">;
}
