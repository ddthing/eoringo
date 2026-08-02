# Security release checklist

Release is blocked unless every applicable item is confirmed.

- [ ] Supabase project is Free, has no payment method, and has no paid add-on or trial enabled.
- [ ] `pnpm run check` passes, including unit tests, secret scans, free-tier guards, production build, and bundle scan.
- [ ] `pnpm run supabase:reset` and `pnpm run test:db` pass from a clean local database.
- [ ] RLS tests prove user A cannot read, create for, update, delete, list, or download user B data.
- [ ] Realtime and image transformations are disabled; phone MFA is disabled.
- [ ] Anonymous signup requires Turnstile and retains the provider's IP rate limit.
- [ ] Only exact HTTPS production redirect URLs are allowlisted. Local HTTP is restricted to localhost/127.0.0.1.
- [ ] Browser configuration contains only Supabase URL, publishable key, Turnstile site key, and feature flags.
- [ ] No service-role key, OAuth secret, CAPTCHA secret, DB password, access token, refresh token, OAuth code, QR payload, or user document appears in source, bundle, logs, or analytics.
- [ ] Existing local data is never uploaded without explicit confirmation and a completed backup download.
- [ ] Migration is idempotent, transactional, payload-bounded, and verified by read-back digest.
- [ ] Image upload rejects unsupported input, inputs over 20 MB, outputs over 768×768, and outputs over 512 KiB.
- [ ] Rollback was tested with `VITE_REMOTE_SYNC_ENABLED=false` without deleting local or remote data.
- [ ] A manual encrypted database export was restored successfully before a production schema migration.
