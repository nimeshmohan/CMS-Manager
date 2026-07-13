import type { Role } from "../types/role";

/**
 * Fixed ids for the seeded default roles (Section 3.2). Super Admin is
 * deliberately absent — it's `AppUser.isSuperAdmin`, a platform-wide tier
 * orthogonal to the project-scoped Role/Membership system (Section 3.1).
 */
export const SEEDED_ROLE_IDS = {
  PROJECT_MANAGER: "project-manager",
  CONTENT_MANAGER: "content-manager",
  EDITOR: "editor",
  PUBLISHER: "publisher",
  VIEWER: "viewer",
} as const;

/**
 * Default permission templates applied when inviting a user to a project
 * (Section 3.4) — pre-fill, never lock, the resulting per-collection
 * checkboxes. Authorization code must resolve the actual granted booleans
 * on a Membership, never branch on a role's id or name (Section 3.2).
 */
export const SEEDED_ROLES: Role[] = [
  {
    id: SEEDED_ROLE_IDS.PROJECT_MANAGER,
    name: "Project Manager",
    isSystemDefault: true,
    defaultPermissionTemplate: {
      canView: true,
      canCreate: true,
      canEdit: true,
      canDelete: true,
      canPublish: true,
    },
  },
  {
    id: SEEDED_ROLE_IDS.CONTENT_MANAGER,
    name: "Content Manager",
    isSystemDefault: true,
    defaultPermissionTemplate: {
      canView: true,
      canCreate: true,
      canEdit: true,
      canDelete: false,
      canPublish: true,
    },
  },
  {
    id: SEEDED_ROLE_IDS.EDITOR,
    name: "Editor",
    isSystemDefault: true,
    defaultPermissionTemplate: {
      canView: true,
      canCreate: true,
      canEdit: true,
      canDelete: false,
      canPublish: false,
    },
  },
  {
    id: SEEDED_ROLE_IDS.PUBLISHER,
    name: "Publisher",
    isSystemDefault: true,
    defaultPermissionTemplate: {
      canView: true,
      canCreate: false,
      canEdit: false,
      canDelete: false,
      canPublish: true,
    },
  },
  {
    id: SEEDED_ROLE_IDS.VIEWER,
    name: "Viewer",
    isSystemDefault: true,
    defaultPermissionTemplate: {
      canView: true,
      canCreate: false,
      canEdit: false,
      canDelete: false,
      canPublish: false,
    },
  },
];
