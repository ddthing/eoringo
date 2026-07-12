import { afterEach, describe, expect, it } from "vitest";
import { defaultTaskTemplates } from "../../data/tasks";
import { getCurrentFixedResetKeys, getResetKeys } from "../tasks/resetRules";
import { useCharacterStore } from "../../stores/useCharacterStore";
import { useDdayStore } from "../../stores/useDdayStore";
import { useHistoryStore } from "../../stores/useHistoryStore";
import { useTaskStore } from "../../stores/useTaskStore";
import { useWeeklyMemoStore } from "../../stores/useWeeklyMemoStore";
import { syncHistoryAndResets } from "./syncHistoryAndResets";

const originalCharacterState = useCharacterStore.getState();
const originalTaskState = useTaskStore.getState();
const originalMemoState = useWeeklyMemoStore.getState();
const originalDdayState = useDdayStore.getState();
const originalHistoryState = useHistoryStore.getState();

afterEach(() => {
  useCharacterStore.setState(originalCharacterState, true);
  useTaskStore.setState(originalTaskState, true);
  useWeeklyMemoStore.setState(originalMemoState, true);
  useDdayStore.setState(originalDdayState, true);
  useHistoryStore.setState(originalHistoryState, true);
});

describe("syncHistoryAndResets integration", () => {
  it("archives the previous day before clearing live daily progress", () => {
    const now = new Date("2026-07-02T03:00:00.000Z");
    const visibleTaskIds = new Set(["daily-expert", "weekly-custom-delivery"]);

    useCharacterStore.setState({
      characters: [{ id: "a", name: "모서리", server: "톤베리", isMain: true }],
      activeCharacterId: "a",
    });
    useTaskStore.setState({
      completedByCharacter: {
        a: { "daily-expert": 1, "weekly-custom-delivery": 4 },
      },
      completedAtByCharacter: {},
      customTaskTemplatesByCharacter: {},
      disabledDefaultTaskIdsByCharacter: {
        a: defaultTaskTemplates
          .filter((task) => !visibleTaskIds.has(task.id))
          .map((task) => task.id),
      },
      dailyResetKey: "2026-07-01",
      weeklyResetKey: getResetKeys(now).weeklyResetKey,
      resetKeysByRule: {
        ...getCurrentFixedResetKeys(now),
        "daily-midnight": "2026-07-01",
      },
    });
    useWeeklyMemoStore.setState({ memosByCharacter: { a: "지난 메모" } });
    useDdayStore.setState({
      eventsByCharacter: {
        a: [{ id: "event", title: "언약일", date: "2026-08-01", characterId: "a" }],
      },
    });
    useHistoryStore.setState({ entriesByDate: {} });

    syncHistoryAndResets(now);

    const archived = useHistoryStore.getState().entriesByDate["2026-07-01"].characters.a;
    expect(archived.tasks).toEqual([
      expect.objectContaining({ id: "daily-expert", count: 1, completed: true }),
      expect.objectContaining({ id: "weekly-custom-delivery", count: 4, completed: false }),
    ]);
    expect(archived.memo).toBe("지난 메모");
    expect(archived.ddayEvents).toHaveLength(1);
    expect(archived.progress.total).toEqual({ total: 2, completed: 1, percent: 50 });

    const live = useTaskStore.getState();
    expect(live.completedByCharacter.a["daily-expert"]).toBeUndefined();
    expect(live.completedByCharacter.a["weekly-custom-delivery"]).toBe(4);
    expect(live.dailyResetKey).toBe("2026-07-02");
  });
});
