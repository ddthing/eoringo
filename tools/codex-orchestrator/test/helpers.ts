import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

export const mockServerPath = fileURLToPath(new URL("./fixtures/mock-app-server.mjs", import.meta.url));

export const runCommand = async (command: string, args: string[], cwd: string) =>
  await new Promise<{ stdout: string; stderr: string; code: number }>((resolve, reject) => {
    let stdout = "";
    let stderr = "";
    const child = spawn(command, args, { cwd, stdio: ["ignore", "pipe", "pipe"], windowsHide: true });
    child.stdout.on("data", (chunk: Buffer) => (stdout += chunk.toString("utf8")));
    child.stderr.on("data", (chunk: Buffer) => (stderr += chunk.toString("utf8")));
    child.once("error", reject);
    child.once("exit", (code) => resolve({ stdout, stderr, code: code ?? -1 }));
  });

export const createGitRepo = async () => {
  const cwd = await mkdtemp(join(tmpdir(), "codex-orchestrator-test-"));
  await runCommand("git", ["init"], cwd);
  await runCommand("git", ["config", "user.email", "orchestrator@example.test"], cwd);
  await runCommand("git", ["config", "user.name", "Orchestrator Test"], cwd);
  await writeFile(join(cwd, "README.md"), "test repo\n", "utf8");
  await writeFile(join(cwd, "package.json"), "{}\n", "utf8");
  await runCommand("git", ["add", "."], cwd);
  await runCommand("git", ["commit", "-m", "initial"], cwd);
  return cwd;
};

export const setMockEnvironment = () => {
  process.env.CODEX_ORCHESTRATOR_APP_SERVER_COMMAND = process.execPath;
  process.env.CODEX_ORCHESTRATOR_APP_SERVER_ARGS = JSON.stringify([mockServerPath]);
  process.env.CODEX_ORCHESTRATOR_MOCK_VERSION = "codex-cli 0.146.0-mock";
};

export const clearMockEnvironment = () => {
  for (const key of [
    "CODEX_ORCHESTRATOR_APP_SERVER_COMMAND",
    "CODEX_ORCHESTRATOR_APP_SERVER_ARGS",
    "CODEX_ORCHESTRATOR_MOCK_VERSION",
    "MOCK_ACCOUNT_TYPE",
    "MOCK_PLAN_TYPE",
    "MOCK_MISSING_MODEL",
    "MOCK_REROUTE",
    "MOCK_TRACE_FILE",
    "MOCK_THREAD_MODEL",
    "MOCK_OMIT_RESULT_MODEL",
  ]) delete process.env[key];
};
