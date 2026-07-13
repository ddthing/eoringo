import { describe, expect, it } from "vitest";
import { shouldStartTaskCompletion } from "./homeTaskCompletion";

describe("shouldStartTaskCompletion", () => {
  it("starts feedback only when an increase reaches the target", () => {
    expect(shouldStartTaskCompletion(11, 12, 12)).toBe(true);
    expect(shouldStartTaskCompletion(5, 6, 12)).toBe(false);
  });

  it("does not restart feedback for an already completed task or a decrease", () => {
    expect(shouldStartTaskCompletion(12, 12, 12)).toBe(false);
    expect(shouldStartTaskCompletion(12, 11, 12)).toBe(false);
  });
});
