import { describe, expect, it } from "vitest";
import { pathsConflict, RetryLedger, scheduleDag, validateDag } from "../src/scheduler.js";
import type { PlanTask } from "../src/types.js";

const task = (id: string, dependencies: string[] = [], writableFiles = [`src/${id}.ts`]): PlanTask => ({
  id,
  goal: id,
  dependencies,
  readFiles: [],
  writableFiles,
  completionCriteria: ["done"],
  difficulty: "easy",
});

describe("DAG scheduler", () => {
  it("rejects cycles", () => {
    expect(() => validateDag([task("a", ["b"]), task("b", ["a"])])).toThrowError(/순환/);
  });

  it("detects overlapping files and globs", () => {
    expect(pathsConflict(["src/auth/**"], ["src/auth/login.ts"])).toBe(true);
    expect(pathsConflict(["src/a.ts"], ["src/b.ts"])).toBe(false);
  });

  it("runs independent work in parallel but serializes overlaps", async () => {
    let active = 0;
    let maximum = 0;
    const execution: string[] = [];
    await scheduleDag([task("a", [], ["src/shared.ts"]), task("b", [], ["src/shared.ts"]), task("c")], 4, async (item) => {
      active += 1;
      maximum = Math.max(maximum, active);
      execution.push(`start:${item.id}`);
      await new Promise((resolve) => setTimeout(resolve, 15));
      execution.push(`end:${item.id}`);
      active -= 1;
      return item.id;
    });
    expect(maximum).toBe(2);
    expect(execution.indexOf("start:b")).toBeGreaterThan(execution.indexOf("end:a"));
  });
});

describe("RetryLedger", () => {
  it("blocks duplicate input and more than two retries", () => {
    const ledger = new RetryLedger(2);
    const item = task("a");
    expect(ledger.begin(item, null)).toBe(1);
    expect(() => ledger.begin(item, null)).toThrowError(/중복/);
    expect(ledger.begin(item, "fix one")).toBe(2);
    expect(ledger.begin(item, "fix two")).toBe(3);
    expect(() => ledger.begin(item, "fix three")).toThrowError(/최대 재시도/);
  });
});
