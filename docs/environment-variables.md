# Environment Variables Reference

Each workspace loads its own `.env` file — there is no shared root `.env`.
Copy the matching `.env.example` in each workspace and fill in real values.

Nothing project-specific (CMS credentials, site IDs, collection IDs, field
mappings) lives in environment variables — that's all database-backed,
per-project configuration entered through the app itself (Section 7). What
remains here is global infrastructure only.

## `server/.env`

| Variable | Required | Description |
| --- | --- | --- |
| `FIREBASE_PROJECT_ID` | Yes | `project_id` from your Firebase service account JSON (Firebase Console → Project Settings → Service Accounts). |
| `FIREBASE_CLIENT_EMAIL` | Yes | `client_email` from the same service account JSON. |
| `FIREBASE_PRIVATE_KEY` | Yes | `private_key` from the same service account JSON, including the `-----BEGIN/END PRIVATE KEY-----` lines. Keep the `\n` sequences literal in `.env` — the app converts them to real newlines at startup. |
| `PORT` | No (default `4000`) | Port the Express server listens on. Render sets this automatically in production. |
| `NODE_ENV` | No (default `development`) | `production` on Render; controls error detail exposure and log format. |
| `CLIENT_ORIGIN` | Yes | The deployed client's exact origin (e.g. `https://cms-manager-client.onrender.com`), used for the CORS allowlist. Must match exactly — no trailing slash. |
| `ENCRYPTION_KEY` | Yes | AES-256-GCM key for encrypting per-project CMS credentials at rest (Section 9) — 64 hex characters (32 bytes). Generate with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. |
| `WEBFLOW_OAUTH_CLIENT_ID` | No | Webflow OAuth app client ID. Without it, "Sign in with Webflow" returns a clear error and API Token connection still works fully (Section 4.3). |
| `WEBFLOW_OAUTH_CLIENT_SECRET` | No | Paired with the client ID above. |
| `WEBFLOW_OAUTH_REDIRECT_URI` | No | Must exactly match the single redirect URI registered with your Webflow OAuth app — a static URL (`.../api/projects/connect/oauth/callback`), not per-project, since Webflow requires an exact match on callback. |

**Not yet read by any code** — Section 12's transactional email provider was
explicitly deferred; invitations currently return a copyable accept link
instead of sending mail. When a provider is wired in, it'll need its own API
key and a from-address here.

## `client/.env`

| Variable | Required | Description |
| --- | --- | --- |
| `VITE_FIREBASE_API_KEY` | Yes | Firebase client SDK config. Safe to expose in the browser bundle — not a secret. |
| `VITE_FIREBASE_AUTH_DOMAIN` | Yes | Same. |
| `VITE_FIREBASE_PROJECT_ID` | Yes | Same. |
| `VITE_FIREBASE_STORAGE_BUCKET` | Yes | Same. |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Yes | Same. |
| `VITE_FIREBASE_APP_ID` | Yes | Same. |
| `VITE_API_BASE_URL` | Yes | Base URL of the deployed backend API (e.g. `https://cms-manager-server.onrender.com`). No trailing slash. |

Both the server and client validate their required env vars at startup and
fail immediately with a clear error if anything is missing — you won't hit a
cryptic runtime failure later.
