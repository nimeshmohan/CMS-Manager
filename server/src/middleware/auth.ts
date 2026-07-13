import type { RequestHandler } from "express";
import type { DecodedIdToken } from "firebase-admin/auth";
import type { AppUser } from "@cms-manager/shared";
import { firebaseAuth, firestore } from "../config/firebaseAdmin";
import { AppError } from "../utils/AppError";
import { asyncHandler } from "../utils/asyncHandler";

async function verifyBearerToken(
  header: string | undefined,
): Promise<DecodedIdToken> {
  if (!header || !header.startsWith("Bearer ")) {
    throw new AppError("Missing or invalid Authorization header.", 401);
  }

  const idToken = header.slice("Bearer ".length).trim();
  if (!idToken) {
    throw new AppError("Missing or invalid Authorization header.", 401);
  }

  try {
    return await firebaseAuth.verifyIdToken(idToken, true);
  } catch {
    throw new AppError("Invalid or expired session. Please log in again.", 401);
  }
}

/**
 * Verifies the Firebase ID token sent as `Authorization: Bearer <token>`,
 * loads the matching profile from Firestore's `users` collection, and
 * rejects disabled accounts. On success, `req.user` is populated for
 * downstream route handlers. Project- and collection-level authorization
 * (Section 3.1) is layered on top of this by `requireProjectPermission` /
 * `requireCollectionPermission`.
 */
export const verifyAuth = asyncHandler(async (req, _res, next) => {
  const decoded = await verifyBearerToken(req.headers.authorization);

  const userDoc = await firestore.collection("users").doc(decoded.uid).get();
  if (!userDoc.exists) {
    throw new AppError("No account found for this user.", 403);
  }

  const userData = userDoc.data() as Omit<AppUser, "uid">;
  if (userData.disabled) {
    throw new AppError(
      "This account has been disabled. Contact an administrator.",
      403,
    );
  }

  req.user = { ...userData, uid: decoded.uid };
  next();
});

/**
 * A lighter check for the one route that must work for a Firebase account
 * with no Firestore profile yet — accepting an invitation (Section 8: this
 * is how a brand-new account gets its profile created). Just verifies the
 * ID token and attaches the raw uid/email; does not require or check a
 * `users/{uid}` doc, since accepting the invitation is what creates one.
 */
export const verifyFirebaseToken = asyncHandler(async (req, _res, next) => {
  const decoded = await verifyBearerToken(req.headers.authorization);
  req.firebaseUid = decoded.uid;
  req.firebaseEmail = decoded.email ?? "";
  next();
});

/**
 * Restricts a route to platform-level Super Admins (Section 3.1's first
 * tier of authority). Must run after `verifyAuth`. Project-scoped authority
 * is never checked by role name — see `requireProjectPermission` /
 * `requireCollectionPermission` (Section 3.2's rule) once those exist.
 */
export const requireSuperAdmin: RequestHandler = (req, _res, next) => {
  if (!req.user) {
    next(new AppError("Authentication required.", 401));
    return;
  }
  if (!req.user.isSuperAdmin) {
    next(
      new AppError("You do not have permission to perform this action.", 403),
    );
    return;
  }
  next();
};
