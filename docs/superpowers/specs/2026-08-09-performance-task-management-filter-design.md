# Task Management Filter Performance Design

## Goal

Avoid recalculating the same task-management search and status filters in the toolbar count, default-task list, and custom-task list.

## Design

`getManagedTaskResults` is a pure domain function. Given default tasks, custom tasks, disabled default IDs, query, status, and reset filter, it produces the matching default list, matching custom list, and result count in one pass per source list.

`TaskManagementPage` owns that memoized result and passes the already-filtered lists to both child managers. The children retain their state subscriptions and mutation actions, but no longer repeat the filter when data is supplied. `DefaultTaskManager` additionally groups the received tasks in one pass before rendering group sections.

## Sync safety boundary

`startRemoteSyncRuntime` still performs a startup sync before and after attaching the store bridge. The added runtime test preserves this order. Reducing it requires request-level evidence that writes during hydration cannot be lost or incorrectly queued, so it is intentionally out of scope.

## Compatibility and verification

- Search, enabled/hidden/all status, reset filter, task ordering, and empty-state behavior are unchanged.
- Custom task progress continues to use all enabled custom tasks, not only the filtered display list.
- Pure filtering and sync-start order tests cover the new boundary.
- Full tests, type checks, security/free-tier checks, and production build must pass.
