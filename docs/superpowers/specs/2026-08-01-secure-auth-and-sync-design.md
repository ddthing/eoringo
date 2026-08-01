# Secure Authentication and Cross-Device Sync Design

## Summary

Add secure account authentication and remote synchronization so the same private app data is available on mobile and desktop. Existing data created before authentication is introduced must be recoverable into the user's first permanent account. The design prioritizes security, predictable maintenance, and recoverability over maximum feature breadth.

## Goals

- Support anonymous guest use, Google OAuth, X OAuth 2.0, and passwordless six-digit email OTP authentication.
- Preserve a guest user's data when they attach a permanent sign-in method.
- Allow existing browser-local data to be explicitly imported into the user's signed-in account.
- Synchronize private user data across devices with conflict detection and offline recovery.
- Minimize database schema and policy duplication while retaining strict per-user isolation.
- Make security rules and migrations testable and reviewable as code.

## Non-goals

- Username-and-password authentication.
- Public profiles, public data, or sharing data between users.
- A custom authentication server.
- Automatic merging of local data on shared devices without user confirmation.
- Permanent deletion without a recovery window.

## Authentication

### Supported methods

- Anonymous Supabase Auth user for guest mode.
- Google OAuth.
- X OAuth 2.0; legacy OAuth 1.0a is excluded.
- Passwordless email using a six-digit OTP.
- A user-selected nickname stored as profile data, not used as an authentication credential.
- Optional TOTP MFA enrollment for permanent accounts.

The app delegates credential storage, passwordless email delivery, OAuth sessions, token rotation, and identity verification to Supabase Auth. OAuth client secrets and privileged Supabase keys are never included in the browser bundle.

### Guest conversion

A new installation creates an anonymous authenticated user before accepting synchronized data. If a Google, X, or email identity is not already associated with another account, that identity is linked to the current anonymous user. The Supabase user ID remains unchanged, so the guest's data remains attached without copying it.

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

- CAPTCHA protects anonymous creation and email OTP requests.
- Authentication and mutation endpoints use rate limits.
- Anonymous-user creation is monitored. Empty anonymous accounts with no activity are cleaned up after 30 days; anonymous accounts containing user data are not automatically purged.
- Payload limits prevent storage and processing exhaustion.
- Logs redact tokens, cookies, OAuth codes, email OTPs, and user content.
- Dependency and secret scanning run in CI.

### Storage

- Character images use a private bucket.
- Object paths start with the authenticated user's immutable ID.
- Storage policies enforce that the first path segment matches the authenticated user.
- File type, decoded content, dimensions, and byte size are checked before acceptance.
- Randomized object names prevent predictable overwrite behavior.
- Database backups and Storage backups are treated separately because database backups do not include Storage objects.

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
- Subscribe to relevant Supabase Realtime changes.
- Treat Realtime as an invalidation signal and refetch the affected document instead of trusting event payloads as authoritative state.
- Refetch after window focus, network restoration, token refresh, and Realtime reconnection.
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

- Authentication cancellation returns to the unchanged guest session.
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

- Guest data survives linking a new Google, X, or email identity.
- Cancelled OAuth leaves the guest session and data intact.
- A previously used identity follows the explicit existing-account merge flow.
- Expired, reused, tampered, or cross-user merge tickets fail.
- If a user has enrolled TOTP MFA, account merge and deletion require an AAL2 session; otherwise those operations require recent primary authentication.

### Synchronization tests

- Online save and cross-device refresh.
- Simultaneous edits with matching and stale revisions.
- Offline queue replay, duplicate mutation replay, and reconnect.
- Delete-versus-update conflicts.
- Realtime disconnect and refetch fallback.

### Migration tests

- Every current local-storage schema version.
- Malformed, oversized, partial, and duplicated legacy data.
- Transaction rollback on any failed domain.
- Idempotent retry with the same migration ID.
- Digest verification and local-source retention.

Security tests are release gates. A deployment is blocked if cross-user isolation, RLS, Storage policy, or privileged-key scanning tests fail.

## Rollout

1. Create a separate development Supabase project and local migration workflow.
2. Add Auth and RLS with deny-by-default policies before connecting production data.
3. Implement guest creation and permanent identity linking.
4. Implement versioned documents and synchronization behind a feature flag.
5. Implement existing local-data migration and recovery.
6. Implement existing-account merge and conflict review.
7. Run automated authorization tests and a manual security review.
8. Deploy to a limited test group, monitor failures and abuse signals, then expand gradually.

## Security References

- Supabase Row Level Security: https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase data security: https://supabase.com/docs/guides/database/secure-data
- Supabase anonymous sign-ins: https://supabase.com/docs/guides/auth/auth-anonymous
- Supabase passwordless email: https://supabase.com/docs/guides/auth/auth-email-passwordless
- Supabase X OAuth 2.0: https://supabase.com/docs/guides/auth/social-login/auth-twitter
- Supabase TOTP MFA: https://supabase.com/docs/guides/auth/auth-mfa/totp
- Supabase database-function security: https://supabase.com/docs/guides/database/functions
