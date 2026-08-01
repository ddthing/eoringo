# Secure Authentication and Sync Implementation Plan

## Objective

Implement the approved secure authentication and cross-device synchronization design without enabling any paid service. The first release supports guest sessions and Google OAuth only. Existing local data remains usable throughout rollout and can be explicitly migrated after authentication.

## Delivery constraints

- Supabase Free plan only; no payment method, paid add-on, custom domain, paid image processing, phone MFA, PITR, or Realtime.
- Do not use Realtime in the first release; synchronize on explicit lifecycle triggers.
- Security and data isolation tests block deployment.
- Existing local-only behavior remains available behind a rollback flag until remote migration is verified.
- Normal reads and writes use the publishable key with RLS; privileged keys never enter Vite environment variables or the browser bundle.
- Schema, RLS, Storage policies, Edge Functions, and client codecs are version-controlled.
- X and email OTP are excluded from implementation and UI.

## Target structure

```text
src/
  auth/
    AuthProvider.tsx
    authClient.ts
    authTypes.ts
    useAuth.ts
  components/auth/
    AccountPanel.tsx
    AuthCallbackPage.tsx
    MergeConflictDialog.tsx
  components/sync/
    LocalMigrationDialog.tsx
    SyncStatus.tsx
  lib/supabase/
    client.ts
    env.ts
  sync/
    codecs/
    documentRepository.ts
    localSnapshot.ts
    mutationQueue.ts
    syncCoordinator.ts
    syncTypes.ts
  stores/sync/
    useSyncStore.ts
supabase/
  config.toml
  migrations/
  functions/
  tests/database/
scripts/
  verify-no-paid-features.mjs
  verify-no-secrets.mjs
docs/operations/
  free-tier-runbook.md
  backup-and-restore.md
  security-release-checklist.md
```

Names may be adjusted to existing repository conventions, but responsibilities must remain separated.

## Phase 0 — Baseline and reversible feature boundary

### Task 0.1: Capture the local-only baseline

Files:

- Modify `package.json`
- Add or extend tests under `src/lib/` and `src/stores/`

Steps:

1. Run the current full test suite and production build; record commands and results in the implementation log.
2. Add a `check` script that runs tests and the production build in a stable order.
3. Add regression tests confirming every current `storageKeys` entry and IndexedDB character image can still be exported and restored.
4. Verify the worktree contains only planned changes before each commit.

Verification:

```powershell
pnpm.cmd run test
pnpm.cmd run build
```

### Task 0.2: Add feature flags and validated environment access

Files:

- Add `.env.example`
- Add `src/lib/supabase/env.ts`
- Add `src/lib/supabase/env.test.ts`
- Modify `.gitignore`

