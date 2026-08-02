# Free-tier operations runbook

Last terms check: 2026-08-02.

## Hard cost boundary

- Use one Supabase Free project and do not add a payment method.
- Do not enable a Pro trial, paid compute, PITR, advanced phone MFA, image transformations, custom domains, log drains, or Realtime.
- Keep `VITE_REMOTE_SYNC_ENABLED=false` and `VITE_IMAGE_UPLOADS_ENABLED=false` until the production checklist is complete.
- The repository check must pass `pnpm run verify:free-tier` before every deployment.
- If a free quota is reached, features stop or remain local-only. Do not configure automatic paid overage.

Current published Free limits include 500 MB database, 1 GB file storage, 5 GB egress, 50,000 monthly active users, two active projects, and pausing after one week of inactivity. Recheck the provider page before launch and monthly thereafter: <https://supabase.com/pricing>.

Cloudflare currently lists Turnstile Free for most production applications, up to 20 widgets and unlimited challenges. Recheck before launch: <https://developers.cloudflare.com/turnstile/plans/>.

## External setup checkpoint

Do not put provider secrets into this repository, Vite variables, GitHub variables exposed to the browser, logs, or screenshots.

1. Create/select a Supabase Free project with no payment method.
2. In Supabase Auth, enable anonymous sign-ins, manual identity linking, Google, and Turnstile CAPTCHA.
3. Set the Turnstile secret only in the Supabase dashboard. Put only the public site key in `VITE_TURNSTILE_SITE_KEY`.
4. In Google Cloud, create a Web OAuth client and enter its client secret only in the Supabase provider dashboard.
5. Allowlist only the exact production origin and `/auth/callback`; keep local callback URLs separate.
6. Use only the Supabase URL and publishable key in Vite. Never expose service-role, database, OAuth-client, or CAPTCHA secret values.
7. Keep TOTP disabled until its complete enrollment, challenge, removal, and recovery UI has passed review. Phone MFA remains disabled.
8. Run database migrations and pgTAP tests before enabling the browser feature flag.

## Monthly checks

- Confirm plan is still Free and no payment method or paid add-on is enabled.
- Check database, egress, MAU, and Storage usage. At 70%, stop nonessential growth. At 90%, disable new image uploads and keep export/read access available.
- Check anonymous-user growth and CAPTCHA failure/rate-limit trends without logging tokens or user content.
- Delete abandoned anonymous accounts only through a reviewed maintenance script and after a manual backup.
- Confirm `pnpm run check` and `pnpm run test:db` pass.

## Safe rollback

Set `VITE_REMOTE_SYNC_ENABLED=false` and redeploy. This keeps all browser-local data and queued mutations. Do not delete remote rows, local storage, IndexedDB images, or migration receipts during rollback.
