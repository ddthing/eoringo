# Home Runtime Performance Design

## Goal

Reduce repeated task derivation and interval management on the home and task-management screens without changing task visibility, ordering, completion, or reset behavior.

## Scope

1. Build the visible task set, home groups, and aggregate progress once per relevant task-state change.
2. Share that result only with `HomeHero`, `HomeTodayCheck`, and `HomeProgress` through a provider boundary. Unrelated home widgets must not subscribe to task state through their parent.
3. Replace the three mounted one-minute intervals with one reference-counted, minute-aligned clock.
4. Replace repeated per-group filtering in task ordering and task-list rendering with one grouping pass.

## Design

`getHomeDashboardTaskData` is a pure domain function. It accepts the active character, visible-task inputs, completion data, and saved ordering; it returns both the ordered today groups and all progress values. Its fixture test fixes visibility, ordering, and progress expectations.

`HomeDashboardTasksProvider` owns the React store subscriptions and memoized domain result. The three task-aware home cards consume its context. The dashboard component itself remains stateless, so the other home widgets do not become task-store subscribers.

`createMinuteClock` owns a single timeout only while it has subscribers. It schedules the next wall-clock minute boundary and stops after the final unsubscribe. The hook exposes this clock through `useSyncExternalStore`.

## Compatibility

- No persisted state, reset rule, task ordering key, or remote sync behavior changes.
- The app still updates dates and reset countdowns every minute.
- Task ordering preserves the existing `taskGroupOrder` and saved-order precedence.
- Startup sync remains unchanged because its safety needs request-level profiling before modification.

## Verification

- Unit tests assert home groups/progress output and shared clock lifecycle.
- Existing task ordering tests validate output after the grouping implementation changes.
- Full app and orchestrator tests, type checks, free-tier/security scans, and production build pass.
- A local browser render check is attempted; if the local server cannot remain available in the execution environment, that limitation is reported rather than treated as a passed browser test.
