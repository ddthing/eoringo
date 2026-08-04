import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { WorkspaceManager } from "../src/workspace.js";
import type { PlanTask } from "../src/types.js";
import { createGitRepo, runCommand } from "./helpers.js";

const makeTask = (): PlanTask => ({
  id: "docs",
  goal: "add docs",
  dependencies: [],
  readFiles: ["README.md"],
  writableFiles: ["docs/**"],
  completionCriteria: ["doc exists"],
  difficulty: "easy",
});

describe("WorkspaceManager", () => {
  it("isolates worker writes and preserves user dirty changes", async () => {
    const cwd = await createGitRepo();
    await writeFile(join(cwd, "README.md"), "user dirty change\n", "utf8");
    const manager = await WorkspaceManager.create(cwd, "test-run");
    expect(manager.initialDirtyPaths).toContain("README.md");
    const handle = await manager.createWorkspace(makeTask(), 1);
    await mkdir(join(handle.path, "docs"), { recursive: true });
    await writeFile(join(handle.path, "docs", "result.md"), "worker result\n", "utf8");
    const result = await manager.finalizeWorkspace(handle, makeTask());
    expect(result.changedFiles).toEqual(["docs/result.md"]);
    expect(result.commit).toBeTruthy();
    expect(await readFile(join(cwd, "README.md"), "utf8")).toBe("user dirty change\n");
    expect((await readFile(join(handle.path, "README.md"), "utf8")).trim()).toBe("test repo");
  });

  it("rejects writes outside the allowlist", async () => {
    const cwd = await createGitRepo();
    const manager = await WorkspaceManager.create(cwd, "test-run-invalid");
    const handle = await manager.createWorkspace(makeTask(), 1);
    await writeFile(join(handle.path, "README.md"), "unauthorized\n", "utf8");
    await expect(manager.finalizeWorkspace(handle, makeTask())).rejects.toMatchObject({ code: "UNAUTHORIZED_FILE_CHANGE" });
  });

  it("refuses apply when current user changes overlap", async () => {
    const cwd = await createGitRepo();
    const manager = await WorkspaceManager.create(cwd, "test-run-conflict");
    const task: PlanTask = { ...makeTask(), writableFiles: ["README.md"] };
    const handle = await manager.createWorkspace(task, 1);
    await writeFile(join(handle.path, "README.md"), "worker\n", "utf8");
    const result = await manager.finalizeWorkspace(handle, task);
    await writeFile(join(cwd, "README.md"), "user\n", "utf8");
    await expect(manager.applyCommits([result.commit!])).rejects.toMatchObject({ code: "USER_CHANGES_CONFLICT" });
    expect((await runCommand("git", ["status", "--porcelain"], cwd)).stdout).toContain("README.md");
  });
});
