/**
 * Idempotently writes the seeded default Role records (Section 3.2) to
 * Firestore. Safe to re-run — each role is upserted by its fixed id.
 * Run with: npm run seed-roles -w server
 */
import { SEEDED_ROLES } from "@cms-manager/shared";
import { firestore } from "../config/firebaseAdmin";

async function main(): Promise<void> {
  const batch = firestore.batch();

  for (const role of SEEDED_ROLES) {
    const { id, ...data } = role;
    batch.set(firestore.collection("roles").doc(id), data, { merge: true });
  }

  await batch.commit();
  console.log(`Seeded ${SEEDED_ROLES.length} roles: ${SEEDED_ROLES.map((r) => r.name).join(", ")}`);
}

main().catch((err) => {
  console.error("Failed to seed roles:", err);
  process.exitCode = 1;
});
