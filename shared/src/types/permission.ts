import { z } from "zod";

/**
 * The five independently-grantable actions a Membership can hold on a single
 * collection (Section 3.1). Kept as an ordered tuple — not just the
 * interface below — so UI code (the member permission matrix) and any
 * future iteration logic have one canonical order to render/loop over.
 */
export const COLLECTION_PERMISSION_KEYS = [
  "canView",
  "canCreate",
  "canEdit",
  "canDelete",
  "canPublish",
] as const;

export type CollectionPermissionKey = (typeof COLLECTION_PERMISSION_KEYS)[number];

export interface CollectionPermission {
  collectionId: string;
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canPublish: boolean;
}

export const collectionPermissionSchema = z.object({
  collectionId: z.string().trim().min(1),
  canView: z.boolean(),
  canCreate: z.boolean(),
  canEdit: z.boolean(),
  canDelete: z.boolean(),
  canPublish: z.boolean(),
});