Required variables:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_REMOTE_SYNC_ENABLED`
- `VITE_IMAGE_UPLOADS_ENABLED`

Rules:

- Missing remote configuration keeps the app in local-only mode without crashing.
- Production refuses to enable remote sync with localhost URLs, malformed publishable keys, or unknown flags.
- Any environment variable name containing `SERVICE_ROLE`, `SECRET_KEY`, database passwords, or OAuth client secrets fails validation and the secret scan.

Rollback: set `VITE_REMOTE_SYNC_ENABLED=false` to restore local-only operation without deleting remote or local data.

## Phase 1 — Versioned domain codecs

### Task 1.1: Introduce runtime schemas

Files:

- Modify `package.json` and `pnpm-lock.yaml` to add `zod` as a runtime dependency.
- Add `src/sync/codecs/common.ts`.
- Add one codec per persisted domain: characters, tasks, dday, memo, allowance, and history.
- Add codec tests next to each codec.

Steps:

1. Describe the exact persisted subset currently selected by each Zustand store's `partialize` function.
2. Reject unknown document types, unsupported schema versions, unknown fields, excessive strings, excessive arrays, non-finite numbers, unsafe dates, and payloads above their domain byte budget.
3. Keep theme and task UI settings outside remote codecs.
4. Export canonical serialization and digest helpers so migration verification and conflict comparison use the same representation.

Verification cases:

- Every current valid store fixture parses.
- Legacy fixtures normalize through existing migrations before parsing.
- Malformed, oversized, and prototype-pollution-shaped input is rejected.
- Serialization is deterministic.

### Task 1.2: Define the remote document map

Files:

- Add `src/sync/syncTypes.ts`.
- Add `src/sync/localSnapshot.ts` and tests.

Map current stores to bounded documents:

- Account-wide: allowance and history.
- Character-scoped: task state, dday, and weekly memo.
- Characters remain relational records because other documents reference them.

The snapshot reader must not mutate current local stores. It produces a validated migration preview with counts, byte sizes, and image metadata.

## Phase 2 — Supabase project files and deny-by-default database

### Task 2.1: Add local Supabase tooling

Files:

- Modify `package.json` and `pnpm-lock.yaml` to add the official Supabase CLI as a development dependency.
- Add `supabase/config.toml`.
- Add package scripts for local start, stop, reset, database tests, and generated TypeScript types.

No production project is linked during this task. Local development uses Supabase CLI and local containers.

### Task 2.2: Create minimal schemas

Files:

- Add `supabase/migrations/20260801000100_auth_sync_schema.sql`.

Public data tables:

- `profiles`
- `characters`
- `user_documents`

Private operational table:

- `private.secure_operations` for hashed one-time merge tickets, idempotent migration receipts, deletion requests, and minimal redacted security events.

Database requirements:

- UUID keys generated by the database.
- Foreign keys to `auth.users` with deliberate delete behavior.
- Unique document identity that handles nullable `character_id` deterministically.
- Explicit `document_type` allowlist.
- Nonnegative `revision` and `schema_version` constraints.
- JSON byte limits enforced in the database as a final guard.
- Indexes on `user_id`, character ownership, document identity, expiry, and cleanup fields.
- `updated_at` set server-side.
- RLS enabled and forced where supported before grants are added.
- No client access to the private schema.

### Task 2.3: Add RLS and grants

Files:

- Add `supabase/migrations/20260801000200_auth_sync_rls.sql`.
- Add `supabase/tests/database/auth_sync_rls.test.sql`.

Test before adding permissive policies. For two permanent users and two anonymous users, prove:

- A user can access only their own profile, characters, and documents.
- Inserts cannot assign a different `user_id`.
- Updates cannot transfer ownership.
- Character-scoped documents cannot reference another user's character.
- Deletes affect only owned rows.
- Anonymous users receive only the permissions intended for guest operation.
- The anonymous public database role has no data access.
- The private schema and functions are not executable through the Data API.

### Task 2.4: Create private Storage policies

Files:

- Add `supabase/migrations/20260801000300_character_image_storage.sql`.
- Add `supabase/tests/database/character_image_storage.test.sql`.

Requirements:

- Private bucket only.
- Object path begins with the immutable authenticated user UUID.
- Direct client upload is denied; validated upload uses a dedicated Edge Function.
- Read and delete policies require path owner and authenticated user to match.
- No list operation may reveal another user's object names.

Verification:

```powershell
pnpm.cmd run supabase:reset
pnpm.cmd run test:db
```

## Phase 3 — Auth session and guest mode

### Task 3.1: Add the browser client safely

Files:

- Modify `package.json` and `pnpm-lock.yaml` to add `@supabase/supabase-js`.
- Add `src/lib/supabase/client.ts` and tests.
- Add `src/auth/authClient.ts`, `src/auth/authTypes.ts`, and tests.

Rules:

- Construct one client instance from validated publishable configuration.
- Never accept a privileged key.
- Avoid logging sessions, access tokens, refresh tokens, OAuth codes, or full auth errors containing sensitive context.
- Normalize user-facing failures into stable error codes.

### Task 3.2: Add `AuthProvider`

Files:

- Add `src/auth/AuthProvider.tsx` and `src/auth/useAuth.ts`.
- Modify `src/main.tsx` or `src/app/App.tsx` at one provider boundary.
- Add provider tests.

State machine:

```text
disabled -> local-only
initializing -> restoring-session
no-session -> creating-guest
guest -> ready
oauth-redirect -> restoring-session
permanent -> ready
error -> retryable local-safe state
```

Strict Mode must not create duplicate anonymous users. Use a single in-flight initialization promise and verify the returned session before allowing remote writes.

### Task 3.3: Add Google login and callback

Files:

- Add `src/components/auth/AccountPanel.tsx`.
- Add `src/components/auth/AuthCallbackPage.tsx`.
- Modify `src/app/routes.tsx`.
- Modify settings section registration files.
- Add navigation and auth-flow tests.

Requirements:

- Use OAuth authorization-code flow with PKCE as supported by the client.
- Allowlist exact production and local callback URLs in Supabase and Google configuration.
- Request only identity scopes required for login.
- Cancelled or failed login restores the existing guest session and data.
- Do not render X or email login controls.
- Show whether the current session is guest or Google-linked.

Manual setup checkpoint: the user must create or select a Supabase Free project and Google OAuth client, then enter secrets only in provider dashboards. Stop before production linking if this external configuration is unavailable.

### Task 3.4: Add free authentication abuse controls and optional TOTP

Files:

- Add `src/components/auth/CaptchaGate.tsx` and tests.
- Add `src/components/auth/AccountSecurityPanel.tsx` and tests.
- Add `src/components/auth/MfaChallenge.tsx` and tests.
- Extend `src/auth/authClient.ts` and provider tests.

Requirements:

- Pass a CAPTCHA token when creating an anonymous account; do not create a guest session until verification succeeds.
- Use a CAPTCHA provider only after its current no-charge terms are confirmed at the external setup checkpoint.
- Present stable retry timing for rate-limit responses without exposing raw provider messages.
- Support optional TOTP enrollment, challenge, recovery guidance, and removal for permanent Google-linked accounts.
- Require AAL2 for merge and deletion when TOTP is enrolled.
- Never store TOTP secrets, QR payloads, or challenge codes in Zustand persistence, local storage, logs, analytics, or error reports.

## Phase 4 — Remote repository and synchronization

### Task 4.1: Add typed repositories

Files:

- Add `src/sync/documentRepository.ts` and tests.
- Add a character repository under `src/sync/` and tests.

Requirements:

- The repository never accepts an arbitrary owner ID for normal user operations.
- Fetch current user data from the authenticated session.
- Decode every server response before returning it to stores.
- Update with both document identity and expected revision.
- Return a typed conflict when zero rows update because the revision is stale.

### Task 4.2: Add durable mutation queue

Files:

- Add `src/sync/mutationQueue.ts` and tests.
- Add `src/stores/sync/useSyncStore.ts` and tests.

Persist only validated pending mutations, expected revision, mutation UUID, retry count, and timestamps. Never persist credentials. Enforce queue byte and item limits. Retry transient failures with bounded exponential backoff and jitter; do not retry authorization, validation, or conflict failures automatically.

### Task 4.3: Add sync coordinator

Files:

- Add `src/sync/syncCoordinator.ts` and tests.
- Modify `src/app/App.tsx` to start and stop synchronization once.
- Add `src/components/sync/SyncStatus.tsx`.

Triggers:

- app startup
- successful write
- window focus
- network restoration
- token refresh
- manual refresh

The coordinator serializes work per document, cancels stale fetches, and prevents the existing minute-based reset/history effect from racing with remote hydration. Remote hydration completes before reset snapshots run, or the app remains local-only.

### Task 4.4: Integrate stores one domain at a time

Order:

1. weekly memo
2. dday
3. allowance
4. characters
5. tasks
6. history

For each domain:

1. Add adapter tests around the existing store shape.
2. Hydrate from a validated remote document without triggering an immediate duplicate write.
3. Write through after local mutations.
4. Confirm offline queue behavior.
5. Confirm stale revision conflict behavior.
6. Run the full existing store and domain test suites before moving to the next domain.

Do not rewrite domain calculations or reset rules during synchronization work.

## Phase 5 — Existing local-data migration

### Task 5.1: Add migration preview and backup

Files:

- Extend `src/lib/exportBackup.ts`, `src/lib/importBackup.ts`, and tests with a new backward-compatible backup version.
- Add `src/components/sync/LocalMigrationDialog.tsx` and tests.
- Add `src/sync/localMigration.ts` and tests.

Requirements:

- Detect supported local data only after a permanent Google session is confirmed.
- Show counts and image sizes before action.
- Require explicit `continue with this device's data` confirmation.
- Download a complete backup before upload.
- Keep original local data for seven days and ask before clearing it.
- `ignore` does not delete local data.

