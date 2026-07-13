import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

/**
 * Only variables actually consumed by code that exists today are validated
 * here. Email-provider config is added in the phase that introduces the
 * code reading it — validating an unread var at boot isn't safety, it's a
 * deploy blocker for a feature that isn't there yet.
 *
 * Webflow OAuth vars are optional: Section 4.3's recommendation is that
 * API-token onboarding must never be blocked on OAuth Marketplace approval
 * or even on an operator having registered a Webflow OAuth app yet. The
 * OAuth-start route itself returns a clear error if these are unset,
 * rather than the whole server refusing to boot.
 */
const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  CLIENT_ORIGIN: z.string().min(1, "CLIENT_ORIGIN is required"),
  FIREBASE_PROJECT_ID: z.string().min(1, "FIREBASE_PROJECT_ID is required"),
  FIREBASE_CLIENT_EMAIL: z
    .string()
    .email("FIREBASE_CLIENT_EMAIL must be a valid email"),
  FIREBASE_PRIVATE_KEY: z.string().min(1, "FIREBASE_PRIVATE_KEY is required"),
  // AES-256-GCM key, 32 bytes hex-encoded (64 hex characters).
  ENCRYPTION_KEY: z
    .string()
    .regex(
      /^[0-9a-fA-F]{64}$/,
      "ENCRYPTION_KEY must be a 64-character hex string (32 bytes) — generate one with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\"",
    ),
  WEBFLOW_OAUTH_CLIENT_ID: z.string().min(1).optional(),
  WEBFLOW_OAUTH_CLIENT_SECRET: z.string().min(1).optional(),
  WEBFLOW_OAUTH_REDIRECT_URI: z.string().min(1).optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // Fail fast and loud at boot rather than surfacing cryptic errors mid-request later.
  console.error(
    "Invalid or missing environment variables:\n" +
      JSON.stringify(parsed.error.flatten().fieldErrors, null, 2),
  );
  throw new Error(
    "Server cannot start: invalid environment configuration. Check server/.env against server/.env.example.",
  );
}

const data = parsed.data;

const webflowOAuthConfigured =
  data.WEBFLOW_OAUTH_CLIENT_ID &&
  data.WEBFLOW_OAUTH_CLIENT_SECRET &&
  data.WEBFLOW_OAUTH_REDIRECT_URI;

export const env = {
  nodeEnv: data.NODE_ENV,
  isProduction: data.NODE_ENV === "production",
  port: data.PORT,
  clientOrigin: data.CLIENT_ORIGIN,
  firebase: {
    projectId: data.FIREBASE_PROJECT_ID,
    clientEmail: data.FIREBASE_CLIENT_EMAIL,
    // .env files store the PEM key with literal "\n" sequences; convert to real newlines.
    privateKey: data.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
  },
  encryptionKey: Buffer.from(data.ENCRYPTION_KEY, "hex"),
  webflowOAuth: webflowOAuthConfigured
    ? {
        clientId: data.WEBFLOW_OAUTH_CLIENT_ID!,
        clientSecret: data.WEBFLOW_OAUTH_CLIENT_SECRET!,
        redirectUri: data.WEBFLOW_OAUTH_REDIRECT_URI!,
      }
    : null,
} as const;
