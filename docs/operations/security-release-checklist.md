# Security release checklist

Release is blocked unless every applicable item is confirmed.

- [ ] Supabase project is Free, has no payment method, and has no paid add-on or trial enabled.
- [ ] `pnpm run check` passes, including unit tests, secret scans, free-tier guards, production build, and bundle scan.
- [ ] `pnpm run supabase:reset` and `pnpm run test:db` pass from a clean local database.
- [ ] RLS and Storage policy tests prove user A cannot read, create for, update, delete, list, or download user B data.
- [ ] Realtime and image transformations are disabled; phone MFA is disabled.
- [ ] Anonymous signup requires Turnstile and retains the provider's IP rate limit.
- [ ] Only exact HTTPS production redirect URLs are allowlisted. Local HTTP is restricted to localhost/127.0.0.1.
- [ ] Browser configuration contains only Supabase URL, publishable key, Turnstile site key, and feature flags.
- [ ] No service-role key, OAuth secret, CAPTCHA secret, DB password, access token, refresh token, OAuth code, QR payload, or user document appears in source, bundle, logs, or analytics.
- [ ] Existing local data is uploaded automatically only after an explicit guest-to-Google link, an empty destination-account check, digest verification, and client read-back; all other local/remote conflicts require explicit confirmation and a completed backup download.
- [ ] Migration is idempotent, transactional, payload-bounded, and verified by read-back digest.
- [ ] Image upload rejects unsupported input, malformed signatures, inputs over 768×768, outputs over 512 KiB, more than 50 images, or more than 10 MiB per account.
- [ ] `sync-character-images` accepts only an authenticated permanent user, derives the Storage path from the verified user ID, and never exposes the service-role key to the browser.
- [ ] `ALLOWED_ORIGINS` contains only exact HTTPS production origins and `ALLOW_LOCAL_ORIGINS=false` in production; wildcard origins are not used.
- [ ] The `character-images` bucket is private and direct client INSERT/UPDATE policies remain absent; production enables `VITE_IMAGE_UPLOADS_ENABLED=true` only after the Edge Function and migration are deployed.
- [ ] Image download failures retain local images and unreferenced remote images are not automatically deleted until a separately reviewed cleanup job exists.
- [ ] Rollback was tested with `VITE_REMOTE_SYNC_ENABLED=false` without deleting local or remote data.
- [ ] A manual encrypted database export was restored successfully before a production schema migration.
