import type { AppUser } from "@cms-manager/shared";
import { firebaseAuth, firestore } from "../config/firebaseAdmin";
import { AppError } from "../utils/AppError";

const USERS_COLLECTION = "users";

async function getUserOrThrow(uid: string): Promise<AppUser> {
  const doc = await firestore.collection(USERS_COLLECTION).doc(uid).get();
  if (!doc.exists) {
    throw new AppError("User not found.", 404);
  }
  return { ...(doc.data() as Omit<AppUser, "uid">), uid };
}

export const userService = {
  /** Platform-wide, Super Admin only (Section 15) — every AppUser profile, regardless of project membership. */
  async listUsers(): Promise<AppUser[]> {
    const snapshot = await firestore.collection(USERS_COLLECTION).get();
    return snapshot.docs.map((doc) => ({ ...(doc.data() as Omit<AppUser, "uid">), uid: doc.id }));
  },

  async getUser(uid: string): Promise<AppUser> {
    return getUserOrThrow(uid);
  },

  /** How many Super Admins currently exist — used to stop the platform from ever being left with zero. */
  async countSuperAdmins(): Promise<number> {
    const snapshot = await firestore
      .collection(USERS_COLLECTION)
      .where("isSuperAdmin", "==", true)
      .get();
    return snapshot.size;
  },

  async setSuperAdmin(uid: string, isSuperAdmin: boolean): Promise<AppUser> {
    const existing = await getUserOrThrow(uid);
    await firestore.collection(USERS_COLLECTION).doc(uid).update({ isSuperAdmin });
    return { ...existing, isSuperAdmin };
  },

  /** Takes effect on the user's very next request (Section 8) — `verifyAuth` checks this on every call. */
  async setDisabled(uid: string, disabled: boolean): Promise<AppUser> {
    const existing = await getUserOrThrow(uid);
    await firestore.collection(USERS_COLLECTION).doc(uid).update({ disabled });
    return { ...existing, disabled };
  },

  /** Deletes the Firebase Auth account, the Firestore profile, and every Membership referencing it — an orphaned Membership for a nonexistent user is meaningless. */
  async deleteUser(uid: string): Promise<AppUser> {
    const existing = await getUserOrThrow(uid);

    const membershipsSnapshot = await firestore
      .collection("memberships")
      .where("userId", "==", uid)
      .get();
    const batch = firestore.batch();
    for (const doc of membershipsSnapshot.docs) {
      batch.delete(doc.ref);
    }
    batch.delete(firestore.collection(USERS_COLLECTION).doc(uid));
    await batch.commit();

    await firebaseAuth.deleteUser(uid).catch(() => {
      // Firebase Auth account may already be gone (e.g. deleted directly in
      // the Firebase console) — the Firestore/Membership cleanup above is
      // what actually matters for this app's own authorization state.
    });

    return existing;
  },

  /** No email provider is wired up yet — returns the reset link directly, same pattern as invitations (Section 12). */
  async generatePasswordResetLink(uid: string): Promise<string> {
    const user = await getUserOrThrow(uid);
    return firebaseAuth.generatePasswordResetLink(user.email);
  },
};
