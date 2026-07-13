import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { env } from "./env";

/**
 * Firebase Admin is initialized once from environment variables — never from
 * a committed service account JSON file. `getApps()` guards against
 * re-initialization when this module is imported from multiple places
 * (e.g. by tsx's watch-mode module reloading in dev).
 */
const app = getApps().length
  ? getApps()[0]!
  : initializeApp({
      credential: cert({
        projectId: env.firebase.projectId,
        clientEmail: env.firebase.clientEmail,
        privateKey: env.firebase.privateKey,
      }),
    });

export const firebaseAuth = getAuth(app);
export const firestore = getFirestore(app);
