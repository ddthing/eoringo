import { describe, expect, it } from "vitest";
import { defaultTaskTemplates } from "../../data/tasks";
import type { TaskGroup, TaskTemplate } from "../../types";
import { getTaskOrderScopeKey } from "./taskOrdering";
import { getHomeDashboardTaskData } from "./getHomeDashboardTaskData";

const createTask = (
  id: string,
  category: TaskTemplate["category"],
  group: TaskGroup,
  priority: number,
): TaskTemplate => ({
  id,
  title: id,
  category,
  resetType: category === "weekly" ? "weekly" : "daily",
  resetRuleId: category === "weekly" ? "weekly-tue-1700" : "daily-midnight",
  maxCount: 1,
  enabledByDefault: true,
  characterScoped: true,
  group,
  priority,
  isDefault: false,
});

describe("home dashboard task data", () => {
  it("shares one visible task set for today groups and progress", () => {
    const characterId = "character";
    const dailyFirst = createTask("daily-first", "daily", "combat", 2);
    const dailySecond = createTask("daily-second", "daily", "combat", 1);
    const weekly = createTask("weekly", "weekly", "delivery", 3);
    const custom = createTask("custom", "custom", "custom", 4);

    const data = getHomeDashboardTaskData({
      characterId,
      completedByTaskId: { "daily-first": 1, weekly: 1 },
      disabledDefaultTaskIds: defaultTaskTemplates.map((task) => task.id),
      customTaskTemplates: [dailyFirst, dailySecond, weekly, custom],
      orderByGroup: {
        [getTaskOrderScopeKey(characterId, "daily", "combat")]: ["daily-first", "daily-second"],
      },
    });

    expect(data.groups.find((group) => group.category === "daily")?.allTasks.map((entry) => entry.task.id))
      .toEqual(["daily-first", "daily-second"]);
    expect(data.progress).toEqual({
      total: { total: 4, completed: 2, percent: 50 },
      daily: { total: 2, completed: 1, percent: 50 },
      weekly: { total: 1, completed: 1, percent: 100 },
      other: { total: 1, completed: 0, percent: 0 },
    });
  });
});
