import { Router } from "express";
import { z } from "zod";
import type { AppUser } from "@cms-manager/shared";
import { createProjectSchema, updateProjectSchema } from "@cms-manager/shared";
import { verifyAuth } from "../middleware/auth";
import { requireProjectPermission } from "../middleware/projectPermission";
import { sensitiveActionRateLimiter } from "../middleware/security";
import { asyncHandler } from "../utils/asyncHandler";
import { env } from "../config/env";
import { firestore } from "../config/firebaseAdmin";
import { projectService } from "../services/projectService";
import { membershipService } from "../services/membershipService";
import { invitationService } from "../services/invitationService";
import { activityLogService } from "../services/activityLogService";
import { dashboardService } from "../services/dashboardService";
import { oauthStateService } from "../services/oauthStateService";
import {
  buildAuthorizeUrl,
  exchangeCodeForToken,
} from "../services/webflowOAuthService";

export const projectsRouter = Router();

const duplicateProjectSchema = z.object({
  name: z.string().trim().min(1, "Project name is required").max(120),
});

const archiveProjectSchema = z.object({
  archived: z.boolean(),
});

const connectTokenSchema = z.object({
  apiToken: z.string().trim().min(1, "API token is required"),
});

const selectSiteSchema = z.object({
  siteId: z.string().trim().min(1, "siteId is required"),
});

const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
});

const addCollectionSchema = z.object({
  providerCollectionId: z.string().trim().min(1, "providerCollectionId is required"),
  name: z.string().trim().min(1, "Collection name is required").max(120),
});

/**
 * Hit by Webflow's own redirect after the user consents — not by this
 * app's authenticated client, so it can't go through `verifyAuth`.
 * Registered before `projectsRouter.use(verifyAuth)` below so Express
 * matches this path and returns without ever reaching that middleware.
 * Authorization instead comes from the CSRF `state` token (Section 9).
 *
 * The path is static (no `:id`) because Webflow's OAuth app registers
 * exactly one `redirect_uri` and requires an exact match on callback —
 * `state` is what carries which project/user started the flow, since it's
 * the only thing Webflow round-trips back unchanged.
 */
projectsRouter.get(
  "/connect/oauth/callback",
  asyncHandler(async (req, res) => {
    const { code, state } = req.query;

    if (typeof code !== "string" || typeof state !== "string") {
      res.redirect(`${env.clientOrigin}/projects?connectError=missing_params`);
      return;
    }

    const stateRecord = await oauthStateService.consumeState(state);
    if (!stateRecord) {
      res.redirect(`${env.clientOrigin}/projects?connectError=invalid_state`);
      return;
    }

    const redirectTo = new URL(
      `${env.clientOrigin}/projects/${stateRecord.projectId}`,
    );

    const { accessToken, refreshToken } = await exchangeCodeForToken(code);
    const { project } = await projectService.connectWithOAuth(
      stateRecord.projectId,
      accessToken,
      refreshToken,
    );

    const userDoc = await firestore
      .collection("users")
      .doc(stateRecord.userId)
      .get();
    const userEmail = userDoc.exists
      ? (userDoc.data() as Omit<AppUser, "uid">).email
      : "unknown";

    await activityLogService.logActivity({
      projectId: project.id,
      userId: stateRecord.userId,
      userEmail,
      action: "UPDATE_PROJECT",
      collectionId: null,
      itemId: null,
      targetUserId: null,
      previousData: null,
      newData: { connectionMethod: project.connectionMethod },
    });

    redirectTo.searchParams.set("connected", "1");
    res.redirect(redirectTo.toString());
  }),
);

projectsRouter.use(verifyAuth);

/** Scoped to the caller's Memberships (Section 4.2) — Super Admins see every project. */
projectsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const projects = await projectService.listProjectsForUser(req.user!);
    res.json({ projects: projects.map(projectService.toSafeProject) });
  }),
);

/** Any authenticated user may create a project; the creator becomes its first Project Manager (Section 3.3). */
projectsRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const input = createProjectSchema.parse(req.body);
    const project = await projectService.createProject({
      name: input.name,
      clientName: input.clientName,
      description: input.description ?? "",
      logoUrl: input.logoUrl ?? null,
      createdBy: req.user!.uid,
    });

    await activityLogService.logActivity({
      projectId: project.id,
      userId: req.user!.uid,
      userEmail: req.user!.email,
      action: "CREATE_PROJECT",
      collectionId: null,
      itemId: null,
      targetUserId: null,
      previousData: null,
      newData: project,
    });

    res.status(201).json({ project: projectService.toSafeProject(project) });
  }),
);

