# Backup and restore

## User backup

The v7 JSON backup includes every supported local-storage key, all IndexedDB character images, an export timestamp, and a count manifest. Versions 1 through 6 remain import-compatible.

For a guest-to-Google connection whose destination account is empty, the app may run the verified migration automatically. It accepts the migration only after SHA-256 digests returned by the server and a client read-back both match the prepared local documents, and it keeps the original local data for at least seven days. When both local and remote data exist, the app requires the manual flow and downloads a complete v7 backup before replacing local state. After document hydration, referenced character images are synchronized through the private Storage bucket; each image is validated again on download, and a failed image transfer never deletes the local copy. Unreferenced remote images are intentionally retained until a reviewed cleanup process is available.

Never import backup images from network URLs. The importer accepts only bounded `data:image/...;base64` values for JPEG, PNG, WebP, and GIF.

## Operator database backup

Supabase Free does not include the paid automatic-backup guarantees used by higher plans. Before any production migration, destructive maintenance, or policy change:

1. Stop writes with the remote feature flag.
2. Export the database using the official Supabase/Postgres tooling to an encrypted local destination outside the repository.
3. Record the migration version and export timestamp without user content.
4. Restore into a disposable local Supabase instance.
5. Run `pnpm run supabase:reset`, `pnpm run test:db`, and `pnpm run check` against the restored schema.
6. Resume writes only after row counts and canonical document digests are verified.

Never commit a dump, connection string, database password, JWT, or service-role key.
