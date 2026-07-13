import { randomBytes } from "node:crypto";
import { firestore } from "../config/firebaseAdmin";

const OAUTH_STATES_COLLECTION = "oauthStates";
const STATE_TTL_MS = 10 * 60 * 1000; // 10 minutes — plenty for a user to complete Webflow's consent screen.

interface OAuthStateRecord {
  projectId: string;
  userId: string;
  expiresAt: string;
}

/**
 * Short-lived CSRF token for the Webflow OAuth connect flow (Section 9).
 * Created when the wizard redirects to Webflow's authorize screen,
 * consumed (validated + deleted) on the callback — a state that doesn't
 * exist or has expired fails the callback outright.
 *
 * Webflow's OAuth app registers exactly one static `redirect_uri` (exact
 * match required — Section 9), so the callback route can't have `:id` in
 * its path. `state` is the only thing round-tripped through Webflow
 * unchanged, so it's what carries which project/user started the flow —
 * not the URL.
 */
export const oauthStateService = {
  async createState(projectId: string, userId: string): Promise<string> {
    const state = randomBytes(24).toString("hex");
    const record: OAuthStateRecord = {
      projectId,
      userId,
      expiresAt: new Date(Date.now() + STATE_TTL_MS).toISOString(),
    };
    await firestore.collection(OAUTH_STATES_COLLECTION).doc(state).set(record);
    return state;
  },

  /** Validates and deletes the state token in one step — each state is single-use. */
  async consumeState(
    state: string,
  ): Promise<{ projectId: string; userId: string } | null> {
    const docRef = firestore.collection(OAUTH_STATES_COLLECTION).doc(state);
    const doc = await docRef.get();
    if (!doc.exists) return null;

    await docRef.delete();

    const record = doc.data() as OAuthStateRecord;
    if (new Date(record.expiresAt).getTime() < Date.now()) return null;

    return { projectId: record.projectId, userId: record.userId };
  },
};
