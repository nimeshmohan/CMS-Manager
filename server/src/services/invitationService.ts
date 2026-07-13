import { randomBytes } from "node:crypto";
import type {
  AppUser,
  CreateInvitationInput,
  Invitation,
  InvitationPreview,
  Membership,
  ProjectInvitation,
} from "@cms-manager/shared";
import { firestore } from "../config/firebaseAdmin";
import { AppError } from "../utils/AppError";
import { membershipService } from "./membershipService";
import { projectService } from "./projectService";
import { roleService } from "./roleService";

const INVITATIONS_COLLECTION = "invitations";
const INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function generateToken(): string {
  return randomBytes(32).toString("hex");
}

async function getInvitationByToken(token: string): Promise<Invitation | null> {
  const doc = await firestore.collection(INVITATIONS_COLLECTION).doc(token).get();
  return doc.exists ? (doc.data() as Invitation) : null;
}

function isExpired(invitation: Invitation): boolean {
  return new Date(invitation.expiresAt).getTime() < Date.now();
}

async function resolveUserEmail(userId: string): Promise<string> {
  const doc = await firestore.collection("users").doc(userId).get();
  return doc.exists ? (doc.data() as Omit<AppUser, "uid">).email : "unknown";
}

export const invitationService = {
  /** Doc id is the token itself — a single-use, cryptographically random, time-limited grant (Section 9). */
  async createInvitation(
    projectId: string,
    input: CreateInvitationInput,
    invitedBy: string,
  ): Promise<Invitation> {
    const token = generateToken();
    const now = new Date();
    const invitation: Invitation = {
      id: token,
      projectId,
      email: input.email,
      roleId: input.roleId,
      isProjectManager: input.isProjectManager,
      collectionPermissions: input.collectionPermissions,
      token,
      invitedBy,
      invitedAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + INVITATION_TTL_MS).toISOString(),
      status: "pending",
    };
    await firestore.collection(INVITATIONS_COLLECTION).doc(token).set(invitation);
    return invitation;
  },

  async listPendingInvitationsForProject(
    projectId: string,
  ): Promise<ProjectInvitation[]> {
    const snapshot = await firestore
      .collection(INVITATIONS_COLLECTION)
      .where("projectId", "==", projectId)
      .where("status", "==", "pending")
      .get();

    const invitations = snapshot.docs.map((doc) => doc.data() as Invitation);
    return Promise.all(
      invitations.map(async (invitation) => ({
        ...invitation,
        invitedByEmail: await resolveUserEmail(invitation.invitedBy),
      })),
    );
  },

  async revokeInvitation(projectId: string, invitationId: string): Promise<void> {
    const docRef = firestore.collection(INVITATIONS_COLLECTION).doc(invitationId);
    const doc = await docRef.get();
    if (!doc.exists || (doc.data() as Invitation).projectId !== projectId) {
      throw new AppError("Invitation not found.", 404);
    }
    await docRef.update({ status: "revoked" });
  },

  /** Safe preview for a not-yet-authenticated invitee — no token value, no permission internals (Section 9). */
  async getPublicInvitationInfo(token: string): Promise<InvitationPreview> {
    const invitation = await getInvitationByToken(token);
    if (!invitation || invitation.status !== "pending" || isExpired(invitation)) {
      throw new AppError("This invitation is invalid or has expired.", 404);
    }

    const [project, role, invitedByEmail] = await Promise.all([
      projectService.getProject(invitation.projectId),
      roleService.getRole(invitation.roleId),
      resolveUserEmail(invitation.invitedBy),
    ]);
    if (!project) {
      throw new AppError("This invitation is invalid or has expired.", 404);
    }

    return {
      email: invitation.email,
      projectName: project.name,
      roleName: role?.name ?? "Member",
      invitedByEmail,
      expiresAt: invitation.expiresAt,
    };
  },

  /**
   * Converts a pending Invitation into an active Membership (Section 3.4).
   * If the invitee has no Firestore profile yet, this is the one place one
   * gets created — accepting an invitation is how a brand-new account
   * comes into existence (Section 8: no open self-registration). If the
   * invitee is already a member of this project (e.g. invited again for
   * more collections), the new grants are merged into their existing
   * Membership instead of failing.
   */
  async acceptInvitation(
    token: string,
    firebaseUid: string,
    firebaseEmail: string,
    displayName: string | undefined,
  ): Promise<{ membership: Membership; projectId: string }> {
    const invitation = await getInvitationByToken(token);
    if (!invitation || invitation.status !== "pending") {
      throw new AppError("This invitation is no longer valid.", 400);
    }
    if (isExpired(invitation)) {
      throw new AppError("This invitation has expired.", 400);
    }
    // Never let the invitation's target email be silently swapped to escalate access (Section 9).
    if (invitation.email.toLowerCase() !== firebaseEmail.toLowerCase()) {
      throw new AppError(
        "This invitation was sent to a different email address.",
        403,
      );
    }

    const userDocRef = firestore.collection("users").doc(firebaseUid);
    const userDoc = await userDocRef.get();
    if (!userDoc.exists) {
      const newUser: Omit<AppUser, "uid"> = {
        email: firebaseEmail,
        displayName: displayName?.trim() || firebaseEmail.split("@")[0]!,
        isSuperAdmin: false,
        disabled: false,
        createdAt: new Date().toISOString(),
        createdBy: invitation.invitedBy,
      };
      await userDocRef.set(newUser);
    } else if ((userDoc.data() as Omit<AppUser, "uid">).disabled) {
      throw new AppError(
        "This account has been disabled. Contact an administrator.",
        403,
      );
    }

    const existingMembership = await membershipService.getMembership(
      invitation.projectId,
      firebaseUid,
    );

    let membership: Membership;
    if (existingMembership) {
      const merged = [...existingMembership.collectionPermissions];
      for (const incoming of invitation.collectionPermissions) {
        const index = merged.findIndex((p) => p.collectionId === incoming.collectionId);
        if (index >= 0) merged[index] = incoming;
        else merged.push(incoming);
      }
      membership = await membershipService.updateCollectionPermissions(
        invitation.projectId,
        firebaseUid,
        merged,
      );
    } else {
      membership = await membershipService.createMembership({
        projectId: invitation.projectId,
        userId: firebaseUid,
        roleId: invitation.roleId,
        isProjectManager: invitation.isProjectManager,
        collectionPermissions: invitation.collectionPermissions,
        invitedBy: invitation.invitedBy,
      });
    }

    await firestore
      .collection(INVITATIONS_COLLECTION)
      .doc(token)
      .update({ status: "accepted" });

    return { membership, projectId: invitation.projectId };
  },
};
