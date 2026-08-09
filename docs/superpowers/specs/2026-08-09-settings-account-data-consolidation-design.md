# Settings Account/Data Consolidation Design

## Goal

Reorganize the settings tab into the approved C-style, single-column layout. Account connection, local-data backup/restore, and data reset should read as one continuous flow without changing their security or data behavior. Notifications remains a separate section. The app information section keeps the existing Thanks to content and 문의하기 link while removing duplicated local-storage guidance.

## Current structure

- `SettingsPage` renders separate cards for `AccountPanel`, `DataSettingsPanel`, and `AppInfoPanel`.
- `AccountPanel` owns guest/session state, Google linking, Turnstile, local-to-remote migration, and sync status.
- `DataSettingsPanel` owns JSON backup/restore and destructive local reset.
- `AppInfoPanel` contains an informational local-data notice, Thanks to, and 문의하기.
- Deep links currently use `#account`, `#backup`, `#data`, and `#about`; auth callbacks navigate to `#account`.

## Approved layout

1. A single `ACCOUNT & DATA` card, rendered as a vertical sequence:
   - Account status and Google account connection/migration controls.
   - `DATA` subsection with backup and restore actions.
   - `DANGER ZONE` subsection with the existing reset confirmation and reset behavior.
2. A separate `ABOUT` card below it, retaining app description, Thanks to, and 문의하기.
3. Notifications stays as its own card in its existing position.
4. No desktop two-column split is introduced. Content remains one readable column at all viewport sizes; only existing action-button wrapping may respond to narrow widths.

## Component boundaries

### `AccountDataPanel`

Add a settings composition component responsible only for the shared card shell and vertical separators. It renders account and data content in order and applies the existing `card`, spacing, border, and theme tokens. It does not own auth or storage state.

### `AccountPanel`

Keep all current auth behavior and expose an embedded presentation mode (or equivalent content component) so it can render inside `AccountDataPanel` without a nested card. The default standalone presentation remains available for reuse and tests. Existing Turnstile, Google linking, migration, sync status, error messages, and retry behavior remain unchanged.

### `DataSettingsPanel`

Keep all current backup/restore/reset behavior and expose an embedded presentation mode (or equivalent content component). Backup and restore continue using `exportBackup`/`importBackup`; reset continues through the confirmation dialog, `storageKeys`, and `clearCharacterImages`. The reset subsection remains visually and semantically isolated as a danger area.

### `AppInfoPanel`

Keep the existing app description, Thanks to content, and 문의하기 link. Remove only the local-data notice because that guidance is now represented in the Account & Data flow. No link target or external-link security attributes change.

### `SettingsPage` and section anchors

Render `AccountDataPanel` at the existing account location. Preserve deep-link compatibility:

- `#account` targets the combined card.
- `#backup` targets the backup/restore subsection inside the combined card.
- `#data` targets the reset subsection inside the combined card.
- `#about` remains the separate app information card.

Do not change the existing section IDs or remove legacy hash support. Update only the DOM ownership so there is one visible combined card instead of two adjacent cards.

## Data flow and safety

No database, auth, storage, or migration schema changes are part of this work. The UI composition must not alter:

- anonymous guest creation and Turnstile gating;
- Google identity linking and account-merge error handling;
- local-to-remote migration and sync status reporting;
- backup payload format, image handling, validation, or restore reload;
- reset confirmation wording/flow and local image cleanup.

The only behavior change is presentation-level grouping and removal of duplicated explanatory copy.

## Accessibility and responsive behavior

- Keep semantic headings and button labels from the current panels.
- Preserve `aria-live` status/error regions and disabled/busy states.
- Keep reset controls keyboard reachable and visually distinct.
- Use the existing utility classes and color tokens; do not add a desktop-only horizontal layout.
- Ensure focus/scroll behavior still works for all supported hashes.

## Verification plan

1. Add/update component tests for:
   - one combined account/data card in `SettingsPage`;
   - backup, restore, and reset controls still present;
   - Thanks to and 문의하기 still present;
   - notification section remains separate;
   - legacy `#account`, `#backup`, `#data`, and `#about` section resolution.
2. Run the focused settings/auth/backup tests.
3. Run the full project check (`pnpm.cmd run check`) to cover typecheck, tests, build, and security/free-tier gates.
4. Inspect the rendered settings page at narrow and desktop widths to confirm the single-column layout and preserved interaction states.

## Scope exclusions

- No new login provider or account-management feature.
- No Supabase schema or RLS change.
- No redesign of the notifications, theme, character, or housing sections.
- No removal of existing backup compatibility or destructive-action safeguards.
