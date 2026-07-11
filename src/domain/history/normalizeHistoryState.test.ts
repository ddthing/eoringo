import { describe, expect, it } from "vitest";
import { normalizeHistoryState } from "./normalizeHistoryState";

describe("normalizeHistoryState", () => {
  it("drops malformed dates and normalizes nested history data", () => {
    const state = normalizeHistoryState({
      entriesByDate: {
        invalid: { characters: {} },
        "2026-07-01": {
          capturedAt: 123,
          characters: {
            a: {
              character: { name: " 모서리 ", server: "톤베리", isMain: true },
              tasks: [
                { id: "task", title: " 숙제 ", category: "daily", group: "invalid", resetType: "daily", maxCount: 2, count: 9 },
                { title: "ID 없음" },
              ],
              memo: 99,
              progress: { total: { total: 999 } },
              ddayEvents: [
                { id: "event", title: "기념일", date: "2026-08-01" },
                { id: "bad", title: "잘못됨", date: "tomorrow" },
              ],
            },
          },
        },
      },
    });

    expect(state.entriesByDate.invalid).toBeUndefined();
    expect(state.entriesByDate["2026-07-01"].capturedAt).toBe("2026-07-01T00:00:00.000Z");
    expect(state.entriesByDate["2026-07-01"].characters.a).toMatchObject({
      character: { id: "a", name: "모서리", server: "톤베리", isMain: true },
      memo: "",
      tasks: [{ id: "task", title: "숙제", group: "custom", maxCount: 2, count: 2, completed: true }],
      progress: { daily: { total: 1, completed: 1, percent: 100 } },
      ddayEvents: [{ id: "event", title: "기념일", date: "2026-08-01", characterId: "a" }],
    });
  });

  it("migrates missing history to an empty collection", () => {
    expect(normalizeHistoryState(undefined)).toEqual({ entriesByDate: {} });
  });
});
