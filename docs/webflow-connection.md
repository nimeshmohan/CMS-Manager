# Connecting a Project to Webflow

Unlike the original single-project tool, nothing about a Webflow connection
lives in environment variables — every project connects independently,
configured entirely through the app (Section 4.3/4.4). This doc covers the
two connection methods and what to do once a project is connected.

## Choosing a connection method

A Project Manager sees both options on a project's detail page once the
project exists:

- **Use an API Token** — works immediately, for any project, with no setup
  beyond generating a token in Webflow. This is the recommended default
  until an OAuth app is registered (see below).
- **Sign in with Webflow (OAuth)** — nicer UX (no token to copy/paste,
  covers every site the user grants access to at once), but requires this
  app to have a registered Webflow OAuth app first. Until then, clicking it
  returns a clear "not configured" error and doesn't block anything — the
  API Token path is fully functional in the meantime.

### API Token

1. In Webflow: Site Settings → Apps & Integrations → API access → Generate
   a Site API token (or use a Workspace-level token if the project should
   manage multiple sites' collections over time — only one site is selected
   per project, but the token can be reused for future projects on the same
   workspace).
2. Scope it to `CMS:read` + `CMS:write`.
3. Paste it into the project's "Use an API Token" field. The app validates
   it against Webflow (`GET /v2/sites`) before saving anything — an invalid
   token never gets persisted.

### OAuth (once an app is registered)

1. Register an app at Webflow's [developer
   dashboard](https://webflow.com/dashboard/apps), with scopes `sites:read`,
   `cms:read`, `cms:write`.
2. Set the app's redirect URI to
   `https://<your-deployed-server>/api/projects/connect/oauth/callback` —
   note this is a single static URL shared by every project, not
   per-project (Webflow requires an exact match on callback; which
   project/user is connecting is carried in the OAuth `state` parameter
   instead — see Section 9).
3. Set `WEBFLOW_OAUTH_CLIENT_ID`, `WEBFLOW_OAUTH_CLIENT_SECRET`, and
   `WEBFLOW_OAUTH_REDIRECT_URI` on the server (see
   [`environment-variables.md`](environment-variables.md)) and redeploy.
4. By default, Webflow OAuth apps are only usable by their own developer
   workspace until submitted for Marketplace review — invite specific
   external testers from the developer dashboard for early use ahead of
   approval (Section 4.3).

## After connecting

1. **Select a site** — if the credential grants access to more than one
   site, you'll be prompted to pick one; if there's only one, it's selected
   automatically.
2. **Add collections** — every collection on the site is listed; check the
   ones this project should manage. Unselected collections are never
   persisted or referenced again.
3. **Map fields** — for each managed collection, map its Webflow fields to
   this tool's logical fields (text/number/richText/boolean), with
   name-similarity auto-suggestions for the label/key/type. At most one
   field per collection should be marked as the title field — it drives
   the auto-generated URL slug.

## How publishing works

Webflow separates "saving" content from "publishing" it live — this
constrains the CMS Manager UI, not just its API calls:

1. Creating/updating an item marks it as ready but does **not** push it to
   the live site by itself.
2. A separate call to the `items/publish` endpoint is required to actually
   make it live. This app makes that second call automatically whenever you
   use the "Publish" button (as opposed to "Save Draft").
3. Saving an item as a draft again after it was previously published does
   **not** retroactively remove it from the live site — Webflow has no
   single-item "unpublish" endpoint. The item form's Publish button carries
   a note about this; to fully remove already-live content, delete or
   archive the item directly in Webflow.

## Slugs

- The title field (if configured) drives an auto-generated, URL-safe slug
  preview at creation time.
- The slug is generated once and **never regenerated on edit**, even if the
  title changes later — this avoids silently breaking a published URL.
- Uniqueness is enforced server-side against the live collection before
  create, appending `-2`, `-3`, etc. if the base slug is taken.
