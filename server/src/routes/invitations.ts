import { Router } from "express";
import { z } from "zod";
import { verifyFirebaseToken } from "../middleware/auth";
import { sensitiveActionRateLimiter } from "../middleware/security";
import { asyncHandler } from "../utils/asyncHandler";
import { invitationService } from "../services/invitationService";

export const invitationsRouter = Router();

const acceptInvitationSchema = z.object({
  displayName: z.string().trim().max(120).optional(),
});

/**
 * Public — no session required. Lets the invitation-acceptance page show
 * "You've been invited to {project} by {inviter}" before the invitee has
 * even created an account (Section 3.4).
 */
invitationsRouter.get(
  "/:token",
  asyncHandler(async (req, res) => {
    const preview = await invitationService.getPublicInvitationInfo(req.params.token!);
    res.json(preview);
  }),
);

/**
 * Token-authenticated, not session-authenticated (Section 15) — the caller
 * has no Membership yet by definition, so `requireProjectPermission`
 * doesn't apply. Still requires a real Firebase session (`verifyFirebaseToken`)
 * so the resulting Membership has somewhere to attach.
 */
invitationsRouter.post(
  "/:token/accept",
  sensitiveActionRateLimiter,
  verifyFirebaseToken,
  asyncHandler(async (req, res) => {
    const { displayName } = acceptInvitationSchema.parse(req.body);
    const result = await invitationService.acceptInvitation(
      req.params.token!,
      req.firebaseUid!,
      req.firebaseEmail!,
      displayName,
    );
    res.json(result);
  }),
);
