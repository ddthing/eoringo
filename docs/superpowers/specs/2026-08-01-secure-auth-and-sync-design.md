# Secure Authentication and Cross-Device Sync Design

## Summary

Add secure account authentication and remote synchronization so the same private app data is available on mobile and desktop. Existing data created before authentication is introduced must be recoverable into the user's first permanent account. The design prioritizes security, zero-cost operation, predictable maintenance, and recoverability over maximum feature breadth.

## Goals

- Support anonymous guest use and Google OAuth in the first release.
- Preserve a guest user's data when they attach a permanent sign-in method.
- Allow existing browser-local data to be explicitly imported into the user's signed-in account.
- Synchronize private user data across devices with conflict detection and offline recovery.
- Minimize database schema and policy duplication while retaining strict per-user isolation.
- Make security rules and migrations testable and reviewable as code.
- Operate only within no-charge service tiers, with service restriction instead of automatic billing when limits are approached.

## Non-goals

- Username-and-password authentication.
- X OAuth or passwordless email authentication in the first release.
- Public profiles, public data, or sharing data between users.
- A custom authentication server.
- Automatic merging of local data on shared devices without user confirmation.
- Permanent deletion without a recovery window.
- Paid plans, paid add-ons, custom domains, paid image transformations, phone MFA, or paid backup products.
- Guaranteed uptime while relying on a free service tier.

## Authentication

### First-release methods

- Anonymous Supabase Auth user for guest mode.
- Google OAuth.
- A user-selected nickname stored as profile data, not used as an authentication credential.
- Optional TOTP MFA enrollment for permanent accounts.

The app delegates OAuth sessions, token rotation, and identity verification to Supabase Auth. OAuth client secrets and privileged Supabase keys are never included in the browser bundle.

### Deferred methods

X OAuth 2.0 and passwordless email OTP are not implemented or shown in the first release. The account and data model remains compatible with adding identities later, but no dormant provider code, SMTP dependency, X API request, or secret is shipped. A deferred provider requires a new design review that confirms its official no-charge terms, production suitability, security controls, and maintenance impact at that time.

Supabase's built-in email sender is not used for public authentication because it is intended for testing, is restricted to authorized team addresses, and has a very low rate limit. X login is deferred because current X API access is usage-priced and therefore cannot satisfy a durable zero-cost guarantee.

### Guest conversion

A new installation creates an anonymous authenticated user before accepting synchronized data. If a Google identity is not already associated with another account, that identity is linked to the current anonymous user. The Supabase user ID remains unchanged, so the guest's data remains attached without copying it.

### Existing-account merge

If the chosen identity already belongs to a permanent account, the system does not trust user IDs supplied by the browser. It uses this flow:

1. While the guest session is active, a server function issues a ten-minute, single-use merge ticket bound to the guest session and a data digest. Only a hash of the ticket is stored server-side.
2. The user authenticates to the existing destination account.
3. The server verifies both the destination session and merge ticket.
4. The server locks both users' mergeable data and computes conflicts.
5. The user selects a result only for conflicting or destructive items.
6. The server applies the merge in one transaction and records an audit event.
7. The source guest data is soft-deleted and retained for 30 days before cleanup.
8. The merge ticket is consumed and cannot be replayed.

Account merge and full-account deletion require recent authentication. They are executed only through server-side functions.

## Data Architecture

### Components

- `profiles`: nickname and account state.
- `characters`: character identity, ordering, and primary-character state.
- `user_documents`: per-user or per-character domain documents.
- Private Supabase Storage bucket: character images in user-owned paths.

Theme preferences and transient UI state remain in `localStorage` because they are not sensitive and may reasonably differ by device.

### Domain documents

`user_documents` stores one bounded document per user, optional character, and domain:

- `user_id`
- `character_id`, nullable for account-wide state
- `document_type`: allowlisted values such as `tasks`, `dday`, `memo`, `allowance`, and `history`
- `payload`: validated JSONB
- `schema_version`
- `revision`
- `created_at`
- `updated_at`
- `deleted_at`, nullable

A unique constraint covers `(user_id, character_id, document_type)`, with an explicit representation for account-wide documents. An index covers every ownership column used by RLS.

This boundary mirrors the existing Zustand persistence domains. It avoids a single whole-account JSON blob while keeping schema and policy maintenance smaller than a fully normalized table-per-feature design.

### Validation

- Client and server use equivalent versioned schemas.
- Server validation is authoritative.
- Unknown fields, unknown document types, invalid types, and unsupported schema versions are rejected.
- Strings, arrays, item counts, and total payload bytes have explicit upper bounds.
- User-entered content is stored as plain data and never rendered as raw HTML.
- Database constraints enforce document-type allowlists, nonnegative revisions, uniqueness, and required ownership fields.

