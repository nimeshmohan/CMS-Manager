import { env } from "../config/env";
import { AppError } from "../utils/AppError";

const AUTHORIZE_URL = "https://webflow.com/oauth/authorize";
const TOKEN_URL = "https://api.webflow.com/oauth/access_token";
const REVOKE_URL = "https://webflow.com/oauth/revoke_authorization";

/** Exactly what this app needs (Section 4.3) — not the broader set Webflow's OAuth also offers (assets, pages, forms, custom code, authorized_user). */
const SCOPES = ["sites:read", "cms:read", "cms:write"];

interface TokenExchangeResult {
  accessToken: string;
  refreshToken?: string;
}

function requireOAuthConfig(): NonNullable<typeof env.webflowOAuth> {
  if (!env.webflowOAuth) {
    throw new AppError(
      "Webflow OAuth is not configured on this server. Use an API token instead.",
      501,
    );
  }
  return env.webflowOAuth;
}

export function buildAuthorizeUrl(state: string): string {
  const config = requireOAuthConfig();
  const url = new URL(AUTHORIZE_URL);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("redirect_uri", config.redirectUri);
  url.searchParams.set("scope", SCOPES.join(" "));
  url.searchParams.set("state", state);
  return url.toString();
}

export function isOAuthConfigured(): boolean {
  return env.webflowOAuth !== null;
}

/** The authorization code is short-lived (minutes) and must be exchanged immediately (Section 4.3). */
export async function exchangeCodeForToken(
  code: string,
): Promise<TokenExchangeResult> {
  const config = requireOAuthConfig();

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code,
      grant_type: "authorization_code",
    }),
  });

  if (!response.ok) {
    throw new AppError(
      "Failed to connect to Webflow — the authorization code may have expired. Please try again.",
      502,
    );
  }

  const data = (await response.json()) as {
    access_token: string;
    refresh_token?: string;
  };

  return { accessToken: data.access_token, refreshToken: data.refresh_token };
}

/** Best-effort — used when a project disconnects/reconnects; failures here shouldn't block the local disconnect. */
export async function revokeAuthorization(accessToken: string): Promise<void> {
  const config = requireOAuthConfig();
  await fetch(REVOKE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      access_token: accessToken,
    }),
  }).catch(() => undefined);
}
