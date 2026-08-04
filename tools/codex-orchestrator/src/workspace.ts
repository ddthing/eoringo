import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { cp, mkdtemp, readdir, readFile, stat } from "node:fs/promises";
import { basename, join, relative, resolve, sep } from "node:path";
import { tmpdir } from "node:os";
import { OrchestratorError } from "./errors.js";
import type { PlanTask } from "./types.js";

interface CommandResult {
  stdout: string;
  stderr: string;
  code: number;
}

const run = async (command: string, args: string[], cwd: string, allowFailure = false): Promise<CommandResult> =>
  await new Promise<CommandResult>((resolvePromise, reject) => {
    let stdout = "";
    let stderr = "";
    const child = spawn(command, args, { cwd, stdio: ["ignore", "pipe", "pipe"], windowsHide: true });
    child.stdout.on("data", (chunk: Buffer) => (stdout += chunk.toString("utf8")));
    child.stderr.on("data", (chunk: Buffer) => (stderr += chunk.toString("utf8")));
    child.once("error", reject);
    child.once("exit", (code) => {
      const result = { stdout, stderr, code: code ?? -1 };
      if (!allowFailure && result.code !== 0) {
        reject(new OrchestratorError("COMMAND_FAILED", `${command} ${args.join(" ")} 실패: ${stderr.trim() || stdout.trim()}`, result));
      } else resolvePromise(result);
    });
  });

const git = (cwd: string, args: string[], allowFailure = false) => run("git", args, cwd, allowFailure);
const normalize = (value: string): string => value.replaceAll("\\", "/").replace(/^\.\//, "");
const safeName = (value: string): string => value.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48) || "task";

const globRegex = (pattern: string): RegExp => {
  const normalized = normalize(pattern);
  let output = "^";
  for (let index = 0; index < normalized.length; index += 1) {
    const char = normalized[index]!;
    if (char === "*" && normalized[index + 1] === "*") {
      output += ".*";
      index += 1;
    } else if (char === "*") output += "[^/]*";
    else if (char === "?") output += "[^/]";
    else output += char.replace(/[\\^$.*+?()[\]{}|]/g, "\\$&");
  }
  return new RegExp(`${output}(?:/.*)?$`);
};

export const pathAllowed = (file: string, allowlist: string[]): boolean => {
  const normalized = normalize(file);
  if (!normalized || normalized.startsWith("../") || normalized.includes("/../")) return false;
  return allowlist.some((entry) => globRegex(entry).test(normalized));
};

const statusPaths = async (cwd: string): Promise<string[]> => {
  const result = await git(cwd, ["status", "--porcelain=v1"]);
  return result.stdout
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => normalize((line.slice(3).split(" -> ").at(-1) ?? "").replace(/^"|"$/g, "")))
    .filter(Boolean);
};

const commitFiles = async (cwd: string, commit: string): Promise<string[]> => {
  const result = await git(cwd, ["show", "--pretty=format:", "--name-only", commit]);
  return result.stdout.split(/\r?\n/).map(normalize).filter(Boolean);
};

const listHashes = async (root: string): Promise<Map<string, string>> => {
  const hashes = new Map<string, string>();
  const visit = async (directory: string): Promise<void> => {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      if ([".git", "node_modules", ".codex-orchestrator", "dist"].includes(entry.name)) continue;
      const absolute = join(directory, entry.name);
      if (entry.isDirectory()) await visit(absolute);
      else if (entry.isFile()) {
        const path = normalize(relative(root, absolute));
        hashes.set(path, createHash("sha256").update(await readFile(absolute)).digest("hex"));
      }
    }
  };
  await visit(root);
  return hashes;
};

export interface WorkspaceHandle {
  kind: "git" | "copy";
  path: string;
  branch: string | null;
  taskId: string;
  baseline?: Map<string, string>;
}

export interface WorkspaceFinalizeResult {
  changedFiles: string[];
  commit: string | null;
  patch: string | null;
}

export class WorkspaceManager {
  readonly sourceCwd: string;
  readonly repoRoot: string | null;
  readonly baseCommit: string | null;
  readonly initialDirtyPaths: string[];
  readonly runId: string;
  readonly tempRoot: string;

  private constructor(params: {
    sourceCwd: string;
    repoRoot: string | null;
    baseCommit: string | null;
    initialDirtyPaths: string[];
    runId: string;
    tempRoot: string;
  }) {
    Object.assign(this, params);
    this.sourceCwd = params.sourceCwd;
    this.repoRoot = params.repoRoot;
    this.baseCommit = params.baseCommit;
    this.initialDirtyPaths = params.initialDirtyPaths;
    this.runId = params.runId;
    this.tempRoot = params.tempRoot;
  }

