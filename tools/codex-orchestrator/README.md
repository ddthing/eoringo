# Codex App Server Orchestrator

Local multi-agent orchestration through the Codex App Server and ChatGPT Pro authentication. It does not use the OpenAI Responses API, an OpenAI API key, WebSocket transport, or a paid API fallback.

## Requirements

- Node.js 20 or newer
- pnpm
- Git for write tasks and `--apply`
- An executable `codex` CLI that supports `app-server --listen stdio://`
- Codex signed in with a ChatGPT Pro account
- Exact model access to `gpt-5.6-sol` and `gpt-5.6-luna`

The CLI fails closed if the account is logged out, uses API-key authentication, is not Pro, or does not advertise both exact model ids. It prints the observed model catalog and effort levels; it never substitutes another model.

## Install and build

From the repository root:

```powershell
pnpm install
pnpm orchestrator:typecheck
pnpm orchestrator:test
pnpm orchestrator:build
```

Run the built CLI directly:

```powershell
node tools/codex-orchestrator/dist/cli.js --help
```

Or expose the package bin using the pnpm linking workflow appropriate for your machine, then use `codex-orchestrate` directly.

## Commands

```powershell
codex-orchestrate doctor --cwd .
codex-orchestrate models --cwd .
codex-orchestrate run --goal "로그인 기능을 분석하고 테스트까지 추가해줘" --cwd . --workers 4
codex-orchestrate run --goal "로그인 기능을 수정하고 검증해줘" --cwd . --workers 4 --apply
```

`doctor` and `models` perform only executable, handshake, account, model-catalog, and rate-limit reads. They do not start a model turn.

`run` uses one read-only Sol thread for planning and review. Each task attempt gets a new Luna thread and an isolated Git worktree. Independent tasks run concurrently, capped by `--workers` from 1 to 4. Tasks whose writable paths overlap run sequentially.

The default is review-only: worker branches and worktrees are retained, but nothing is merged into the user's current branch. `--apply` cherry-picks only Sol-approved worker commits in the reviewed order.

## Authentication behavior

Startup calls `account/read` with `refreshToken: false`.

- Logged out: the CLI tells the user to start `account/login/start` with `type: "chatgptDeviceCode"` and use the returned verification URL and user code.
- API key: startup stops and tells the user to sign out and switch to ChatGPT authentication.
- Non-ChatGPT or non-Pro: startup stops and prints the observed account type or plan.
- ChatGPT Pro: startup continues to exact model validation.

Credentials and environment values are never written to run logs.

## Model and effort behavior

The model catalog is paginated with `includeHidden: true`, but hidden models are not accepted as runnable requirements. Both `id` and `model` must exactly equal the required slug.

- Sol uses `max` when advertised. Otherwise it uses the last supported effort returned by the catalog and reports that choice.
- Luna uses the first advertised effort for easy/medium tasks and the last advertised effort for hard tasks.
- A `model/rerouted` notification or a mismatched `thread/start` response is a hard failure.

No provider/model fallback flag is enabled.

## Safety and user-change preservation

- App Server transport is newline-delimited JSON over stdio only.
- Planner and reviewer use a read-only sandbox.
- Workers use workspace-write only inside temporary worktrees.
- Every changed path is checked against the Sol task's writable-file allowlist.
- The original dirty paths are recorded before work starts.
- The original worktree is never cleaned, reset, or overwritten.
- `--apply` refuses commits that touch currently dirty user paths.
- A cherry-pick conflict is aborted and reported.
- Each task gets one initial attempt and at most two retries.
- SHA-256 fingerprints reject identical task/feedback executions.
- Unexpected interactive App Server requests are declined instead of hanging unattended.

Run logs are redacted JSONL files under:

```text
.codex-orchestrator/runs/<run-id>.jsonl
```

## Tests

Ordinary tests use `test/fixtures/mock-app-server.mjs`; they do not contact OpenAI or consume Codex allowance.

```powershell
pnpm orchestrator:typecheck
pnpm orchestrator:test
pnpm orchestrator:mock
```

The optional live integration test is read-only and starts no model turn. It must be explicitly enabled:

```powershell
$env:CODEX_ORCHESTRATOR_LIVE_TEST='1'
pnpm --dir tools/codex-orchestrator run test:integration
```

Do not set that variable in general CI.

## Environment variables

See `.env.example`. The implementation does not automatically load `.env`; values must be supplied by the shell or process manager.

- `CODEX_ORCHESTRATOR_CODEX_PATH`: optional path to the Codex executable.
- `CODEX_ORCHESTRATOR_LIVE_TEST=1`: explicit read-only live integration opt-in.
- `CODEX_ORCHESTRATOR_APP_SERVER_COMMAND` and `CODEX_ORCHESTRATOR_APP_SERVER_ARGS`: internal Mock App Server hooks, not production fallbacks.

No `OPENAI_API_KEY` is accepted or required.

## Current limitations

- Codex App Server is documented as a development/debugging interface and can change. The client validates response shapes and reports the detected CLI version.
- Automatic apply is unavailable for non-Git directories because copying files back without Git's conflict model would weaken user-change preservation.
- Temporary worktrees and branches are retained for audit. Cleanup is manual so a failed run cannot erase useful evidence.
- Worker prompts restrict files and the orchestrator verifies the resulting diff, but the App Server sandbox itself is scoped to the worktree rather than individual files.

Official protocol reference: [Codex App Server](https://developers.openai.com/codex/app-server/).