projectsRouter.get("/:id", requireProjectPermission("view"), (req, res) => {
  res.json({ project: projectService.toSafeProject(req.project!) });
});

projectsRouter.patch(
  "/:id",
  requireProjectPermission("manage"),
  asyncHandler(async (req, res) => {
    const patch = updateProjectSchema.parse(req.body);
    const previousData = req.project!;
    const project = await projectService.updateProject(req.params.id!, patch);

    await activityLogService.logActivity({
      projectId: project.id,
      userId: req.user!.uid,
      userEmail: req.user!.email,
      action: "UPDATE_PROJECT",
      collectionId: null,
      itemId: null,
      targetUserId: null,
      previousData,
      newData: project,
    });

    res.json({ project: projectService.toSafeProject(project) });
  }),
);

/** Hard delete — Project Manager or Super Admin only, irreversible (Section 4.2's type-to-confirm dialog lives client-side). */
projectsRouter.delete(
  "/:id",
  requireProjectPermission("manage"),
  asyncHandler(async (req, res) => {
    const previousData = req.project!;
    await projectService.deleteProject(req.params.id!);

    await activityLogService.logActivity({
      projectId: previousData.id,
      userId: req.user!.uid,
      userEmail: req.user!.email,
      action: "DELETE_PROJECT",
      collectionId: null,
      itemId: null,
      targetUserId: null,
      previousData,
      newData: null,
    });

    res.status(204).end();
  }),
);

/** Clones configuration under a new name; doesn't clone items, memberships, activity log, or the CMS connection (Section 4.2). */
projectsRouter.post(
  "/:id/duplicate",
  requireProjectPermission("view"),
  asyncHandler(async (req, res) => {
    const { name } = duplicateProjectSchema.parse(req.body);
    const duplicate = await projectService.duplicateProject(
      req.params.id!,
      name,
      req.user!.uid,
    );

    await activityLogService.logActivity({
      projectId: duplicate.id,
      userId: req.user!.uid,
      userEmail: req.user!.email,
      action: "DUPLICATE_PROJECT",
      collectionId: null,
      itemId: null,
      targetUserId: null,
      previousData: { duplicatedFrom: req.params.id },
      newData: duplicate,
    });

    res.status(201).json({ project: projectService.toSafeProject(duplicate) });
  }),
);

projectsRouter.post(
  "/:id/archive",
  requireProjectPermission("manage"),
  asyncHandler(async (req, res) => {
    const { archived } = archiveProjectSchema.parse(req.body);
    const previousData = req.project!;
    const project = await projectService.setArchived(req.params.id!, archived);

    await activityLogService.logActivity({
      projectId: project.id,
      userId: req.user!.uid,
      userEmail: req.user!.email,
      action: archived ? "ARCHIVE_PROJECT" : "UPDATE_PROJECT",
      collectionId: null,
      itemId: null,
      targetUserId: null,
      previousData,
      newData: project,
    });

    res.json({ project: projectService.toSafeProject(project) });
  }),
);

/** Returns the URL to redirect the browser to for Webflow's consent screen (Section 4.3/4.4). 501 if this server has no Webflow OAuth app configured — use the API token path instead. */
projectsRouter.get(
  "/:id/connect/oauth/start",
  requireProjectPermission("manage"),
  asyncHandler(async (req, res) => {
    const state = await oauthStateService.createState(
      req.params.id!,
      req.user!.uid,
    );
    res.json({ url: buildAuthorizeUrl(state) });
  }),
);

/** Validates the token against Webflow before persisting anything (Section 4.4 step 3), then stores it encrypted. */
projectsRouter.post(
  "/:id/connect/token",
  sensitiveActionRateLimiter,
  requireProjectPermission("manage"),
  asyncHandler(async (req, res) => {
    const { apiToken } = connectTokenSchema.parse(req.body);
    const previousData = req.project!;
    const { project, sites } = await projectService.connectWithApiToken(
      req.params.id!,
      apiToken,
    );

    await activityLogService.logActivity({
      projectId: project.id,
      userId: req.user!.uid,
      userEmail: req.user!.email,
      action: "UPDATE_PROJECT",
      collectionId: null,
      itemId: null,
      targetUserId: null,
      previousData: { connectionMethod: previousData.connectionMethod },
      newData: { connectionMethod: project.connectionMethod },
    });

    res.json({ project: projectService.toSafeProject(project), sites });
  }),
);

/** Re-fetches the site list for an already-connected project (site picker, or verifying "Reconnect" still works). */
projectsRouter.get(
  "/:id/sites",
  requireProjectPermission("manage"),
  asyncHandler(async (req, res) => {
    const sites = await projectService.listSitesForProject(req.params.id!);
    res.json({ sites });
  }),
);

