# Turnstile loader recovery design

## Context

Production guest signup stops at the security-check card even though the Cloudflare Pages site key, Turnstile widget site key, allowed hostname, and managed widget mode are correct. The browser console reports that `turnstile.ready()` can run before the Turnstile API is ready. The current loader resolves from the script `load` event and then calls `ready()`, leaving a timing race and a failed-script retry path that can hang on an already-loaded script element.

## Decision

Use Cloudflare Turnstile's explicit-render `onload` callback as the single readiness boundary. The loader will register one namespaced global callback before appending the vendor script, resolve only when that callback can access `window.turnstile`, and render the widget directly without calling `turnstile.ready()`.

Only the exact Cloudflare HTTPS API endpoint remains allowed. OAuth, Supabase CAPTCHA enforcement, widget mode, hostname allowlist, feature flags, and local-data behavior do not change.

## Loading and retry flow

1. If `window.turnstile` already exists, return it immediately.
2. Reuse one in-flight loader promise for concurrent callers.
3. Register the global onload callback before inserting the script.
4. Append the exact explicit-render URL containing the callback name.
5. Resolve only after the callback confirms the API exists.
6. On script error or an onload callback without the API, remove the failed script, clear the global callback and cached promise, and report failure.
7. Component unmount removes only the rendered widget; it does not invalidate a successfully loaded shared API.

This keeps retry behavior deterministic: a new `CaptchaGate` mount after failure starts a clean script load instead of attaching a listener to a script whose load event already fired.

## Error handling

- CAPTCHA tokens retain the existing length and control-character validation.
- Vendor error, expiration, and timeout callbacks continue to fail closed.
- No tokens, site secrets, or user data are logged.
- A failed load leaves local data untouched and displays the existing retry-safe message.

## Tests

Add focused loader tests at the real DOM seam to prove:

- the callback is registered before the script is appended;
- the exact approved script origin and explicit-render parameters are used;
- the widget renders only after the onload callback exposes the API;
- `turnstile.ready()` is never required;
- concurrent mounts share one load;
- a failed load clears cached state and a later mount can retry;
- cleanup removes a rendered widget without deleting a healthy shared API.

Then run the existing component tests, full `pnpm run check`, secret scans, production build, and a fresh production browser reproduction after deployment.

## Release and rollback

Commit and push the loader plus tests, allow the existing Cloudflare `main` deployment to rebuild, and verify guest creation followed by Google linking. If production verification fails, set `VITE_REMOTE_SYNC_ENABLED=false` and redeploy; browser-local data remains preserved.

## Out of scope

- Changing Turnstile widget mode or hostname policy
- Weakening Supabase CAPTCHA enforcement
- Adding alternate CAPTCHA providers
- Changing Google OAuth, database schema, migration behavior, or image uploads
