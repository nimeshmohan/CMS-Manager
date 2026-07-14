// Explicit named re-exports (not `export *`) are required here: TypeScript
// compiles `export *` to a dynamic __exportStar helper in CommonJS output,
// which cjs-module-lexer (used by both esbuild and Rollup for CJS→ESM
// interop) cannot statically analyze. That silently breaks named imports
// of this package from the Vite-built client, in both dev and production,
// even though the server (plain Node `require`) never notices.

export type { AppUser } from "./types/user";

export {
  COLLECTION_PERMISSION_KEYS,
  type CollectionPermissionKey,
  type CollectionPermission,
  collectionPermissionSchema,
} from "./types/permission";

export {
  type CmsProvider,
  type ConnectionMethod,
  type ProjectStatus,
  fieldTypeSchema,
  type FieldType,
  fieldMappingSchema,
  type FieldMapping,
  type CollectionConfig,
  type ApiCredentials,
  type Project,
  createProjectSchema,
  type CreateProjectInput,
  updateProjectSchema,
  type UpdateProjectInput,
} from "./types/project";

export { PUBLISH_TARGETS, type PublishTarget, type Item } from "./types/item";

export { stripHtml, slugify } from "./utils";

export { buildItemSchema, buildItemFormSchema } from "./utils/buildItemSchema";

export { autoMapFields, suggestFieldKey, suggestFieldType } from "./utils/autoMapFields";

export type {
  ProviderSite,
  ProviderCollection,
  ProviderField,
} from "./types/provider";

export type { Role } from "./types/role";

export { SEEDED_ROLE_IDS, SEEDED_ROLES } from "./constants/roles";

export type { Membership, ProjectMember } from "./types/membership";

export {
  type InvitationStatus,
  type Invitation,
  createInvitationSchema,
  type CreateInvitationInput,
  updateMemberPermissionsSchema,
  type UpdateMemberPermissionsInput,
  type ProjectInvitation,
  type InvitationPreview,
} from "./types/invitation";

export type { ActivityAction, ActivityLogEntry } from "./types/activityLog";

export { ACTIVITY_ACTION_LABELS } from "./constants/activityLabels";
