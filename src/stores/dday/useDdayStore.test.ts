import { describe, expect, it } from "vitest";
import { normalizeDdayState, updateDdayEvents } from "../useDdayStore";

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

describe("D-day editing", () => {
  it("preserves identity and character while re-sorting the edited event", () => {
    const events = [
      { id: "later", title: "나중", date: "2026-09-01", characterId: "character-a" },
      { id: "target", title: "기존", date: "2026-08-01", characterId: "character-a" },
    ];

    const updated = updateDdayEvents(events, "target", {
      title: "수정됨",
      date: "2026-10-01",
    });

    expect(updated.map((event) => event.id)).toEqual(["later", "target"]);
    expect(updated[1]).toEqual({
      id: "target",
      title: "수정됨",
      date: "2026-10-01",
      characterId: "character-a",
    });
  });

  it("keeps the original collection when the event does not exist", () => {
    const events = [
      { id: "event", title: "기념일", date: "2026-08-01", characterId: "character-a" },
    ];

    expect(updateDdayEvents(events, "missing", { title: "변경", date: "2026-08-02" })).toBe(
      events,
    );
  });
});
