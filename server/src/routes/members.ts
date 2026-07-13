import { Router } from "express";
import { createInvitationSchema, updateMemberPermissionsSchema } from "@cms-manager/shared";
import { verifyAuth } from "../middleware/auth";
import { requireProjectPermission } from "../middleware/projectPermission";
import { sensitiveActionRateLimiter } from "../middleware/security";
import { asyncHandler } from "../utils/asyncHandler";
import { AppError } from "../utils/AppError";
import { env } from "../config/env";
import { membershipService } from "../services/membershipService";
import { invitationService } from "../services/invitationService";
import { emailService } from "../services/emailService";
import { activityLogService } from "../services/activityLogService";

/** `mergeParams` so `req.params.id` (project) from the mount path in app.ts reaches the route handlers here. */
export const membersRouter = Router({ mergeParams: true });

membersRouter.use(verifyAuth);

/** Current members (with resolved email/display name) plus pending invitations (with a Revoke action) — Section 4.2. Project Manager or Super Admin only. */
membersRouter.get(
  "/",
  requireProjectPermission("manage"),
  asyncHandler(async (req, res) => {
    const [members, invitations] = await Promise.all([
      membershipService.listMembersForProject(req.params.id!),
      invitationService.listPendingInvitationsForProject(req.params.id!),
    ]);
    res.json({ members, invitations });
  }),
);

/** Creates a pending Invitation and "sends" it (Section 3.4) — no email provider is wired up yet, so the accept URL is returned directly for the inviter to share. */
membersRouter.post(
  "/",
  sensitiveActionRateLimiter,
  requireProjectPermission("manage"),
  asyncHandler(async (req, res) => {
    const input = createInvitationSchema.parse(req.body);
    const invitation = await invitationService.createInvitation(
      req.params.id!,
      input,
      req.user!.uid,
    );

    const acceptUrl = `${env.clientOrigin}/invitations/${invitation.token}`;
    await emailService.sendInvitationEmail({
      to: invitation.email,
      projectName: req.project!.name,
      invitedByEmail: req.user!.email,
      acceptUrl,
    });

    await activityLogService.logActivity({
      projectId: req.project!.id,
      userId: req.user!.uid,
      userEmail: req.user!.email,
      action: "INVITE_MEMBER",
      collectionId: null,
      itemId: null,
      targetUserId: null,
      previousData: null,
      newData: { email: invitation.email, roleId: invitation.roleId },
    });

    res.status(201).json({ invitation, acceptUrl });
  }),
);

/** `:membershipId` is the member's userId — a Membership's natural unique key within a project. */
membersRouter.patch(
  "/:membershipId",
  sensitiveActionRateLimiter,
  requireProjectPermission("manage"),
  asyncHandler(async (req, res) => {
    const { collectionPermissions } = updateMemberPermissionsSchema.parse(req.body);
    const projectId = req.params.id!;
    const membershipId = req.params.membershipId!;

    const previousData = await membershipService.getMembership(projectId, membershipId);
    const membership = await membershipService.updateCollectionPermissions(
      projectId,
      membershipId,
      collectionPermissions,
    );

    await activityLogService.logActivity({
      projectId,
      userId: req.user!.uid,
      userEmail: req.user!.email,
      action: "UPDATE_MEMBER_PERMISSIONS",
      collectionId: null,
      itemId: null,
      targetUserId: membershipId,
      previousData,
      newData: membership,
    });

    res.json({ membership });
  }),
);

/** A Project Manager can't revoke their own last remaining Project Manager Membership — a project must always keep at least one able to administer it (Section 9). */
membersRouter.delete(
  "/:membershipId",
  requireProjectPermission("manage"),
  asyncHandler(async (req, res) => {
    const projectId = req.params.id!;
    const membershipId = req.params.membershipId!;

    const target = await membershipService.getMembership(projectId, membershipId);
    if (!target) {
      throw new AppError("Membership not found.", 404);
    }

    if (membershipId === req.user!.uid && target.isProjectManager) {
      const projectManagerCount = await membershipService.countProjectManagers(projectId);
      if (projectManagerCount <= 1) {
        throw new AppError(
          "You can't remove your own access — you're the last Project Manager on this project. Promote another member first.",
          400,
        );
      }
    }

    await membershipService.revokeMembership(projectId, membershipId);

    await activityLogService.logActivity({
      projectId,
      userId: req.user!.uid,
      userEmail: req.user!.email,
      action: "REVOKE_MEMBER",
      collectionId: null,
      itemId: null,
      targetUserId: membershipId,
      previousData: target,
      newData: null,
    });

    res.status(204).end();
  }),
);