  static async create(sourceCwd: string, runId: string): Promise<WorkspaceManager> {
    const cwd = resolve(sourceCwd);
    const inside = await git(cwd, ["rev-parse", "--is-inside-work-tree"], true);
    const tempRoot = await mkdtemp(join(tmpdir(), `codex-orchestrator-${safeName(runId)}-`));
    if (inside.code !== 0 || inside.stdout.trim() !== "true") {
      return new WorkspaceManager({ sourceCwd: cwd, repoRoot: null, baseCommit: null, initialDirtyPaths: [], runId, tempRoot });
    }
    const root = (await git(cwd, ["rev-parse", "--show-toplevel"])).stdout.trim();
    const head = (await git(root, ["rev-parse", "HEAD"])).stdout.trim();
    return new WorkspaceManager({ sourceCwd: cwd, repoRoot: root, baseCommit: head, initialDirtyPaths: await statusPaths(root), runId, tempRoot });
  }

  async createWorkspace(task: PlanTask, attempt: number, dependencyCommits: string[] = []): Promise<WorkspaceHandle> {
    const directory = join(this.tempRoot, `${safeName(task.id)}-a${attempt}`);
    if (this.repoRoot && this.baseCommit) {
      const branch = `codex/orchestrator/${safeName(this.runId)}/${safeName(task.id)}-a${attempt}`;
      await git(this.repoRoot, ["worktree", "add", "-b", branch, directory, this.baseCommit]);
      for (const commit of dependencyCommits) await git(directory, ["cherry-pick", commit]);
      return { kind: "git", path: directory, branch, taskId: task.id };
    }
    await cp(this.sourceCwd, directory, {
      recursive: true,
      filter: (source) => ![".git", "node_modules", ".codex-orchestrator", "dist"].includes(basename(source)),
    });
    return { kind: "copy", path: directory, branch: null, taskId: task.id, baseline: await listHashes(directory) };
  }

  async finalizeWorkspace(handle: WorkspaceHandle, task: PlanTask): Promise<WorkspaceFinalizeResult> {
    if (handle.kind === "copy") {
      const after = await listHashes(handle.path);
      const baseline = handle.baseline ?? new Map();
      const changed = [...new Set([...baseline.keys(), ...after.keys()])].filter((path) => baseline.get(path) !== after.get(path)).sort();
      this.#assertAllowed(changed, task);
      return { changedFiles: changed, commit: null, patch: null };
    }

    const changed = await statusPaths(handle.path);
    this.#assertAllowed(changed, task);
    if (!changed.length) return { changedFiles: [], commit: null, patch: null };
    await git(handle.path, ["add", "--all"]);
    const commitResult = await git(handle.path, ["commit", "-m", `orchestrator(${safeName(task.id)}): ${task.goal.slice(0, 60)}`], true);
    if (commitResult.code === 0) {
      const commit = (await git(handle.path, ["rev-parse", "HEAD"])).stdout.trim();
      return { changedFiles: await commitFiles(handle.path, commit), commit, patch: null };
    }
    const patch = (await git(handle.path, ["diff", "--cached", "--binary"])).stdout;
    return { changedFiles: changed, commit: null, patch: patch || null };
  }

  async applyCommits(commits: string[]): Promise<string[]> {
    if (!this.repoRoot) throw new OrchestratorError("NON_GIT_APPLY_UNSUPPORTED", "Git 저장소가 아닌 작업공간에는 안전한 자동 적용을 지원하지 않습니다.");
    const currentDirty = await statusPaths(this.repoRoot);
    const applied: string[] = [];
    for (const commit of commits) {
      const files = await commitFiles(this.repoRoot, commit);
      const conflicts = files.filter((file) => currentDirty.includes(file));
      if (conflicts.length) throw new OrchestratorError("USER_CHANGES_CONFLICT", `사용자 변경과 겹쳐 적용을 중단했습니다: ${conflicts.join(", ")}`);
      const result = await git(this.repoRoot, ["cherry-pick", commit], true);
      if (result.code !== 0) {
        await git(this.repoRoot, ["cherry-pick", "--abort"], true);
        throw new OrchestratorError("CHERRY_PICK_CONFLICT", `커밋 ${commit} 적용 충돌: ${result.stderr.trim() || result.stdout.trim()}`);
      }
      applied.push(commit);
    }
    return applied;
  }

  #assertAllowed(changed: string[], task: PlanTask): void {
    const unauthorized = changed.filter((file) => !pathAllowed(file, task.writableFiles));
    if (unauthorized.length) {
      throw new OrchestratorError("UNAUTHORIZED_FILE_CHANGE", `${task.id}가 허용되지 않은 파일을 변경했습니다: ${unauthorized.join(", ")}`);
    }
  }
}
