import { describe, expect, it } from "vitest";
import { normalizeDdayState } from "../useDdayStore";

describe("D-day migration", () => {
  it("groups legacy events by character and falls back safely", () => {
    const state = normalizeDdayState({
      events: [
        { id: "a", title: "A 기념일", date: "2026-08-01", characterId: "character-a" },
        { id: "legacy", title: "기존 기념일", date: "2026-08-02" },
        { id: "invalid", title: "잘못된 날짜", date: "tomorrow" },
      ],
    });

    expect(state.eventsByCharacter["character-a"]).toHaveLength(1);
    expect(state.eventsByCharacter["default-character"]).toHaveLength(1);
  });
});
