# Codex App Server Multi-Agent Orchestrator Implementation Plan

1. Add the pnpm workspace package, NodeNext TypeScript configuration, root scripts, and runtime ignore rules.
2. Implement the stdio JSON-RPC transport, request correlation, notifications, server-request rejection, timeouts, and clean shutdown.
3. Implement executable/version checks, initialization, ChatGPT Pro authentication gating, model pagination and exact model gating, reasoning selection, and rate-limit snapshots.
4. Implement JSON schemas and parsers for Sol plans, Luna results, and Sol reviews.
5. Implement DAG validation, writable-path conflict detection, bounded scheduling, retry fingerprints, and maximum-attempt enforcement.
6. Implement Git worktree isolation, changed-path validation, commit capture, dirty-path preservation, dependency commit staging, and opt-in conflict-safe application.
7. Implement Sol planner/reviewer, Luna worker execution, turn event collection, reroute rejection, and the top-level orchestration loop.
8. Implement the `doctor`, `models`, and `run` CLI commands plus structured JSONL logging and actionable errors.
9. Add a deterministic Mock App Server, unit tests, mock end-to-end tests, and an opt-in live account integration test.
10. Document installation, commands, security model, maintenance workflow, live-test opt-in, and known limitations.
11. Run installation, typecheck, unit tests, mock end-to-end execution, CLI help, root security scans, and build verification. Run live non-consuming diagnostics only if the installed Codex executable is callable in the current environment.
