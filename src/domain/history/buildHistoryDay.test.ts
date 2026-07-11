import { describe, expect, it } from "vitest";
import { defaultTaskTemplates } from "../../data/tasks";
import { buildHistoryDay } from "./buildHistoryDay";
import type { TaskTemplate } from "../../types";

const customTask: TaskTemplate = {
  id: "custom-weekly",
  title: "삭제될 커스텀 숙제",
  category: "weekly",
  resetType: "weekly",
  maxCount: 3,
  enabledByDefault: true,
  characterScoped: true,
  group: "custom",
  priority: 1,
  isDefault: false,
};

describe("buildHistoryDay", () => {
  it("creates a self-contained character snapshot with counts, memo, progress, and D-day", () => {
    const day = buildHistoryDay({
      date: "2026-07-01",
      capturedAt: "2026-07-02T00:00:00.000Z",
      characters: [{ id: "a", name: "모서리", server: "톤베리", isMain: true }],
      completedByCharacter: { a: { "custom-weekly": 2 } },
      customTaskTemplatesByCharacter: { a: [customTask] },
      disabledDefaultTaskIdsByCharacter: { a: defaultTaskTemplates.map((task) => task.id) },
      memosByCharacter: { a: "이번 주 목표" },
      eventsByCharacter: {
        a: [{ id: "event", title: "언약일", date: "2026-08-01", characterId: "a" }],
      },
    });

    expect(day).toMatchObject({ date: "2026-07-01", capturedAt: "2026-07-02T00:00:00.000Z" });
    expect(day.characters.a.character).toEqual({ id: "a", name: "모서리", server: "톤베리", isMain: true });
    expect(day.characters.a.tasks).toEqual([
      expect.objectContaining({ id: "custom-weekly", count: 2, maxCount: 3, completed: false }),
    ]);
    expect(day.characters.a.memo).toBe("이번 주 목표");
    expect(day.characters.a.progress.weekly).toEqual({ total: 1, completed: 0, percent: 0 });
    expect(day.characters.a.ddayEvents[0]).toMatchObject({ id: "event", title: "언약일" });
  });

  it("copies snapshot values instead of retaining mutable references", () => {
    const events = [{ id: "event", title: "기념일", date: "2026-08-01", characterId: "a" }];
    const day = buildHistoryDay({
      date: "2026-07-01",
      characters: [{ id: "a", name: "모서리", server: "톤베리", isMain: true }],
      completedByCharacter: {},
      customTaskTemplatesByCharacter: {},
      disabledDefaultTaskIdsByCharacter: {},
      memosByCharacter: {},
      eventsByCharacter: { a: events },
    });

    events[0].title = "변경됨";
    expect(day.characters.a.ddayEvents[0].title).toBe("기념일");
  });
});
