import { describe, expect, it } from "vitest";
import { selectCompletedAtForCharacter } from "./selectors";

describe("task selectors", () => {
  it("returns the same empty completed-at record for a character without entries", () => {
    const completedAtByCharacter = {};

    expect(selectCompletedAtForCharacter(completedAtByCharacter, "character-a")).toBe(
      selectCompletedAtForCharacter(completedAtByCharacter, "character-a"),
    );
  });

  it("returns the stored completed-at record for the selected character", () => {
    const completedAt = { "interval-task": "2026-07-14T12:00:00.000Z" };

    expect(
      selectCompletedAtForCharacter({ "character-a": completedAt }, "character-a"),
    ).toBe(completedAt);
  });
});
