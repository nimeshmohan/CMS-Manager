import { Router } from "express";
import { verifyAuth } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";
import { roleService } from "../services/roleService";

export const rolesRouter = Router();

rolesRouter.use(verifyAuth);

/** Any authenticated user — the invite dialog's role dropdown needs this regardless of whether the viewer can actually invite anyone. */
rolesRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const roles = await roleService.listRoles();
    res.json({ roles });
  }),
);
