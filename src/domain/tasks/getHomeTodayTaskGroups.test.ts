import { describe, expect, it } from "vitest";
import type { TaskCategory, TaskTemplate } from "../../types";
import { getHomeTodayTaskGroups } from "./getHomeTodayTaskGroups";

const createTask = (
  id: string,
  category: TaskCategory,
  priority: number,
  maxCount = 1,
): TaskTemplate => ({
  id,
  title: id,
  category,
  resetType: category === "daily" ? "daily" : category === "weekly" ? "weekly" : "manual",
  resetRuleId:
    category === "daily"
      ? "daily-midnight"
      : category === "weekly"
        ? "weekly-tue-1700"
        : "manual",
  maxCount,
  enabledByDefault: true,
  characterScoped: true,
  group: category === "custom" ? "custom" : "lifestyle",
  priority,
  isDefault: true,
});

describe("getHomeTodayTaskGroups", () => {
  it("places every task in exactly one category", () => {
    const tasks = [
      createTask("daily-life", "daily", 1),
      createTask("weekly-life", "weekly", 2),
      createTask("custom", "custom", 3),
    ];
    const groups = getHomeTodayTaskGroups(tasks, {});

    expect(groups.flatMap((group) => group.displayedTasks.map(({ task }) => task.id))).toEqual([
      "daily-life",
      "weekly-life",
      "custom",
    ]);
  });

  it("preserves provided order for incomplete tasks and limits each category", () => {
    const tasks = [
      createTask("third", "daily", 30),
      createTask("first-done", "daily", 10),
      createTask("second", "daily", 20),
    ];
    const [daily] = getHomeTodayTaskGroups(tasks, { "first-done": true }, 1);

    expect(daily.displayedTasks.map(({ task }) => task.id)).toEqual(["third"]);
    expect(daily.pendingTasks.map(({ task }) => task.id)).toEqual(["third", "second"]);
    expect(daily.remainingCount).toBe(1);
    expect(daily.completed).toBe(1);
  });

  it("preserves counts for multi-count tasks", () => {
    const [daily] = getHomeTodayTaskGroups(
      [createTask("delivery", "daily", 1, 12)],
      { delivery: 5 },
    );

    expect(daily.displayedTasks[0]).toMatchObject({ count: 5, completed: false });
  });

  it("distinguishes empty and completed categories", () => {
    const groups = getHomeTodayTaskGroups(
      [createTask("daily", "daily", 1)],
      { daily: true },
    );

    expect(groups.find((group) => group.category === "daily")?.state).toBe("complete");
    expect(groups.find((group) => group.category === "weekly")?.state).toBe("empty");
  });
});
