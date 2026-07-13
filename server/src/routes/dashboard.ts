import { Router } from "express";
import { verifyAuth, requireSuperAdmin } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";
import { dashboardService } from "../services/dashboardService";

export const dashboardRouter = Router();

dashboardRouter.use(verifyAuth, requireSuperAdmin);

/** Platform-wide summary — Super Admin only (Section 11). Per-project summaries live at `/api/projects/:id/dashboard/summary`. */
dashboardRouter.get(
  "/summary",
  asyncHandler(async (_req, res) => {
    const summary = await dashboardService.getPlatformSummary();
    res.json(summary);
  }),
);
