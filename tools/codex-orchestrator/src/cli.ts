#!/usr/bin/env node
import { resolve } from "node:path";
import { AppServerClient } from "./app-server/client.js";
import { OrchestratorError, errorMessage } from "./errors.js";
import { CodexOrchestrator } from "./orchestrator.js";
import { loginGuidance, resolveLaunchConfiguration, runPreflight } from "./preflight.js";

const help = `codex-orchestrate - ChatGPT Pro Codex App Server multi-agent orchestrator

Usage:
  codex-orchestrate doctor [--cwd <path>]
  codex-orchestrate models [--cwd <path>]
  codex-orchestrate run --goal <text> [--cwd <path>] [--workers <1-4>] [--apply]
  codex-orchestrate --help

Safety:
  Uses only codex app-server --listen stdio:// and ChatGPT managed auth.
  API-key auth and silent model fallback are rejected.
  Model turns are never started by doctor or models.
  Worker commits are not applied unless --apply is present.
`;

interface ParsedArgs {
  command: string;
  values: Map<string, string | boolean>;
}

const parseArgs = (argv: string[]): ParsedArgs => {
  const command = argv[0] ?? "help";
  const values = new Map<string, string | boolean>();
  for (let index = 1; index < argv.length; index += 1) {
    const token = argv[index]!;
    if (!token.startsWith("--")) throw new OrchestratorError("INVALID_ARGUMENT", `알 수 없는 인수: ${token}`);
    const key = token.slice(2);
    if (["apply", "help"].includes(key)) values.set(key, true);
    else {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) throw new OrchestratorError("MISSING_ARGUMENT_VALUE", `--${key} 값이 필요합니다.`);
      values.set(key, value);
      index += 1;
    }
  }
  return { command, values };
};

const stringValue = (args: ParsedArgs, key: string, fallback?: string): string => {
  const value = args.values.get(key);
  if (typeof value === "string") return value;
  if (fallback !== undefined) return fallback;
  throw new OrchestratorError("MISSING_REQUIRED_ARGUMENT", `--${key} 값이 필요합니다.`);
};

const inspect = async (cwd: string, showModels: boolean): Promise<void> => {
  const launch = resolveLaunchConfiguration(cwd);
  const client = new AppServerClient({ ...launch.appServer, requestTimeoutMs: 60_000 });
  try {
    const result = await runPreflight(client, launch.codexCommand);
    const account = result.account.account!;
    console.log(`Codex: ${result.codexVersion}`);
    console.log(`인증: ${account.type} / 요금제: ${String(account.planType)}`);
    console.log(`Sol effort: ${result.solEffort}`);
    console.log(`Luna fast/hard effort: ${result.lunaFastEffort}/${result.lunaHardEffort}`);
    if (showModels) {
      for (const model of result.models) {
        const modelEfforts = (model.supportedReasoningEfforts ?? []).map((item) => item.reasoningEffort).join(", ");
        console.log(`${model.model}${model.hidden ? " (hidden)" : ""}: ${modelEfforts || "effort 미제공"}`);
      }
    }
    console.log(`사용량: ${JSON.stringify(result.rateLimits)}`);
  } finally {
    await client.close();
  }
};

const main = async () => {
  const args = parseArgs(process.argv.slice(2));
  if (args.command === "help" || args.command === "--help" || args.values.get("help")) {
    console.log(help);
    return;
  }
  const cwd = resolve(stringValue(args, "cwd", process.cwd()));
  if (args.command === "doctor") return await inspect(cwd, false);
  if (args.command === "models") return await inspect(cwd, true);
  if (args.command === "run") {
    const workersRaw = stringValue(args, "workers", "4");
    const workers = Number(workersRaw);
    if (!Number.isInteger(workers) || workers < 1 || workers > 4) throw new OrchestratorError("INVALID_WORKER_COUNT", "--workers는 1~4 정수여야 합니다.");
    const report = await new CodexOrchestrator().run({
      goal: stringValue(args, "goal"),
      cwd,
      workers,
      apply: args.values.get("apply") === true,
    });
    console.log(JSON.stringify({
      runId: report.runId,
      approved: report.review.approved,
      summary: report.review.summary,
      attempts: report.attempts.length,
      appliedCommits: report.appliedCommits,
      rateLimitsBefore: report.preflight.rateLimits,
      rateLimitsAfter: report.rateLimitsAfter,
    }, null, 2));
    return;
  }
  throw new OrchestratorError("UNKNOWN_COMMAND", `알 수 없는 명령: ${args.command}`);
};

main().catch((error) => {
  const code = error instanceof OrchestratorError ? error.code : "UNEXPECTED";
  console.error(`[${code}] ${errorMessage(error)}`);
  if (["CHATGPT_LOGIN_REQUIRED", "API_KEY_AUTH_FORBIDDEN", "CHATGPT_AUTH_REQUIRED"].includes(code)) console.error(loginGuidance());
  process.exitCode = 1;
});
