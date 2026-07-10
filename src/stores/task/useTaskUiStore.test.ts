import { describe, expect, it } from "vitest";
import { reorderTaskIds } from "./useTaskUiStore";

describe("task UI ordering", () => {
  it("moves one task before another without changing task data", () => {
    expect(reorderTaskIds(["a", "b", "c"], "c", "a")).toEqual(["c", "a", "b"]);
  });

  it("returns the original order for unknown ids", () => {
    const order = ["a", "b"];
    expect(reorderTaskIds(order, "missing", "a")).toBe(order);
  });
});
