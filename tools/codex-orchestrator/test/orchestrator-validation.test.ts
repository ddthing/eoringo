import { describe, expect, it } from "vitest";
import { validateApplyOrder } from "../src/orchestrator.js";
import type { PlanTask } from "../src/types.js";

const task = (id: string, dependencies: string[] = []): PlanTask => ({
  id,
  goal: id,
  dependencies,
  readFiles: [],
  writableFiles: [`${id}.md`],
  completionCriteria: ["done"],
  difficulty: "easy",
});

describe("apply ordering", () => {
  it("requires dependencies to be applied before their dependents", () => {
    expect(() => validateApplyOrder([task("a"), task("b", ["a"])], ["b", "a"]))
      .toThrowError(/선행 작업 a/);
    expect(() => validateApplyOrder([task("a"), task("b", ["a"])], ["a", "b"]))
      .not.toThrow();
  });
});
