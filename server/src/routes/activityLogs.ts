import { Router } from "express";
import { z } from "zod";
import { verifyAuth, requireSuperAdmin } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";
import { activityLogService } from "../services/activityLogService";

export const activityLogsRouter = Router();

activityLogsRouter.use(verifyAuth, requireSuperAdmin);

const listQuerySchema = z.object({
  projectId: z.string().trim().min(1).optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
});

/** Global — Super Admin only, optionally filtered to one project (Section 15). Per-project-scoped access (Project Manager) is `/api/projects/:id/activity-logs`. */
activityLogsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const query = listQuerySchema.parse(req.query);
    const result = await activityLogService.listGlobal(query);
    res.json(result);
  }),
);
