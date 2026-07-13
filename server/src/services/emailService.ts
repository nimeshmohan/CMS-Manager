import { logger } from "../utils/logger";

export interface SendInvitationEmailInput {
  to: string;
  projectName: string;
  invitedByEmail: string;
  acceptUrl: string;
}

/**
 * Kept behind this interface specifically so a real provider (Resend,
 * Postmark, SendGrid — Section 12) can be dropped in later without
 * touching any caller. No provider is wired up yet — every "sent" email
 * just gets logged, and the invitation route always returns the accept
 * URL directly in its response so a Project Manager can copy/share it
 * manually in the meantime.
 */
export interface EmailService {
  sendInvitationEmail(input: SendInvitationEmailInput): Promise<void>;
}

export const emailService: EmailService = {
  async sendInvitationEmail(input: SendInvitationEmailInput): Promise<void> {
    logger.info("Invitation email not sent — no email provider configured", {
      to: input.to,
      projectName: input.projectName,
      invitedByEmail: input.invitedByEmail,
      acceptUrl: input.acceptUrl,
    });
  },
};
