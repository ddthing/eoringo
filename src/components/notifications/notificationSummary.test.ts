import { describe, expect, it } from "vitest";
import { defaultTaskTemplates } from "../../data/tasks";
import type { Character } from "../../types";
import { getBackgroundNotificationTaskSummaries } from "./notificationSummary";

const characters: Character[] = [
  { id: "a", name: "모험가 A", server: "초코보", isMain: true },
];

describe("background notification summaries", () => {
  it("keeps all daily titles with the current pending titles and KST date", () => {
    expect(
      getBackgroundNotificationTaskSummaries(
        characters,
        {
          completedByCharacter: { a: { "daily-a": 1 } },
          customTaskTemplatesByCharacter: {
            a: [
              {
                id: "daily-a",
                title: "일일 A",
                category: "daily",
                resetType: "daily",
                resetRuleId: "daily-midnight",
                maxCount: 1,
                enabledByDefault: true,
                characterScoped: true,
                group: "custom",
                priority: 1,
                isDefault: false,
              },
              {
                id: "daily-b",
                title: "일일 B",
                category: "daily",
                resetType: "daily",
                resetRuleId: "daily-midnight",
                maxCount: 1,
                enabledByDefault: true,
                characterScoped: true,
                group: "custom",
                priority: 2,
                isDefault: false,
              },
            ],
          },
          disabledDefaultTaskIdsByCharacter: { a: defaultTaskTemplates.map((task) => task.id) },
        },
        new Date("2026-08-15T12:00:00.000Z"),
      ),
    ).toEqual([
      {
        characterName: "모험가 A",
        taskTitles: ["일일 B"],
        dailyTaskTitles: ["일일 A", "일일 B"],
        summaryDate: "2026-08-15",
      },
    ]);
  });

  it("accepts a precomputed summary date for date-boundary updates", () => {
    expect(
      getBackgroundNotificationTaskSummaries(
        characters,
        {
          completedByCharacter: {},
          customTaskTemplatesByCharacter: {},
          disabledDefaultTaskIdsByCharacter: { a: defaultTaskTemplates.map((task) => task.id) },
        },
        "2026-08-16",
      ),
    ).toEqual([
      {
        characterName: "모험가 A",
        taskTitles: [],
        dailyTaskTitles: [],
        summaryDate: "2026-08-16",
      },
    ]);
  });
});