### Task 5.2: Add idempotent migration function

Files:

- Add `supabase/functions/migrate-local-data/index.ts`.
- Add function unit tests and database integration tests.

Requirements:

- Verify the bearer token and derive the destination user on the server.
- Validate every domain and total request size.
- Use a client-generated UUID migration ID recorded in `private.secure_operations`.
- Replaying the same ID returns the original result without duplicate data.
- Apply database changes transactionally through a narrowly granted database function.
- Return canonical document digests; the client reads back and verifies them.
- Redact payloads from logs.

## Phase 6 — Character image migration and upload

### Task 6.1: Enforce client compression

Files:

- Modify `src/lib/resizeImage.ts` and tests.
- Modify character image selection and editing components only where required.

Produce at most 768 by 768 pixels and 512 KiB. Iterate quality or dimensions within fixed bounds; reject rather than upload if the cap cannot be met. Preserve the current local image until the remote upload is verified.

### Task 6.2: Add validated upload function

Files:

- Add `supabase/functions/upload-character-image/index.ts`.
- Add file-validation tests using valid images, renamed non-images, decompression bombs, excessive dimensions, excessive bytes, and cross-user character IDs.

The function verifies session ownership, magic bytes, decoded dimensions, quota, and randomized destination name. It returns only an owned object reference. Deletion of replaced objects occurs after the new reference commits successfully.

