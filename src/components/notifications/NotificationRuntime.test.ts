import { describe, expect, it } from "vitest";
import { defaultTaskTemplates } from "../../data/tasks";
import type { Character, TaskTemplate } from "../../types";
import { getNotificationTaskSummaries } from "./NotificationRuntime";

const characters: Character[] = [
  { id: "a", name: "모험가 A", server: "초코보", isMain: true },
  { id: "b", name: "모험가 B", server: "초코보", isMain: false },
];

const tasks: TaskTemplate[] = [
  {
    id: "daily-a",
    title: "무작위 임무: 숙련자",
    category: "daily",
    resetType: "daily",
    resetRuleId: "daily-midnight",
    maxCount: 1,
    enabledByDefault: true,
    characterScoped: true,
    group: "roulette",
    priority: 10,
    isDefault: true,
  },
  {
    id: "weekly-a",
    title: "주간 숙제",
    category: "weekly",
    resetType: "weekly",
    resetRuleId: "weekly-tue-1700",
    maxCount: 1,
    enabledByDefault: true,
    characterScoped: true,
    group: "combat",
    priority: 20,
    isDefault: true,
  },
];

const customDailyTask: TaskTemplate = {
  ...tasks[0],
  id: "custom-daily-b",
  title: "커스텀 일일 숙제",
  isDefault: false,
};

const hiddenDefaultTaskIds = defaultTaskTemplates.map((task) => task.id);

describe("notification runtime task summaries", () => {
  it("summarizes visible daily tasks per character", () => {
    expect(
      getNotificationTaskSummaries(characters, {
        completedByCharacter: { a: { "daily-a": 1 }, b: {} },
        customTaskTemplatesByCharacter: { a: [], b: [customDailyTask] },
        disabledDefaultTaskIdsByCharacter: {
          a: hiddenDefaultTaskIds,
          b: hiddenDefaultTaskIds,
        },
      }),
    ).toEqual([
      { characterName: "모험가 A", taskTitles: [] },
      { characterName: "모험가 B", taskTitles: ["커스텀 일일 숙제"] },
    ]);
  });
});
