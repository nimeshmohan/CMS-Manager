# CMS Manager

Multi-project, multi-user, role-based CMS management platform. External CMS
platforms (Webflow first) remain the source of truth for content; this tool
is a management, permissions, and audit-trail layer on top of them.

Built per `MASTER_PROMPT_NEXT_VERSION.md`, phase by phase. See that document
for the full product/architecture spec.

## Status

- [x] Phase 1 — Monorepo foundation: shared data model types, server
      boot/auth/config skeleton (`/api/health`, `/api/me`)
- [x] Phase 2 — Client foundation: Vite/React/Tailwind/shadcn, Firebase
      email/password auth, login/forgot-password, profile/settings pages
- [x] Phase 3 — Roles (seeded), Membership CRUD service, `/api/me` returns
      resolved memberships. Permission *resolution*/route-guard middleware
      is built alongside Phase 4/6's first routes that need it.
- [x] Phase 4 — Project CRUD (`requireProjectPermission`, `ProjectService`,
      write-side `ActivityLogService`) + Project Manager Dashboard (cards,
      search/filter/sort, create/edit/duplicate/archive/delete). CMS
      connection is a separate flow added in Phase 5.
- [x] Phase 5 — CmsProvider abstraction, WebflowProvider, onboarding flow.
      `CmsProvider` interface, `WebflowProvider` (Webflow Data API v2),
      AES-256-GCM credential encryption, OAuth (state-CSRF-protected) +
      API Token connection, site selection, collection selection, and a
      field-mapping editor with name-similarity auto-suggest (Section
      4.4–4.5). Operates as a series of steps on an already-created
      project rather than a single blocking modal wizard — each step
      (connect → pick site → add collections → map fields) saves
      independently via its own route.
- [x] Phase 6 — Dynamic item management UI. Dynamic Zod schema builder
      (`buildItemFormSchema`, shared client/server — Section 4.5),
      `ItemService` (search/sort/pagination in-memory, CRUD, publish —
      the first code to actually exercise `WebflowProvider`),
      `requireCollectionPermission` middleware, rich text sanitization,
      unique-slug generation (never regenerated on edit). Client:
      `DynamicItemTable`/`DynamicField` generated at runtime from a
      collection's `FieldMapping[]`, Tiptap rich text editor, item
      list/create/edit pages. Every Section 4.6 validation rule and the
      HTML sanitizer were verified with real assertions, not just "it
      builds" (script/iframe/event-handler injection correctly stripped).
- [x] Phase 7 — Member invitations. `InvitationService` (crypto-random
      single-use tokens, 7-day expiry, email-match check on accept so a
      grabbed link can't be redeemed under a different identity),
      `EmailService` interface with a console/no-op implementation (real
      provider deferred per your direction — every invite response
      includes the accept URL directly to copy/share), the
      self-protection guard (a Project Manager can't revoke their own
      last remaining Project Manager Membership), `verifyFirebaseToken`
      for the one route that must work before a Firestore user profile
      exists. Client: `InviteMemberDialog` + `MemberPermissionMatrix`
      (shared between inviting and editing), `MembersSection` on the
      project detail page, and `InvitationAcceptPage` — the one place in
      the app that calls Firebase's `createUserWithEmailAndPassword`
      directly, reachable only via a valid invite token (Section 8's "no
      open self-registration").
- [x] Phase 8 — Activity log + dashboards. Read-side of `ActivityLogService`
      (project-scoped and global, Firestore queries deliberately avoid
      pairing `where` with `orderBy` so no composite index is ever
      required — sorting/pagination happen in memory, same philosophy as
      Section 6's item search), `DashboardService` (per-project item
      stats aggregated across only the collections the viewer can see;
      platform-wide project counts for Super Admins), human-readable
      action labels (`ACTIVITY_ACTION_LABELS`, shared). Client:
      `ActivityLogTable` + before/after JSON diff dialog (reused for both
      the project-scoped and global views), `ProjectStatsCards`, the
      global `/activity-logs` page gated by a restored `RequireSuperAdmin`
      guard.
      **Known gap, not part of this phase:** Section 15's `/api/users`
      (Super Admin platform user management — enable/disable/delete) was
      never in the original 9-phase plan and isn't built.
- [x] Phase 9 — Deployment. `render.yaml` Blueprint (two services, health
      check, `--include=dev` build commands, pinned exact TypeScript
      version everywhere since Phase 1), plus [`docs/deployment.md`](docs/deployment.md),
      [`docs/environment-variables.md`](docs/environment-variables.md), and
      [`docs/webflow-connection.md`](docs/webflow-connection.md). The
      `--include=dev` build commands and the compiled production
      `npm run start -w server` were actually run under
      `NODE_ENV=production` and verified to boot and serve `/api/health`
      — not just assumed to work because they matched a known-good
      pattern.

- [x] Phase 10 — Platform Users management (Section 15's `/api/users`,
      Super Admin only). `userService` (list, promote/demote Super Admin,
      disable/enable, hard delete cascading Memberships, password reset
      link generation — no email provider, so the link is returned
      directly like invitations), self-protection guards (can't disable
      or delete your own account; can't remove your own Super Admin
      status if you're the last one), a new `UPDATE_USER_ROLE` activity
      action added deliberately rather than misusing
      `UPDATE_MEMBER_PERMISSIONS` for an unrelated domain, and
      `CREATE_USER` logging wired into both places accounts actually get
      created (the bootstrap script and invitation acceptance). Client:
      `UsersPage`, gated by the same `RequireSuperAdmin` guard as the
      Activity Log. No "create user" form — Section 8 forbids open
      self-registration and `Invitation` has no concept of granting Super
      Admin, so every account still only comes from the bootstrap script
      or accepting a project invitation.

All 9 phases from the original plan, plus this explicitly-flagged gap, are
now built.

## Project structure

```
shared/   Types shared verbatim between client and server (npm workspace)
server/   Express API, Firebase Admin, CMS provider adapters
client/   React/Vite frontend
docs/     Deployment, environment variables, Webflow connection setup
```

## Local setup (current phase)

```bash
npm install
cp server/.env.example server/.env   # fill in Firebase Admin credentials
cp client/.env.example client/.env   # fill in Firebase client SDK config
npm run dev                          # client http://localhost:5173, server http://localhost:4000
```

Create the platform's first Super Admin (no self-registration — Section 8):

```bash
npm run create-super-admin -w server -- you@example.com "a-strong-password" "Your Name"
```

Seed the default project Roles (Section 3.2), before creating any projects:

```bash
npm run seed-roles -w server
```

Generate an `ENCRYPTION_KEY` for `server/.env` (Section 9):

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

`WEBFLOW_OAUTH_CLIENT_ID`/`_CLIENT_SECRET`/`_REDIRECT_URI` are optional — API
Token connection works without them; "Sign in with Webflow" requires
registering an OAuth app at https://webflow.com/dashboard/apps. See
[`docs/webflow-connection.md`](docs/webflow-connection.md) for the full
per-project connection flow.

## Deploying

See [`docs/deployment.md`](docs/deployment.md) for the full Render
Blueprint deploy sequence, and [`docs/environment-variables.md`](docs/environment-variables.md)
for every variable both workspaces read.
