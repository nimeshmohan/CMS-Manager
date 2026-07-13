import type { ActivityAction, ActivityLogEntry } from "@cms-manager/shared";
import { firestore } from "../config/firebaseAdmin";

const ACTIVITY_LOGS_COLLECTION = "activityLogs";

/**
 * Callers pass whatever domain object was actually affected (a `Project`,
 * later an `Item`, a `Membership`, ...) rather than something pre-shaped
 * into `Record<string, unknown>` — the log is a snapshot for an audit
 * "before/after JSON" diff view (Section 10), not a typed structure
 * anything reads back programmatically, so a plain JSON-serializable
 * object is all it needs.
 */
interface LogInput {
  projectId: string | null;
  userId: string;
  userEmail: string;
  action: ActivityAction;
  collectionId: string | null;
  itemId: string | null;
  targetUserId: string | null;
  previousData: object | null;
  newData: object | null;
}

export interface ListActivityLogParams {
  page?: number;
  pageSize?: number;
}

export interface ListActivityLogResult {
  entries: ActivityLogEntry[];
  total: number;
  page: number;
  pageSize: number;
}

function paginate(
  entries: ActivityLogEntry[],
  page: number,
  pageSize: number,
): ListActivityLogResult {
  const sorted = [...entries].sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  const start = (page - 1) * pageSize;
  return { entries: sorted.slice(start, start + pageSize), total: sorted.length, page, pageSize };
}

export const activityLogService = {
  /**
   * Every mutating route calls this before returning success (Section
   * 10's "before returning success" requirement).
   */
  async logActivity(entry: LogInput): Promise<void> {
    const docRef = firestore.collection(ACTIVITY_LOGS_COLLECTION).doc();
    const fullEntry: ActivityLogEntry = {
      id: docRef.id,
      timestamp: new Date().toISOString(),
      ...entry,
      previousData: entry.previousData as Record<string, unknown> | null,
      newData: entry.newData as Record<string, unknown> | null,
    };
    await docRef.set(fullEntry);
  },

  /** Scoped to one project (Project Manager / Super Admin — Section 10). No `orderBy` paired with the `where`, so this never needs a composite Firestore index. */
  async listForProject(
    projectId: string,
    params: ListActivityLogParams = {},
  ): Promise<ListActivityLogResult> {
    const { page = 1, pageSize = 20 } = params;
    const snapshot = await firestore
      .collection(ACTIVITY_LOGS_COLLECTION)
      .where("projectId", "==", projectId)
      .get();
    return paginate(
      snapshot.docs.map((doc) => doc.data() as ActivityLogEntry),
      page,
      pageSize,
    );
  },

  /**
   * Global, Super Admin only (Section 15), optionally filtered to one
   * project. Unfiltered reads use `orderBy` + `limit` (a single-field
   * index, auto-created by Firestore) to cap how much is ever read;
   * filtered reads fall back to `listForProject`'s where-only approach.
   */
  async listGlobal(
    params: ListActivityLogParams & { projectId?: string } = {},
  ): Promise<ListActivityLogResult> {
    const { projectId, page = 1, pageSize = 20 } = params;
    if (projectId) {
      return activityLogService.listForProject(projectId, { page, pageSize });
    }

    const snapshot = await firestore
      .collection(ACTIVITY_LOGS_COLLECTION)
      .orderBy("timestamp", "desc")
      .limit(500)
      .get();
    return paginate(
      snapshot.docs.map((doc) => doc.data() as ActivityLogEntry),
      page,
      pageSize,
    );
  },
};