## Authorization and Security

### Row-level security

RLS is enabled before data access is granted. Separate policies cover select, insert, update, and delete. Every policy targets only the authenticated role and enforces ownership for both existing and resulting rows:

```sql
(select auth.uid()) = user_id
```

Character-scoped documents additionally verify that the referenced character belongs to the same authenticated user. Authorization decisions do not use client-editable user metadata or values embedded inside JSON payloads.

### Key and function safety

- The browser receives only the Supabase publishable key.
- Service-role, OAuth client, SMTP, and database secrets remain in managed server secrets.
- Service-role credentials are never logged or returned to the client.
- Database functions use `security invoker` by default.
- Any unavoidable `security definer` function uses an empty `search_path`, fully qualified object names, minimal grants, and an explicit security review.
- Function execution is revoked by default and granted only to required roles.

### Abuse controls

- CAPTCHA protects anonymous account creation.
- Authentication and mutation endpoints use rate limits.
- Anonymous-user creation is monitored. Empty anonymous accounts with no activity are cleaned up after 30 days; anonymous accounts containing user data are not automatically purged.
- Payload limits prevent storage and processing exhaustion.
- Logs redact tokens, cookies, OAuth codes, and user content.
- Dependency and secret scanning run in CI.

### Storage

- Character images use a private bucket. Uploads are limited to 768 by 768 pixels, 512 KiB per file, and 10 MiB total per user.
- Object paths start with the authenticated user's immutable ID.
- Storage policies enforce that the first path segment matches the authenticated user.
- A low-frequency Edge Function verifies file signature, decoded content, dimensions, ownership, and byte size before acceptance; client MIME metadata is not trusted.
- Randomized object names prevent predictable overwrite behavior.
- Database backups and Storage backups are treated separately because database backups do not include Storage objects.

## Zero-Cost Operating Contract

### Billing boundary

- Use a Supabase Free organization and project only.
- Do not attach a payment method for this project.
- Do not enable a paid plan, paid add-on, custom domain, image transformation, phone MFA, point-in-time recovery, branching compute, or auto-upgrade behavior.
- A quota or policy change must restrict the affected feature rather than activate billing.
- Review official provider pricing and limits before every production release because free-tier terms can change.

As of 2026-08-01, the design budget is below the published Supabase Free limits: 500 MB database storage, 1 GB file storage, 5 GB uncached plus 5 GB cached egress, 50,000 monthly active users, 500,000 Edge Function invocations, and two million Realtime messages. These values are planning inputs, not permanent guarantees.

### Usage controls

- Compress character images in the browser, then enforce the 512 KiB file and 10 MiB user limits again on the server.
- Keep default task definitions in application code rather than duplicating them per user.
- Use direct RLS-protected Data API operations for normal reads and writes.
- Reserve Edge Functions for validated image upload, local-data migration, existing-account merge, and account deletion.
- Do not use Realtime in the first release.
- Record aggregate usage without logging user content or credentials.
- The operator checks the provider usage dashboard monthly and before every release. At 70% of any storage or traffic quota, stop nonessential retention growth.
- At 90%, use a documented feature flag to block new image uploads, keep existing data readable, and prominently offer data export.
- If the provider restricts the project, preserve the local mutation queue, show a service-unavailable state, and retry only with bounded backoff.

### Free-tier availability and backup

Supabase may pause an inactive free project. The app treats this as a recoverable service interruption and preserves local queued changes until the project is resumed. The first release does not claim an uptime guarantee.

The free plan does not provide the paid automatic-backup guarantees used by higher plans. Every user can export a complete portable backup including remote records and images. The app retains the last verified local snapshot and queued mutations. Before database migrations or destructive administrative work, the operator runs a documented manual logical export to an encrypted local destination. Backup restore is tested before release and after any backup-format change.

## Synchronization

### Source of truth

The remote database is authoritative. Zustand remains the UI state and cache layer. A local durable mutation queue supports offline use; queued writes contain document identity, expected revision, mutation ID, and validated payload, but no credentials.

### Write flow

1. Validate the proposed state locally.
2. Update the UI optimistically and enqueue the mutation.
3. Submit the expected current revision.
4. The server updates only when the expected revision matches and increments the revision atomically.
5. On success, remove the queued mutation and store the confirmed server revision.
6. On mismatch, fetch the current server document and enter conflict handling rather than silently overwriting it.

Ordinary non-destructive changes use the newest valid update. Deletes, guest-to-existing-account merges, and ambiguous destructive conflicts require confirmation.

### Read and reconnect flow

