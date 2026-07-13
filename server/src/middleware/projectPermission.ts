import type { RequestHandler } from "express";
import { AppError } from "../utils/AppError";
import { asyncHandler } from "../utils/asyncHandler";
import { projectService } from "../services/projectService";
import { membershipService } from "../services/membershipService";

type ProjectAction = "view" | "manage";

/**
 * Loads the project named by `req.params.id`, resolves the caller's
 * authority over it, and attaches it as `req.project` for the route
 * handler. "view" only requires *some* Membership on the project (or Super
 * Admin); "manage" requires `membership.isProjectManager` (Section 3.3's
 * settings/connection/collections/members authority).
 *
 * A missing project and a project the caller has no Membership on return
 * the identical 404 — never leaking which case it was (Section 9).
 */
export function requireProjectPermission(action: ProjectAction): RequestHandler {
  return asyncHandler(async (req, _res, next) => {
    if (!req.user) {
      throw new AppError("Authentication required.", 401);
    }

    const projectId = req.params.id;
    if (!projectId) {
      throw new AppError("Project not found.", 404);
    }

    const project = await projectService.getProject(projectId);
    if (!project) {
      throw new AppError("Project not found.", 404);
    }

    if (req.user.isSuperAdmin) {
      req.project = project;
      next();
      return;
    }

    const membership = await membershipService.getMembership(
      projectId,
      req.user.uid,
    );
    if (!membership) {
      throw new AppError("Project not found.", 404);
    }

    if (action === "manage" && !membership.isProjectManager) {
      throw new AppError(
        "You do not have permission to perform this action.",
        403,
      );
    }

    req.project = project;
    next();
  });
}
