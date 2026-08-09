# Google identity conflict UX design

## Goal

Explain a Google identity conflict without exposing provider error details or
making users think their guest data was deleted.

## Scope

- Interpret the OAuth callback's `error_code=identity_already_exists` only for
  user-facing copy.
- Tell the user that the Google identity is already linked to another Eoringo
  account and that automatic merging is intentionally not performed.
- Point the user to an existing-account login or a different Google account.
- Keep the generic callback message for every other provider error.
- Do not unlink identities, merge accounts, delete guest data, or change OAuth
  scopes or Supabase policies.

## Verification

- Server-render the callback page with the real provider error query shape and
  assert the specific guidance is shown without raw error details.
- Server-render a generic provider failure and assert the generic safe message
  remains in place.
- Run the existing auth, application, build, and security checks.
