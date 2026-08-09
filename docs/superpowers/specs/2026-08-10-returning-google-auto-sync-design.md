# Returning Google Account Auto-Sync Design

## Goal

When a Google identity that has already been connected to an Eoringo account is used again, the user should not see an error-looking identity conflict screen. The app should recover into the existing Google account sign-in flow and continue automatic synchronization when the account and device state are already trusted.

The change must preserve the current safety boundary: it must not merge guest data into an existing account silently, delete local data, or hydrate remote data over meaningful local data without an explicit choice.

## Current flow and root cause

The guest account button calls `connectGoogle`, which uses Supabase `linkIdentity`. If the selected Google identity belongs to another Eoringo account, Supabase returns `identity_already_exists`. `AuthCallbackPage` currently treats that callback as a failed state and presents the secure-sign-in card.

The existing account recovery action already exists as `signInExistingGoogle`. It signs out the local session, records an account-switch transition, and starts Google sign-in again. The missing behavior is to invoke that recovery once automatically and present it as a neutral progress state instead of an error.

`LocalMigrationLauncher` already recognizes a previously accepted account through the user-bound sync consent and migration receipt. On a new device with no meaningful local data, it can hydrate a non-empty remote account automatically. When meaningful guest data exists, it keeps the manual choice flow.

## Chosen design

### 1. Bounded conflict recovery

When the callback contains `identity_already_exists`:

1. Remove the OAuth callback query from browser history as today.
2. Check a short-lived session-storage recovery marker.
3. If this conflict has not been auto-recovered during the current transition, mark one attempt and call `signInExistingGoogle` automatically.
4. Render a neutral secure progress state while the second OAuth flow is in progress.
5. If the second flow succeeds, continue to `/settings#account`; the normal auth listener and `LocalMigrationLauncher` perform the account-bound sync decision.
6. If the same conflict occurs again or the recovery fails, stop retrying and show the existing explicit recovery actions.

The marker is time-bounded and cleared after a successful callback or explicit sign-out. This prevents redirect loops and does not persist a recovery decision across unrelated login attempts.

### 2. Data safety rules

- A previously recorded consent/receipt for the exact authenticated `userId` enables the existing automatic-sync path.
- A new device with no meaningful local data may hydrate that account's remote documents automatically.
- A device with meaningful local guest data and no matching consent/receipt must keep the explicit backup and choice flow.
- Remote data is always read through the authenticated Supabase client and existing RLS policies.
- No automatic merge, overwrite, local-data deletion, or cross-user fallback is introduced.

### 3. UI behavior

The conflict state changes from an alert-like presentation to:

- icon: existing shield/check visual language;
- eyebrow: `secure sign-in`;
- title: `기존 Google 계정으로 안전하게 로그인 중`;
- supporting text: the app is confirming the already-connected account and will continue synchronization after verification;
- one spinner/disabled state while the OAuth redirect is prepared.

The explicit existing-account button remains available only after the bounded automatic recovery cannot proceed. The account-switch and guest-data safety copy remains available in that fallback state.

## Components and boundaries

- `authTransitionStorage.ts`: add a short-lived, one-attempt conflict-recovery marker with validation, expiry, and clear helpers.
- `AuthCallbackPage.tsx`: trigger bounded automatic recovery and render neutral progress/fallback states.
- `AuthProvider.tsx`: keep `signInExistingGoogle` as the single account-switch entry point; do not duplicate sign-out or transition writes in the callback page.
- `LocalMigrationLauncher.tsx`: retain current account-bound consent, remote hydration, and manual-choice rules; only add tests if the new callback flow exposes a missing transition case.

## Error handling

- Missing callback code or unrelated OAuth errors remain on the existing failure path.
- A second `identity_already_exists` after the automatic attempt does not retry again.
- Network, provider cancellation, and session errors show the existing localized fallback without deleting local data.
- Recovery markers are best-effort browser state; they never grant access or substitute for Supabase authentication.

## Verification

Unit tests will cover:

- a first identity-conflict callback starts automatic existing-account recovery;
- the recovery marker prevents a second automatic redirect;
- expired or malformed markers are ignored and cleaned up;
- unrelated OAuth failures retain the existing error UI;
- a successful account switch still reaches the existing sync launcher;
- existing auth, consent, and migration tests remain green.

The production smoke check will confirm that the callback page no longer presents the warning on the first recoverable conflict and that the account's existing sync state is preserved. A two-account RLS test remains separate from this UI change.
