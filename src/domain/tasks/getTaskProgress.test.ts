import { describe, expect, it } from "vitest";
import {
  getClampedTaskCount,
  getNextTaskCount,
  getTaskCount,
  getTaskProgress,
} from "./getTaskProgress";
import type { TaskTemplate } from "../../types";

const task = (id: string, maxCount = 1): TaskTemplate => ({
  id,
  title: id,
  category: "daily",
  resetType: "daily",
  maxCount,
  enabledByDefault: true,
  characterScoped: true,
  group: "custom",
  priority: 1,
  isDefault: true,
});

describe("task progress helpers", () => {
  it("normalizes unsafe counts", () => {
    expect(getTaskCount(-1)).toBe(0);
    expect(getTaskCount(Number.NaN)).toBe(0);
    expect(getTaskCount(2.8)).toBe(2);
    expect(getTaskCount(true)).toBe(1);
  });

  it("treats maxCount tasks as complete only at their cap", () => {
    expect(
      getTaskProgress([task("a"), task("b", 3)], {
        a: true,
        b: 2,
      }),
    ).toMatchObject({
      total: 2,
      completed: 1,
      percent: 50,
    });
  });

  it("toggles single count tasks and clamps multi count tasks", () => {
    expect(getNextTaskCount(0, 1)).toBe(1);
    expect(getNextTaskCount(1, 1)).toBe(0);
    expect(getClampedTaskCount(13, 12)).toBe(12);
    expect(getClampedTaskCount(-1, 12)).toBe(0);
  });
});
