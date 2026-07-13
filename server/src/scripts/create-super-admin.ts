/**
 * One-off bootstrap script to create the platform's first Super Admin.
 * Run with: npm run create-super-admin -w server -- <email> <password> "<display name>"
 *
 * There is no self-registration (Section 8) — every account either starts
 * as a Super Admin via this script or is created by accepting an
 * Invitation. Run this locally against the target Firebase project (using
 * the same credentials as server/.env), never through the deployed server.
 */
import type { AppUser } from "@cms-manager/shared";
import { firebaseAuth, firestore } from "../config/firebaseAdmin";

async function main(): Promise<void> {
  const [, , email, password, displayName] = process.argv;

  if (!email || !password || !displayName) {
    console.error(
      'Usage: npm run create-super-admin -w server -- <email> <password> "<display name>"',
    );
    process.exitCode = 1;
    return;
  }

  if (password.length < 8) {
    console.error("Password must be at least 8 characters.");
    process.exitCode = 1;
    return;
  }

  const userRecord = await firebaseAuth.createUser({
    email,
    password,
    displayName,
  });

  const appUser: AppUser = {
    uid: userRecord.uid,
    email,
    displayName,
    isSuperAdmin: true,
    disabled: false,
    createdAt: new Date().toISOString(),
    createdBy: "bootstrap-script",
  };

  const { uid, ...profile } = appUser;
  await firestore.collection("users").doc(uid).set(profile);

  console.log(`Super Admin created: ${appUser.email} (uid: ${appUser.uid})`);
}

main().catch((err) => {
  console.error("Failed to create Super Admin:", err);
  process.exitCode = 1;
});
