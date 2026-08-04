import { access, readFile } from "node:fs/promises";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { CodexOrchestrator } from "../src/orchestrator.js";
import { clearMockEnvironment, createGitRepo, setMockEnvironment } from "./helpers.js";

afterEach(clearMockEnvironment);

describe("mock end-to-end run", () => {
  it("plans, runs independent workers, reviews, logs usage, and does not apply by default", async () => {
    setMockEnvironment();
    const cwd = await createGitRepo();
    const report = await new CodexOrchestrator().run({ goal: "mock goal", cwd, workers: 4, apply: false });
    expect(report.review.approved).toBe(true);
    expect(report.attempts).toHaveLength(2);
    expect(report.appliedCommits).toEqual([]);
    expect(report.preflight.rateLimits).not.toEqual(report.rateLimitsAfter);
    const logPath = join(cwd, ".codex-orchestrator", "runs", `${report.runId}.jsonl`);
    await access(logPath);
    const log = await readFile(logPath, "utf8");
    expect(log).toContain("preflight.completed");
    expect(log).toContain("rate_limits.after");
    expect(log).not.toContain("mock goal");
  });
});