projectsRouter.post(
  "/:id/site",
  requireProjectPermission("manage"),
  asyncHandler(async (req, res) => {
    const { siteId } = selectSiteSchema.parse(req.body);
    const previousData = req.project!;
    const project = await projectService.selectSite(req.params.id!, siteId);

    await activityLogService.logActivity({
      projectId: project.id,
      userId: req.user!.uid,
      userEmail: req.user!.email,
      action: "UPDATE_PROJECT",
      collectionId: null,
      itemId: null,
      targetUserId: null,
      previousData: { siteId: previousData.siteId },
      newData: { siteId: project.siteId },
    });

    res.json({ project: projectService.toSafeProject(project) });
  }),
);

/** Collections on the connected site not yet added to this project (Section 4.4 step 5). */
projectsRouter.get(
  "/:id/collections/available",
  requireProjectPermission("manage"),
  asyncHandler(async (req, res) => {
    const collections = await projectService.listAvailableCollections(
      req.params.id!,
    );
    res.json({ collections });
  }),
);

/** Adds one collection to the managed set; the acting Project Manager gets full permissions on it immediately (Section 3.3). */
projectsRouter.post(
  "/:id/collections",
  requireProjectPermission("manage"),
  asyncHandler(async (req, res) => {
    const { providerCollectionId, name } = addCollectionSchema.parse(req.body);
    const { project, collection } = await projectService.addCollection(
      req.params.id!,
      providerCollectionId,
      name,
    );
    await membershipService.grantFullCollectionAccess(
      req.params.id!,
      req.user!.uid,
      collection.id,
    );

    await activityLogService.logActivity({
      projectId: project.id,
      userId: req.user!.uid,
      userEmail: req.user!.email,
      action: "UPDATE_PROJECT",
      collectionId: collection.id,
      itemId: null,
      targetUserId: null,
      previousData: null,
      newData: collection,
    });

    res
      .status(201)
      .json({ project: projectService.toSafeProject(project), collection });
  }),
);

projectsRouter.delete(
  "/:id/collections/:collectionId",
  requireProjectPermission("manage"),
  asyncHandler(async (req, res) => {
    const previousData =
      req.project!.collections.find((c) => c.id === req.params.collectionId) ??
      null;
    const project = await projectService.removeCollection(
      req.params.id!,
      req.params.collectionId!,
    );

    await activityLogService.logActivity({
      projectId: project.id,
      userId: req.user!.uid,
      userEmail: req.user!.email,
      action: "UPDATE_PROJECT",
      collectionId: req.params.collectionId!,
      itemId: null,
      targetUserId: null,
      previousData,
      newData: null,
    });

    res.json({ project: projectService.toSafeProject(project) });
  }),
);

/** Revokes a still-pending Invitation — doesn't affect any already-accepted Membership (Section 3.4). */
projectsRouter.post(
  "/:id/invitations/:invitationId/revoke",
  requireProjectPermission("manage"),
  asyncHandler(async (req, res) => {
    await invitationService.revokeInvitation(req.params.id!, req.params.invitationId!);

    await activityLogService.logActivity({
      projectId: req.params.id!,
      userId: req.user!.uid,
      userEmail: req.user!.email,
      action: "REVOKE_MEMBER",
      collectionId: null,
      itemId: null,
      targetUserId: null,
      previousData: { invitationId: req.params.invitationId },
      newData: null,
    });

    res.status(204).end();
  }),
);

/** Item counts aggregated across whichever collections the caller can view — any member, not just managers (Section 11). */
projectsRouter.get(
  "/:id/dashboard/summary",
  requireProjectPermission("view"),
  asyncHandler(async (req, res) => {
    let viewableCollectionIds: "all" | Set<string> = "all";
    if (!req.user!.isSuperAdmin) {
      const membership = await membershipService.getMembership(
        req.params.id!,
        req.user!.uid,
      );
      if (membership && !membership.isProjectManager) {
        viewableCollectionIds = new Set(
          membership.collectionPermissions
            .filter((p) => p.canView)
            .map((p) => p.collectionId),
        );
      }
    }

    const summary = await dashboardService.getProjectSummary(
      req.project!,
      viewableCollectionIds,
    );
    res.json(summary);
  }),
);

/** Scoped to this project — Project Manager or Super Admin only (Section 10). */
projectsRouter.get(
  "/:id/activity-logs",
  requireProjectPermission("manage"),
  asyncHandler(async (req, res) => {
    const { page, pageSize } = paginationQuerySchema.parse(req.query);
    const result = await activityLogService.listForProject(req.params.id!, {
      page,
      pageSize,
    });
    res.json(result);
  }),
);
