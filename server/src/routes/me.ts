import { Router } from "express";
import { verifyAuth } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";
import { membershipService } from "../services/membershipService";

export const meRouter = Router();

meRouter.use(verifyAuth);

/**
 * Returns the logged-in user's own profile plus their resolved project
 * Memberships (Section 15) — the client's `usePermissions` hook is built
 * against this shape once Projects exist (Phase 4). Super Admins typically
 * hold no Memberships at all; their access is derived from
 * `user.isSuperAdmin`, not from this list (Section 3.1).
 */
meRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const memberships = await membershipService.listMembershipsForUser(
      req.user!.uid,
    );
    res.json({ user: req.user, memberships });
  }),
);
