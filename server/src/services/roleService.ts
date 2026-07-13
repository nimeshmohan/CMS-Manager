import type { Role } from "@cms-manager/shared";
import { firestore } from "../config/firebaseAdmin";

const ROLES_COLLECTION = "roles";

export const roleService = {
  async listRoles(): Promise<Role[]> {
    const snapshot = await firestore.collection(ROLES_COLLECTION).get();
    return snapshot.docs.map((doc) => ({ ...(doc.data() as Role), id: doc.id }));
  },

  async getRole(id: string): Promise<Role | null> {
    const doc = await firestore.collection(ROLES_COLLECTION).doc(id).get();
    return doc.exists ? { ...(doc.data() as Role), id: doc.id } : null;
  },
};
