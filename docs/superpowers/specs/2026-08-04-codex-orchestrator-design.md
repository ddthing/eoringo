# Codex App Server Multi-Agent Orchestrator Design

## Status

Approved by the user in the implementation request on 2026-08-04. This document records that approved design; it does not introduce a second approval gate.

## Goal and hard boundaries

Build a local TypeScript CLI that spends the user's ChatGPT Pro Codex allowance through `codex app-server --listen stdio://`. It must never call the OpenAI Responses API, accept an API key as a fallback, silently change model ids, or run live model turns during ordinary tests.

The required models are exact ids:

- planner/reviewer: `gpt-5.6-sol`
- workers: `gpt-5.6-luna`

Startup fails closed when authentication is not managed ChatGPT, the plan is not Pro, either model is missing, or the local Codex executable cannot be used. Diagnostics print the observed account mode, plan, available model ids, and supported reasoning efforts without exposing credentials.

## Architecture

The implementation lives in `tools/codex-orchestrator` as an ESM Node.js 20+ workspace package.

1. `AppServerClient` spawns `codex app-server --listen stdio://`, exchanges newline-delimited JSON-RPC messages, performs `initialize` then `initialized`, correlates responses, streams notifications, rejects unexpected approval requests, and shuts down the child process.
2. `PreflightService` checks `codex --version`, calls `account/read`, rejects API-key or non-Pro authentication, paginates `model/list`, verifies the exact Sol/Luna ids and effort levels, and records `account/rateLimits/read` snapshots.
3. `SolPlanner` starts a read-only Sol thread and requires a JSON Schema result containing task id, goal, dependencies, read files, writable files, completion criteria, and difficulty.
4. `DagScheduler` validates task ids and dependencies, rejects cycles, runs only ready tasks, blocks concurrent writable-path overlap, and caps concurrency at `--workers` (default 4).
5. `WorkspaceManager` creates a branch and temporary Git worktree for every write attempt. It records the user's initial dirty paths, never resets or cleans the original worktree, verifies changed paths against the task allowlist, and retains worktrees for inspection. A non-Git source uses a temporary isolated copy.
6. `LunaWorker` starts one Luna thread per attempt. Easy and medium tasks use the fastest supported Luna effort; hard tasks use Luna's highest supported effort. The prompt contains only the task, allowed paths, completion criteria, and retry feedback. A JSON Schema enforces the worker result shape.
7. `RetryLedger` permits the initial attempt plus at most two retries. A SHA-256 fingerprint prevents the same task and feedback from running twice.
8. `SolReviewer` reviews every worker result and test result using a separate read-only Sol turn. Only failed tasks with concrete new instructions can be retried.
9. `ApplyService` does nothing by default. With `--apply`, it checks dirty-path overlap and cherry-picks only Sol-approved commits in dependency-safe order. On conflict it aborts the cherry-pick, preserves user changes, and reports conflicting paths.
10. `StructuredLogger` writes redacted JSONL events under `.codex-orchestrator/runs/` and prints concise human-readable progress.

## App Server protocol

The client uses the stable stdio transport only. Wire messages omit the JSON-RPC `jsonrpc` field as documented by Codex App Server.

Connection startup:

1. spawn `codex app-server --listen stdio://`
2. request `initialize` with client metadata
3. notify `initialized`
4. request `account/read`
5. request and paginate `model/list`
6. request `account/rateLimits/read`

Model turns use `thread/start` with the exact model id and a read-only or workspace-write sandbox, followed by `turn/start` with `outputSchema`. The client treats final `item/completed` agent messages as authoritative and waits for `turn/completed`. Failed, interrupted, rerouted, or malformed structured output is an explicit failure. A `model/rerouted` notification is rejected because silent model substitution violates the design.

## Security and preservation

- No OpenAI API key environment variable is required or read.
- `account.type === "apiKey"` is a hard failure with ChatGPT device-code guidance.
- The orchestrator never logs prompt secrets, auth tokens, environment values, or complete App Server messages.
- Planner and reviewer run read-only.
- Workers can write only inside isolated worktrees; changed files are independently checked after each turn.
- The original working tree is never cleaned, reset, or overwritten.
- Automatic apply is opt-in and conflict-safe.
- Child process stderr is bounded and redacted before logging.

## CLI

```text
codex-orchestrate doctor
codex-orchestrate models
codex-orchestrate run --goal <text> --cwd <path> [--workers 1..4] [--apply]
```

`doctor` checks the executable, handshake, account, plan, model availability, and rate limits without starting a model turn. `models` prints the live catalog and effort levels. `run` records rate limits before and after orchestration, including failed runs.

## Testing

Normal tests spawn a Mock App Server and consume no Codex allowance. Coverage includes JSONL framing, handshake ordering, auth fail-closed behavior, exact model gating, schema parsing, DAG cycles, path overlap, concurrency limits, worktree isolation, dirty-change preservation, retry caps, duplicate suppression, no-apply default, opt-in apply, error propagation, and an end-to-end mock run.

A live integration test is skipped unless `CODEX_ORCHESTRATOR_LIVE_TEST=1`. The live test performs only the executable, handshake, account, model-list, and rate-limit reads by default; it does not start a model turn.

## Limitations

App Server is documented as a development/debugging interface that may change. The client therefore validates every response, reports the detected Codex version, and keeps protocol types deliberately narrow. Worktrees remain after a run for audit and manual cleanup. Non-Git apply is intentionally unavailable in the first version because copying changes back without Git's conflict model would weaken the user-change preservation guarantee.
