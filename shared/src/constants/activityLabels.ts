import type { ActivityAction } from "../types/activityLog";

/** Human-readable label for each raw action enum — the activity log always shows this, never the enum value itself (Section 10). */
export const ACTIVITY_ACTION_LABELS: Record<ActivityAction, string> = {
  CREATE_PROJECT: "Created project",
  UPDATE_PROJECT: "Updated project",
  ARCHIVE_PROJECT: "Archived project",
  DUPLICATE_PROJECT: "Duplicated project",
  DELETE_PROJECT: "Deleted project",
  CREATE_ITEM: "Created item",
  UPDATE_ITEM: "Updated item",
  DELETE_ITEM: "Deleted item",
  PUBLISH_ITEM: "Published item",
  INVITE_MEMBER: "Invited member",
  UPDATE_MEMBER_PERMISSIONS: "Updated member permissions",
  REVOKE_MEMBER: "Revoked member access",
  CREATE_USER: "Created user",
  DISABLE_USER: "Disabled user",
  ENABLE_USER: "Enabled user",
  DELETE_USER: "Deleted user",
  RESET_PASSWORD: "Reset password",
  UPDATE_USER_ROLE: "Updated Super Admin access",
};
