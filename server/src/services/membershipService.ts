import type { DocumentReference } from "firebase-admin/firestore";
import type {
  AppUser,
  CollectionPermission,
  Membership,
  ProjectMember,
} from "@cms-manager/shared";
import { firestore } from "../config/firebaseAdmin";
import { AppError } from "../utils/AppError";

const MEMBERSHIPS_COLLECTION = "memberships";

/**
 * A Membership is unique per (projectId, userId) — Section 2's definition
 * of Membership as "the record that actually grants *a specific user*
 * access to *a specific project*". Using a deterministic doc id both
 * enforces that uniqueness and makes single-membership lookups a direct
 * get() instead of a query.
 */
function membershipDocId(projectId: string, userId: string): string {
  return `${projectId}_${userId}`;
}

/** Firestore doc reference for a (projectId, userId) pair — for callers that need to include the write in their own batch (e.g. creating a project and its first Membership atomically). */
function membershipDocRef(
  projectId: string,
  userId: string,
): DocumentReference {
  return firestore
    .collection(MEMBERSHIPS_COLLECTION)
    .doc(membershipDocId(projectId, userId));
}

interface CreateMembershipInput {
  projectId: string;
  userId: string;
  roleId: string;
  isProjectManager: boolean;
  collectionPermissions: CollectionPermission[];
  invitedBy: string;
}

function buildMembership(input: CreateMembershipInput): Membership {
  return {
    id: membershipDocId(input.projectId, input.userId),
    projectId: input.projectId,
    userId: input.userId,
    roleId: input.roleId,
    isProjectManager: input.isProjectManager,
    collectionPermissions: input.collectionPermissions,
    invitedBy: input.invitedBy,
    createdAt: new Date().toISOString(),
  };
}

export const membershipService = {
  async getMembership(
    projectId: string,
    userId: string,
  ): Promise<Membership | null> {
    const doc = await firestore
      .collection(MEMBERSHIPS_COLLECTION)
      .doc(membershipDocId(projectId, userId))
      .get();
    return doc.exists ? (doc.data() as Membership) : null;
  },

  async listMembershipsForUser(userId: string): Promise<Membership[]> {
    const snapshot = await firestore
      .collection(MEMBERSHIPS_COLLECTION)
      .where("userId", "==", userId)
      .get();
    return snapshot.docs.map((doc) => doc.data() as Membership);
  },

  async listMembershipsForProject(projectId: string): Promise<Membership[]> {
    const snapshot = await firestore
      .collection(MEMBERSHIPS_COLLECTION)
      .where("projectId", "==", projectId)
      .get();
    return snapshot.docs.map((doc) => doc.data() as Membership);
  },

  async createMembership(input: CreateMembershipInput): Promise<Membership> {
    const docRef = membershipDocRef(input.projectId, input.userId);

    const existing = await docRef.get();
    if (existing.exists) {
      throw new AppError(
        "This user already has a membership on this project.",
        409,
      );
    }

    const membership = buildMembership(input);
    await docRef.set(membership);
    return membership;
  },

  /**
   * Doc ref + fully-built Membership, for callers (ProjectService) that
   * need to write it as part of their own Firestore batch instead of as an
   * independent round trip — e.g. creating a project and the creator's
   * first Membership atomically (Section 3.3).
   */
  membershipDocRef,
  buildMembership,

  async updateCollectionPermissions(
    projectId: string,
    userId: string,
    collectionPermissions: CollectionPermission[],
  ): Promise<Membership> {
    const docRef = firestore
      .collection(MEMBERSHIPS_COLLECTION)
      .doc(membershipDocId(projectId, userId));

    const existing = await docRef.get();
    if (!existing.exists) {
      throw new AppError("Membership not found.", 404);
    }

    await docRef.update({ collectionPermissions });
    return { ...(existing.data() as Membership), collectionPermissions };
  },

  async revokeMembership(projectId: string, userId: string): Promise<void> {
    await firestore
      .collection(MEMBERSHIPS_COLLECTION)
      .doc(membershipDocId(projectId, userId))
      .delete();
  },

  /**
   * Whoever configures a collection gets full permissions on it (Section
   * 3.3, generalized from "the creator... with full permissions on every
   * collection they configure" to any Project Manager adding one later).
   * A no-op if they already have a grant for this collection.
   */
  async grantFullCollectionAccess(
    projectId: string,
    userId: string,
    collectionId: string,
  ): Promise<void> {
    const docRef = firestore
      .collection(MEMBERSHIPS_COLLECTION)
      .doc(membershipDocId(projectId, userId));
    const doc = await docRef.get();
    if (!doc.exists) return;

    const membership = doc.data() as Membership;
    if (membership.collectionPermissions.some((p) => p.collectionId === collectionId)) {
      return;
    }

    const collectionPermissions: CollectionPermission[] = [
      ...membership.collectionPermissions,
      {
        collectionId,
        canView: true,
        canCreate: true,
        canEdit: true,
        canDelete: true,
        canPublish: true,
      },
    ];
    await docRef.update({ collectionPermissions });
  },

  /** The Members list UI's actual shape (Section 4.2) — each Membership joined with its user's email/display name. */
  async listMembersForProject(projectId: string): Promise<ProjectMember[]> {
    const memberships = await membershipService.listMembershipsForProject(projectId);
    if (memberships.length === 0) return [];

    const userDocs = await firestore.getAll(
      ...memberships.map((m) => firestore.collection("users").doc(m.userId)),
    );

    return memberships.map((membership, index) => {
      const userDoc = userDocs[index];
      const userData = userDoc?.exists ? (userDoc.data() as Omit<AppUser, "uid">) : null;
      return {
        ...membership,
        email: userData?.email ?? "unknown",
        displayName: userData?.displayName ?? "Unknown user",
      };
    });
  },

  /** For the self-protection guard: a project must always keep at least one Project Manager (Section 9). */
  async countProjectManagers(projectId: string): Promise<number> {
    const snapshot = await firestore
      .collection(MEMBERSHIPS_COLLECTION)
      .where("projectId", "==", projectId)
      .where("isProjectManager", "==", true)
      .get();
    return snapshot.size;
  },
};
