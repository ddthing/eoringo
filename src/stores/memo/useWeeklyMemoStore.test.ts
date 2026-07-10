import { describe, expect, it } from "vitest";
import { normalizeWeeklyMemoState } from "../useWeeklyMemoStore";

describe("weekly memo migration", () => {
  it("moves a legacy memo into the migration character", () => {
    expect(normalizeWeeklyMemoState({ memo: "이번 주 목표" })).toEqual({
      memosByCharacter: { "default-character": "이번 주 목표" },
    });
  });
});
