import type {
  AppUser,
  CollectionConfig,
  CollectionPermissionKey,
  Project,
} from "@cms-manager/shared";

declare global {
  namespace Express {
    interface Request {
      /** Populated by the `verifyAuth` middleware after the ID token is verified. */
      user?: AppUser;
      /** Populated by `requireProjectPermission` so downstream handlers don't re-fetch it. */
      project?: Project;
      /** Populated by `requireCollectionPermission` so downstream handlers don't re-fetch it. */
      collection?: CollectionConfig;
      /** The caller's full resolved grant on `collection` (not just the one action the route required) — for conditional checks like "publish requires canPublish" alongside a canCreate/canEdit route. */
      collectionPermissions?: Record<CollectionPermissionKey, boolean>;
      /** Populated by `verifyFirebaseToken` (invitation acceptance only) — the raw Firebase identity, before any Firestore user profile necessarily exists. */
      firebaseUid?: string;
      firebaseEmail?: string;
    }
  }
}

export {};
