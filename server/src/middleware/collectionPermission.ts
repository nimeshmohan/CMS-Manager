import type { RequestHandler } from "express";
import type { CollectionPermissionKey } from "@cms-manager/shared";
import { AppError } from "../utils/AppError";
import { asyncHandler } from "../utils/asyncHandler";
import { projectService } from "../services/projectService";
import { membershipService } from "../services/membershipService";

const FULL_ACCESS: Record<CollectionPermissionKey, boolean> = {
  canView: true,
  canCreate: true,
  canEdit: true,
  canDelete: true,
  canPublish: true,
};

/**
 * Loads the project and collection named by `req.params.id` /
 * `req.params.collectionId`, resolves the caller's specific permission
 * (`canView`/`canCreate`/`canEdit`/`canDelete`/`canPublish`) on that
 * collection, and attaches project/collection/the full resolved grant to
 * the request. Every case that isn't authorized — project missing,
 * collection missing, no Membership, or a Membership without this
 * specific grant — returns the identical 404, never leaking which one it
 * was (Section 9). An array of actions authorizes on any one of them
 * (e.g. asset upload, needed by both the create and edit forms).
 */
export function requireCollectionPermission(
  action: CollectionPermissionKey | CollectionPermissionKey[],
): RequestHandler {
  const actions = Array.isArray(action) ? action : [action];
  return asyncHandler(async (req, _res, next) => {
    if (!req.user) {
      throw new AppError("Authentication required.", 401);
    }

    const projectId = req.params.id;
    const collectionId = req.params.collectionId;
    if (!projectId || !collectionId) {
      throw new AppError("Collection not found.", 404);
    }

    const project = await projectService.getProject(projectId);
    if (!project) {
      throw new AppError("Collection not found.", 404);
    }

    const collection = project.collections.find((c) => c.id === collectionId);
    if (!collection) {
      throw new AppError("Collection not found.", 404);
    }

    if (req.user.isSuperAdmin) {
      req.project = project;
      req.collection = collection;
      req.collectionPermissions = FULL_ACCESS;
      next();
      return;
    }

    const membership = await membershipService.getMembership(
      projectId,
      req.user.uid,
    );
    if (!membership) {
      throw new AppError("Collection not found.", 404);
    }

    const permission = membership.collectionPermissions.find(
      (p) => p.collectionId === collectionId,
    );
    if (!permission || !actions.some((a) => permission[a])) {
      throw new AppError("Collection not found.", 404);
    }

    req.project = project;
    req.collection = collection;
    req.collectionPermissions = {
      canView: permission.canView,
      canCreate: permission.canCreate,
      canEdit: permission.canEdit,
      canDelete: permission.canDelete,
      canPublish: permission.canPublish,
    };
    next();
  });
}
