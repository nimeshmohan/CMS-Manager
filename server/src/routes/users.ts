import { Router } from "express";
import { z } from "zod";
import { verifyAuth, requireSuperAdmin } from "../middleware/auth";
import { sensitiveActionRateLimiter } from "../middleware/security";
import { asyncHandler } from "../utils/asyncHandler";
import { AppError } from "../utils/AppError";
import { userService } from "../services/userService";
import { activityLogService } from "../services/activityLogService";

export const usersRouter = Router();

usersRouter.use(verifyAuth, requireSuperAdmin);

const updateUserSchema = z.object({
  isSuperAdmin: z.boolean().optional(),
  disabled: z.boolean().optional(),
});

usersRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const users = await userService.listUsers();
    res.json({ users });
  }),
);

/**
 * Handles both promote/demote and disable/enable — kept as one route since
 * both are the same shape of change (flip a boolean on a user profile) and
 * both need the same self-protection guard against a Super Admin locking
 * themselves out (Section 9).
 */
usersRouter.patch(
  "/:uid",
  sensitiveActionRateLimiter,
  asyncHandler(async (req, res) => {
    const { isSuperAdmin, disabled } = updateUserSchema.parse(req.body);
    const targetUid = req.params.uid!;
    const isSelf = targetUid === req.user!.uid;

    if (isSelf && disabled === true) {
      throw new AppError("You can't disable your own account.", 400);
    }
    if (isSelf && isSuperAdmin === false) {
      const remaining = await userService.countSuperAdmins();
      if (remaining <= 1) {
        throw new AppError(
          "You can't remove your own Super Admin access — you're the last one. Promote another user first.",
          400,
        );
      }
    }

    const previousData = await userService.getUser(targetUid);
    let user = previousData;

    if (isSuperAdmin !== undefined) {
      user = await userService.setSuperAdmin(targetUid, isSuperAdmin);
      await activityLogService.logActivity({
        projectId: null,
        userId: req.user!.uid,
        userEmail: req.user!.email,
        action: "UPDATE_USER_ROLE",
        collectionId: null,
        itemId: null,
        targetUserId: targetUid,
        previousData,
        newData: user,
      });
    }

    if (disabled !== undefined) {
      const before = user;
      user = await userService.setDisabled(targetUid, disabled);
      await activityLogService.logActivity({
        projectId: null,
        userId: req.user!.uid,
        userEmail: req.user!.email,
        action: disabled ? "DISABLE_USER" : "ENABLE_USER",
        collectionId: null,
        itemId: null,
        targetUserId: targetUid,
        previousData: before,
        newData: user,
      });
    }

    res.json({ user });
  }),
);

/** Hard delete — a Super Admin cannot delete their own account (Section 9). */
usersRouter.delete(
  "/:uid",
  sensitiveActionRateLimiter,
  asyncHandler(async (req, res) => {
    const targetUid = req.params.uid!;
    if (targetUid === req.user!.uid) {
      throw new AppError("You can't delete your own account.", 400);
    }

    const deleted = await userService.deleteUser(targetUid);

    await activityLogService.logActivity({
      projectId: null,
      userId: req.user!.uid,
      userEmail: req.user!.email,
      action: "DELETE_USER",
      collectionId: null,
      itemId: null,
      targetUserId: targetUid,
      previousData: deleted,
      newData: null,
    });

    res.status(204).end();
  }),
);

/** No email provider is wired up yet — returns the reset link directly for the Super Admin to share (Section 12). */
usersRouter.post(
  "/:uid/reset-password",
  sensitiveActionRateLimiter,
  asyncHandler(async (req, res) => {
    const targetUid = req.params.uid!;
    const resetUrl = await userService.generatePasswordResetLink(targetUid);

    await activityLogService.logActivity({
      projectId: null,
      userId: req.user!.uid,
      userEmail: req.user!.email,
      action: "RESET_PASSWORD",
      collectionId: null,
      itemId: null,
      targetUserId: targetUid,
      previousData: null,
      newData: null,
    });

    res.json({ resetUrl });
  }),
);