### Task 6.3: Extend backup export

Remote export downloads only objects owned by the current user and includes hashes. Restore validates hashes before replacing local or remote references.

## Phase 7 — Existing-account merge

### Task 7.1: Prepare merge ticket

Files:

- Add `supabase/functions/prepare-account-merge/index.ts`.
- Add ticket tests.

Generate a cryptographically random ticket, store only its hash in `private.secure_operations`, bind it to the guest user and data digest, and expire it after ten minutes. A guest may have only one active merge ticket.

### Task 7.2: Authenticate destination and compute conflicts

Files:

- Add `src/auth/accountMerge.ts` and tests.
- Add `src/components/auth/MergeConflictDialog.tsx` and tests.

The destination user authenticates with Google. The client submits the opaque ticket, not source or destination IDs. The server returns only a bounded conflict summary after validating both sides.

### Task 7.3: Complete merge transaction

Files:

- Add `supabase/functions/complete-account-merge/index.ts`.
- Add integration tests.

Requirements:

- Revalidate ticket, destination session, expiry, digest, and unused status.
- Reject replay, tampering, mismatched user, changed source data, or incomplete choices.
- Lock affected rows and apply all choices in one transaction.
- Mark the ticket consumed and source guest data soft-deleted for 30 days.
- Store a redacted audit event without user content.

## Phase 8 — Account deletion, backup operations, and free-tier controls

### Task 8.1: Add account deletion flow

Use recent Google reauthentication; if TOTP is enrolled require AAL2. Create a seven-day reversible deletion request in `private.secure_operations`. Immediately suspend writes, allow cancellation during the window, then purge owned database rows and Storage objects through a scheduled/manual operator process that works on the Free plan.

### Task 8.2: Add portable remote backup

Reuse the existing settings UI and backup format. Export decoded, versioned documents and owned images without tokens or provider metadata. Add round-trip tests from local-only, remote, and mixed migration states.

### Task 8.3: Add quota-safe image feature flag

Files:

- Add `scripts/verify-no-paid-features.mjs`.
- Add tests for the image-upload feature flag and read-only behavior.
- Add `docs/operations/free-tier-runbook.md`.