- Load the authenticated user's server documents at app startup.
- Refetch after window focus, network restoration, token refresh, and an explicit manual refresh.
- After a successful write, fetch the confirmed server document and revision.
- A second device receives changes on its next focus, reconnect, app launch, or manual refresh; instant background propagation is intentionally excluded from the first release.
- Show explicit `saved`, `syncing`, `offline`, `conflict`, and `error` states.

## Existing Local Data Migration

Data already stored in `localStorage` and IndexedDB is not discarded.

1. After authentication, detect supported legacy storage keys and images.
2. Show a summary of characters, tasks, memos, events, allowances, history, and images found on the device.
3. Require the user to choose `continue with this device's data` or `ignore this device's data`.
4. Create a downloadable local backup before import.
5. Normalize and validate the local data.
6. Submit it with a unique migration ID to a server-side migration function.
7. Import all accepted data in a transaction; the migration ID makes retries idempotent.
8. Read the imported data back and compare a canonical digest.
9. Keep the local source for seven days after verified import and mark the migration complete. On the next app launch after that window, ask before clearing it.

An import failure rolls back the remote transaction and preserves all local source data. Local data is never silently assigned to whichever account signs in on a shared device.

## Error Handling and Recovery

- Google authentication cancellation returns to the unchanged guest session.
- Expired merge tickets require restarting the merge; they are never refreshed automatically.
- Network failures preserve queued local mutations and retry with bounded backoff.
- Validation failures identify the affected domain without exposing internal schema or SQL details.
- Partial account merges are prevented by transactions.
- Soft-deleted documents and source guest data remain recoverable for 30 days.
- Account deletion requires recent authentication and explicit confirmation, then enters a seven-day reversible deletion window before purge.
- Operational alerts cover repeated authorization failures, merge failures, anonymous-account spikes, and abnormal storage growth.

## Verification Strategy

### Authorization tests

For every operation, user A must be unable to read, create for, modify, delete, subscribe to, or download data owned by user B. Tests also cover forged `user_id`, forged `character_id`, anonymous-versus-permanent restrictions, unsupported document types, excessive payloads, and direct API access that bypasses the UI.

### Authentication tests

- Guest data survives linking a new Google identity.
- Cancelled OAuth leaves the guest session and data intact.
- A previously used identity follows the explicit existing-account merge flow.
- Expired, reused, tampered, or cross-user merge tickets fail.
- If a user has enrolled TOTP MFA, account merge and deletion require an AAL2 session; otherwise those operations require recent primary authentication.

### Synchronization tests

- Online save and cross-device refresh.
- Simultaneous edits with matching and stale revisions.
- Offline queue replay, duplicate mutation replay, and reconnect.
- Delete-versus-update conflicts.
- Cross-device refresh on app launch, focus, reconnect, and manual refresh.

### Migration tests

- Every current local-storage schema version.
- Malformed, oversized, partial, and duplicated legacy data.
- Transaction rollback on any failed domain.
- Idempotent retry with the same migration ID.
- Digest verification and local-source retention.

Security and zero-cost checks are release gates. A deployment is blocked if cross-user isolation, RLS, Storage policy, privileged-key scanning, provider-plan verification, or forbidden-paid-feature checks fail.

## Rollout

1. Create a separate development Supabase project and local migration workflow.
2. Add Auth and RLS with deny-by-default policies before connecting production data.
3. Implement guest creation and Google identity linking.
4. Implement versioned documents and synchronization behind a feature flag.
5. Implement existing local-data migration and recovery.
6. Implement existing-account merge and conflict review.
7. Run automated authorization tests and a manual security review.
8. Verify the organization is still on the Free plan with no payment method or paid add-on enabled.
9. Deploy to a limited test group, monitor failures, abuse signals, and free-tier usage, then expand gradually.

## Security References

- Supabase Row Level Security: https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase data security: https://supabase.com/docs/guides/database/secure-data
- Supabase anonymous sign-ins: https://supabase.com/docs/guides/auth/auth-anonymous
- Supabase passwordless email: https://supabase.com/docs/guides/auth/auth-email-passwordless
- Supabase custom SMTP limitations: https://supabase.com/docs/guides/auth/auth-smtp
- Supabase X OAuth 2.0: https://supabase.com/docs/guides/auth/social-login/auth-twitter
- Supabase TOTP MFA: https://supabase.com/docs/guides/auth/auth-mfa/totp
- Supabase database-function security: https://supabase.com/docs/guides/database/functions
- Supabase pricing: https://supabase.com/pricing
- Supabase cost control: https://supabase.com/docs/guides/platform/cost-control
- X API pricing: https://docs.x.com/x-api/getting-started/pricing
