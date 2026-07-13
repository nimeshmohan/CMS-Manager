# Deployment Guide (Render)

This app deploys as two Render services from a single `render.yaml` Blueprint:

- **`cms-manager-server`** — the Express API (Node web service)
- **`cms-manager-client`** — the React dashboard (static site)

Follow these steps in order — the two services need each other's URLs, so
there's a "deploy once, fill in URLs, redeploy" step you can't skip. This
matches the sequence Section 19 of the spec calls out explicitly.

## Prerequisites

- Code pushed to a GitHub repository
- A [Render](https://render.com) account
- A Firebase project, with **Email/Password** sign-in enabled under
  Authentication → Sign-in method
- A Firebase **service account** for the Admin SDK: Firebase Console →
  Project Settings → Service Accounts → Generate new private key. This
  downloads a JSON file containing `project_id`, `client_email`, and
  `private_key` — you need these three values, not the file itself
- The Firebase project's **client SDK config** (Project Settings → General →
  Your apps → SDK setup and configuration) for the `VITE_FIREBASE_*` values
- Nothing Webflow-specific is needed up front — CMS connections are
  configured per-project through the app itself after you're logged in
  (Section 4.3/4.4), not via environment variables. See
  [`webflow-connection.md`](webflow-connection.md).

## 1. Create the Blueprint

In the Render dashboard: **New +** → **Blueprint** → connect your GitHub repo.
Render detects `render.yaml` automatically and shows both services.

## 2. Fill in the secret environment variables

Render prompts for every `sync: false` variable during Blueprint creation.
Have these ready:

**`cms-manager-server`**

| Variable | Value |
| --- | --- |
| `CLIENT_ORIGIN` | Leave a placeholder for now (e.g. `https://placeholder.onrender.com`) — you'll fix this in step 4 |
| `FIREBASE_PROJECT_ID` | `project_id` from the service account JSON |
| `FIREBASE_CLIENT_EMAIL` | `client_email` from the service account JSON |
| `FIREBASE_PRIVATE_KEY` | `private_key` from the service account JSON, including the `-----BEGIN/END PRIVATE KEY-----` lines |
| `ENCRYPTION_KEY` | Generate with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` — must be exactly 64 hex characters (Section 9) |
| `WEBFLOW_OAUTH_CLIENT_ID` / `_CLIENT_SECRET` / `_REDIRECT_URI` | Optional — leave blank for now. API Token connection works without them; fill these in later if you register a Webflow OAuth app (see [`webflow-connection.md`](webflow-connection.md)) |

**`cms-manager-client`**

| Variable | Value |
| --- | --- |
| `VITE_FIREBASE_API_KEY` | From your Firebase project's client SDK config |
| `VITE_FIREBASE_AUTH_DOMAIN` | Same |
| `VITE_FIREBASE_PROJECT_ID` | Same |
| `VITE_FIREBASE_STORAGE_BUCKET` | Same |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Same |
| `VITE_FIREBASE_APP_ID` | Same |
| `VITE_API_BASE_URL` | Leave a placeholder for now — you'll fix this in step 4 |

The Firebase client values are safe to expose (they're not secrets), but
they're still marked `sync: false` so they aren't hardcoded into version
control.

## 3. Wait for the first deploy

Render builds and deploys both services. This first deploy is partially
broken — the server's CORS allowlist points at a placeholder, and the client
points at a placeholder API — but it gets you real URLs. Note both:

- `https://cms-manager-server-xxxx.onrender.com`
- `https://cms-manager-client-xxxx.onrender.com`

## 4. Fix the cross-service URLs and redeploy

Back in the Render dashboard:

1. Open `cms-manager-server` → Environment → set `CLIENT_ORIGIN` to the real
   client URL from step 3.
2. Open `cms-manager-client` → Environment → set `VITE_API_BASE_URL` to the
   real server URL from step 3.
3. Manually redeploy both services (Environment changes trigger this
   automatically on Render, but confirm both show a fresh deploy).

If you later register a Webflow OAuth app (Section 4.3), its registered
redirect URI has the same chicken-and-egg timing — it must point at
`https://<real-server-url>/api/projects/connect/oauth/callback`, which you
only know after this step. Update `WEBFLOW_OAUTH_REDIRECT_URI` on the server
and the redirect URI registered in the Webflow developer dashboard together.

## 5. Seed roles and bootstrap your first Super Admin

Both scripts talk directly to Firebase (Auth + Firestore), not to the
Render-hosted server, so they run from your own machine against the same
production Firebase project — it doesn't matter that the server itself is
hosted elsewhere:

```bash
# server/.env must have the SAME Firebase Admin credentials you gave Render
npm run seed-roles -w server
npm run create-super-admin -w server -- you@example.com "a-strong-temporary-password" "Your Name"
```

There's no self-registration (Section 8) — every other account is created
by accepting a project invitation.

## 6. Verify

Visit the client URL, sign in with the Super Admin account you just created,
and confirm the Project Manager Dashboard loads. Then check
`https://<server-url>/api/health` returns `{"status":"ok"}`.

## Troubleshooting

| Symptom | Likely cause |
| --- | --- |
| Login succeeds but the app immediately signs you back out | `CLIENT_ORIGIN` on the server doesn't match the client's real URL exactly (CORS rejects the request to `/api/me`) |
| Every API call fails with a network error | `VITE_API_BASE_URL` on the client is wrong, or the server service is still deploying/crashed — check its logs |
| 401 on every request even with a valid session | Firebase Admin credentials on the server are wrong — `FIREBASE_PRIVATE_KEY` is the usual culprit (must include the full `-----BEGIN/END-----` block) |
| Server won't boot: "ENCRYPTION_KEY must be a 64-character hex string" | Regenerate it with the command in step 2 — don't hand-type a value |
| "Sign in with Webflow" returns an error immediately | `WEBFLOW_OAUTH_CLIENT_ID`/`_SECRET`/`_REDIRECT_URI` aren't set — use "Use an API Token" instead, or finish registering the OAuth app |
| Inviting a member shows a link but nothing is emailed | Expected — no email provider is wired up yet (Section 12); copy/share the accept link shown in the dialog |
