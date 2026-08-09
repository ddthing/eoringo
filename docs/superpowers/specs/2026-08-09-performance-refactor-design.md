# Performance Refactor Design

## Goal

Reduce initial JavaScript cost, avoid no-op persistence work, and prevent unrelated remote-sync documents from being serialized after a single store change. Preserve all existing user data, authentication, reset, conflict, and offline behavior.

## Baseline

- Production entry chunk: 415.07 kB raw, 127.88 kB gzip.
- All route pages are statically imported into the entry graph.
- A store change schedules a capture of all five remotely persisted documents.
- The minute reset check returns a new task-state patch even when no reset occurred.
- Home progress is derived independently by `HomeHero` and `HomeProgress`.

## Selected approach

Use an incremental, test-first refactor. The first implementation batch contains only changes with a direct, deterministic test seam:

1. Lazy-load non-home route pages while keeping the app shell and home route eager.
2. Make `ensureCurrentResets` return the existing state when reset keys and task completion data are unchanged.
3. Give the sync bridge document-scoped subscriptions so a store change captures and serializes only the corresponding remote document.

Home-model consolidation, shared clocks, and startup-sync reduction are deferred to a second batch because they require browser profiling or broader component API changes.

## Data flow and boundaries

### Routes

The app shell remains the synchronous route boundary. Calendar, settings, task list, task management, and auth callback pages become lazy route modules with a shared accessible loading fallback. Navigation and error-boundary behavior remain unchanged.

### Reset checks

The reset function computes candidate keys and expired interval tasks as it does today. It compares all returned references and primitive keys with the current state. When nothing changed, it returns the current state so Zustand persistence and subscribers are not notified.

### Remote sync

Each persisted store subscription is mapped to one document type. The bridge keeps per-document canonical baselines and a set of dirty document types. Changes in the same microtask are coalesced. Capture, validation, queue replacement, conflict semantics, and remote hydration suppression remain unchanged.

## Error handling and compatibility

- Lazy-route loading errors continue through the existing route error boundary.
- No persisted schema or storage key changes.
- No queue format, retry policy, or conflict behavior changes.
- Hydration still rebuilds every baseline after applying remote documents.
- Existing uncommitted UI changes stay outside this refactor's edits.

## Verification

- Unit test: a no-op reset preserves the task-store state reference and produces no persisted write.
- Unit test: changing one store serializes and queues only its mapped document.
- Unit test: multiple same-tick changes coalesce without losing the latest payload.
- Existing task-reset and sync suites remain green.
- Full type check, unit tests, and production build pass.
- Production entry gzip size decreases by at least 20% from 127.88 kB, or the measured result and remaining route coupling are reported.

## Out of scope for this batch

- Changing persistence storage technology.
- Removing either startup sync without request-level evidence.
- List virtualization.
- Visual redesign or changes to the seven pending settings/account UI files.
