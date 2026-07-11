# Navigation and Settings Refactor Design

## Goal

Reduce the primary navigation from five destinations to four and move character management into Settings without losing existing character functionality or breaking old `/characters` links.

## Navigation

- Bottom navigation order: `오늘`, `숙제`, `일정`, `설정`.
- Remove the visible character navigation item and change the navigation grid from five to four columns.
- Keep `/characters` as a compatibility route.
- `/characters` renders no intermediate UI and uses replace navigation to `/settings#characters` so browser back navigation remains natural.

## Settings Page

Settings is a single scrollable page with these card sections in order:

1. `내 캐릭터` (`id="characters"`)
2. `테마` (`id="theme"`)
3. `알림` (`id="notifications"`)
4. `백업 및 복원` (`id="backup"`)
5. `데이터 관리` (`id="data"`)
6. `앱 정보` (`id="about"`)

The page keeps the current card, typography, spacing, color, button, and form styles. `알림` is explicitly marked as 준비중. The app information section stays informational; no unsupported browser notification behavior is introduced.

## Character Management

- Split the current combined implementation into reusable `CharacterSwitcher`, `CharacterManager`, `CharacterMainBadge`, and shared character form primitives.
- `CharacterSwitcher` owns frequent active-character switching and can be reused in task and Home surfaces.
- `CharacterManager` owns management-only actions in the first Settings section, including editing, deletion, and representative-character changes.
- `CharacterMainBadge` renders representative-character status consistently across switcher and manager surfaces.
- Preserve character selection, creation, editing, representative-character selection, deletion, profile image management, confirmation, and cleanup of character-scoped task, memo, and D-day data.
- Do not change character store persistence or data formats.

## Backup and Data

- Preserve export, import, and reset behavior.
- Present export/import under `백업` and destructive reset under `데이터` so the visible Settings structure matches the requested information architecture.
- Keep existing success/error messages, busy states, confirmation, image backup, and reload behavior.

## Anchor Navigation and Highlight

- On Settings entry, read the current URL hash.
- For a known section hash, scroll that section into view after render.
- When entering through `#characters`, apply one subtle highlight animation to the character section only.
- The animation must not repeat during ordinary interaction and must be disabled when `prefers-reduced-motion: reduce` is active.

## Home Hero Character Bottom Sheet

- Make the character identity area in Home Hero an accessible button.
- Add a reusable bottom-sheet component that displays available characters and allows switching the active character.
- Allow character creation from the bottom sheet using the shared creation form.
- Keep representative-character changes, editing, and deletion exclusive to Settings.
- Include a link to `/settings#characters` for character management.
- Support dismissal by backdrop, close button, and Escape, restore focus to the trigger, and prevent background scrolling while open.
- Keep the current Home Hero visual layout and progress information.

## Testing and Acceptance

- `/characters` resolves without a 404 and replaces the current history entry with `/settings#characters`.
- Settings contains all six sections in the specified order.
- Hash entry scrolls to the character section and triggers one subtle highlight.
- Existing character management behavior remains available in Settings.
- Home Hero can open the bottom sheet, switch the active character, and add a character without exposing management-only actions.
- Existing tests pass, new route/UI regression coverage passes, and the production build succeeds.

## Out of Scope

- New notification scheduling or permission flows.
- Changes to persisted store schemas.
- A broader redesign of Settings, Home, or navigation styling.
