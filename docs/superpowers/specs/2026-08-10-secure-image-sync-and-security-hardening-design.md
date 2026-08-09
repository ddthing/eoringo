# Secure Image Sync and Security Hardening Design

## Goal

Make Google-account synchronization feel complete by synchronizing referenced character images across devices, while closing the security gaps found in the current auth, browser, Edge Function, database, and Storage paths.

The implementation remains compatible with Supabase Free. It must not expose a service-role key, make image buckets public, or silently enable paid Storage features.

## Findings addressed

1. The deployed static app has no explicit CSP, HSTS, clickjacking, referrer, or permissions headers.
2. The character-image bucket is private, but no validated upload/download orchestration exists; local migration records images as pending.
3. The migration RPC creates relational character rows without preserving the image reference.
4. OAuth callback URLs retain the one-time PKCE code during the exchange window.
5. Production Edge Function CORS currently includes localhost origins unconditionally.
6. Database document checks validate only shallow envelopes, leaving unsafe JSON keys and excessive nested collections to client-side validation.

## Security boundaries

- Browser configuration contains only the Supabase URL, publishable key, public Turnstile site key, and boolean feature flags.
- The browser never receives or stores a service-role key.
- `character-images` remains a private bucket.
- Object paths are generated as `<authenticated-user-id>/<validated-image-id>`; the request cannot choose the user segment.
- Uploads are accepted only through a JWT-protected Edge Function. Direct Storage INSERT/UPDATE remains denied.
- Downloads use the authenticated Storage API and the existing first-path-segment ownership policy. No public URL is generated.
- Image deletion is limited to the authenticated user's generated path and is best-effort; a failed cleanup never deletes local data.
- Production CORS allows only exact configured HTTPS origins. Localhost is enabled only by an explicit local-development flag.
- OAuth callback query parameters are removed from browser history before the code exchange begins.
- Database validation rejects reserved object keys recursively and applies bounded collection/string checks before accepting document writes.

## Image synchronization flow

### Upload

1. The document runtime hydrates the remote character document first.
2. The client collects only image IDs referenced by the current character store and reads their Blobs from IndexedDB.
3. Each image is uploaded independently through `sync-character-images` with a bounded JSON request. The image bytes are base64 encoded only for the per-image request; no credentials or document content are included.
4. The Edge Function authenticates the bearer token through Supabase Auth, rejects anonymous users, derives the user ID from the verified user, validates the image ID, decodes the bytes, verifies content type and magic bytes, checks dimensions and the 512 KiB limit, enforces a 10 MiB per-user total, and writes to the generated private path with an idempotent upsert.
5. A failed image leaves local IndexedDB and document mutations intact. The next focus/online/token-refresh cycle retries only the missing image.

### Download

1. After remote document hydration, the client lists the current user's private image prefix.
2. For referenced image IDs missing in IndexedDB, it downloads the generated path using the authenticated Storage client.
3. The client revalidates the downloaded Blob's type, byte size, and image signature before saving it under the local image ID.
4. Unreferenced remote images are not automatically deleted during this release. This avoids data loss when an older client has not yet persisted its character document. Cleanup can be added after reference manifests are versioned.

### Migration and feature flag

- `VITE_IMAGE_UPLOADS_ENABLED=true` enables the image phase. When false, document sync remains available and images stay local/pending; enabling the flag later causes the normal runtime to retry image synchronization.
- The existing migration receipt remains bound to the user. Its image count is informational and never grants access by itself.
- Character metadata is persisted as a normal `characters` document so image IDs are available on another device.

## Database hardening

- Keep existing RLS ownership predicates and direct normal document writes.
- Add recursive reserved-key rejection and bounded nested values to the immutable payload validator.
- Preserve `security definer` only where the privileged migration RPC requires it; keep an empty search path, fully-qualified objects, minimal execute grants, and no browser access.
- Keep Storage INSERT/UPDATE denied to `authenticated`; the upload function is the only write path.
- Add SQL regression tests for cross-user object access, direct writes, path traversal names, and malformed nested document payloads.

## Browser hardening

- Add Cloudflare Pages headers with a restrictive CSP compatible with Supabase, Turnstile, OAuth navigation, the existing font CDN, and blob/data image previews.
- Add `Referrer-Policy: strict-origin-when-cross-origin`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, HSTS for HTTPS deployment, and a restrictive `Permissions-Policy`.
- Move the theme-preload inline script to a same-origin static file so CSP does not require `unsafe-inline` for scripts.

## Verification

- Unit-test image ID/path validation, image signature/dimension parsing, byte/quota limits, upload request parsing, and download rejection.
- Test runtime ordering: document hydration precedes image hydration; image failure does not stop document sync or delete local data.
- Run Supabase reset and pgTAP database tests where Docker/local Supabase is available.
- Run the full application and orchestrator checks, secret scan, free-tier guard, production build, bundle scan, and dependency audit.
- Report separately what was verified locally versus what requires a live production account/Storage deployment. This is a code-level security hardening pass, not a substitute for an external penetration test.
