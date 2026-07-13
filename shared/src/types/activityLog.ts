/**
 * Every mutating action anywhere in the platform is recorded as one of
 * these (Section 10). Kept as a plain string union rather than a Zod enum
 * for now — it'll gain entries as later phases add the actions they
 * perform (CREATE_PROJECT, INVITE_MEMBER, CREATE_ITEM, ...).
 */
export type ActivityAction =
  | "CREATE_PROJECT"
  | "UPDATE_PROJECT"
  | "ARCHIVE_PROJECT"
  | "DUPLICATE_PROJECT"
  | "DELETE_PROJECT"
  | "CREATE_ITEM"
  | "UPDATE_ITEM"
  | "DELETE_ITEM"
  | "PUBLISH_ITEM"
  | "UNPUBLISH_ITEM"
  | "INVITE_MEMBER"
  | "UPDATE_MEMBER_PERMISSIONS"
  | "REVOKE_MEMBER"
  | "CREATE_USER"
  | "DISABLE_USER"
  | "ENABLE_USER"
  | "DELETE_USER"
  | "RESET_PASSWORD"
  /** Promoting/demoting a user's platform-wide Super Admin status (Phase 10) — distinct from UPDATE_MEMBER_PERMISSIONS, which is project-collection-scoped. */
  | "UPDATE_USER_ROLE";

export interface ActivityLogEntry {
  id: string;
  /** Null for platform-level actions (e.g. CREATE_USER). */
  projectId: string | null;
  userId: string;
  userEmail: string;
  action: ActivityAction;
  collectionId: string | null;
  itemId: string | null;
  /** For membership/user-management actions. */
  targetUserId: string | null;
  previousData: Record<string, unknown> | null;
  newData: Record<string, unknown> | null;
  timestamp: string;
}