The runbook records monthly and pre-release dashboard checks. At 70% quota, stop nonessential retention growth. At 90%, set `VITE_IMAGE_UPLOADS_ENABLED=false`, preserve reads, and direct users to export. Provider restriction must never trigger an upgrade path.

### Task 8.4: Document free backup and restore

Files:

- Add `docs/operations/backup-and-restore.md`.

Document a manual logical database export before schema migrations or destructive operations, encrypted local storage, separate Storage object export, restore rehearsal, and secret-safe command usage. Do not commit backups or credentials.

## Phase 9 — Security automation and release

### Task 9.1: Add secret and configuration checks

Files:

- Add `scripts/verify-no-secrets.mjs`.
- Add script tests.
- Modify `package.json`.

Fail on committed `.env` files, service-role JWTs, database connection strings, OAuth client secrets, private keys, or forbidden paid-feature configuration. Permit only documented publishable-key patterns in browser code.

### Task 9.2: Add CI release gates

Files:

- Add `.github/workflows/verify.yml` if GitHub Actions is available at no charge for this repository.
- Add `docs/operations/security-release-checklist.md`.

CI order:

1. frozen dependency install
2. secret/config checks
3. unit and integration tests
4. local Supabase reset
5. database RLS and Storage policy tests
6. Edge Function tests
7. production build

Do not add a paid scanning service. If GitHub Actions availability is uncertain, keep the same commands runnable locally and do not make deployment depend on an unavailable paid feature.

### Task 9.3: Final adversarial verification

Before production enablement, run and record:

- Cross-user reads, writes, deletes, and Storage access attempts.
- Forged owner and character IDs.
- Direct REST calls without the UI.
- Guest abuse and CAPTCHA/rate-limit behavior.
- OAuth cancellation, callback manipulation, state mismatch, and open-redirect attempts.
- Stale revisions, offline replay, duplicate mutations, and delete/update conflicts.
- Malformed backups, migration replay, merge-ticket replay, and partial-failure rollback.
- Bundle and repository secret scan.
- Free-plan status, no payment method, no paid add-ons, and usage below thresholds.

## Commit sequence

Use small, reviewable commits after each green task. Suggested messages:

1. `test: capture local persistence baseline`
2. `feat: add sync environment boundary`
3. `feat: add versioned sync codecs`
4. `feat: add secure supabase schema and policies`
5. `feat: add guest and google authentication`
6. `feat: add revisioned document sync`
7. `feat: migrate existing local data`
8. `feat: sync validated character images`
9. `feat: add secure account merge`
10. `feat: add deletion and remote backup flows`
11. `ci: add security and free-tier release gates`

Do not combine schema/RLS changes with broad UI work. Never push a commit whose security tests or production build fail.

## User-owned setup checkpoints

The following steps require the user's authenticated dashboards and cannot be inferred or committed:

1. Create a Supabase Free project or identify the intended existing one.
2. Confirm the organization has no payment method, paid plan, or paid add-on.
3. Create a Google OAuth web client and configure exact callback URLs.
4. Add the Google client ID and secret only to the Supabase provider dashboard.
5. Configure the production site URL and allowlisted redirects.
6. Select a free CAPTCHA provider and store its secret only in managed server configuration.
7. Review usage in the Supabase dashboard before production enablement.

Implementation must pause at each external checkpoint if the required configuration is unavailable. Local development and tests can continue with local Supabase and test credentials.

## Definition of done

- Guest and Google flows work without losing pre-login or existing local data.
- Mobile and desktop converge through server documents on launch, focus, reconnect, or manual refresh.
- Offline changes are queued, bounded, and conflict-safe.
- User A cannot access any user B database row or Storage object through UI, SDK, or direct API calls.
- No privileged secret appears in source, build output, logs, or browser storage.
- Local migration and account merge are transactional, idempotent, replay-resistant, and recoverable.
- Backup export and restore pass round-trip tests.
- All unit, integration, RLS, Storage, Edge Function, and build checks pass.
- The production organization remains on the Free plan with no payment method or paid feature enabled.
- Rollback to local-only mode preserves user data.
