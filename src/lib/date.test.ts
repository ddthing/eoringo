import { describe, expect, it } from "vitest";
import { getDaysFromTodayKst, getKstDateKey, getKstWeekKey } from "./date";

describe("KST date helpers", () => {
  it("creates date keys in Asia/Seoul instead of UTC", () => {
    expect(getKstDateKey(new Date("2026-07-07T16:00:00.000Z"))).toBe("2026-07-08");
  });

  it("uses Tuesday as the weekly reset key in KST", () => {
    expect(getKstWeekKey(new Date("2026-07-06T12:00:00+09:00"))).toBe("2026-06-30");
    expect(getKstWeekKey(new Date("2026-07-07T12:00:00+09:00"))).toBe("2026-07-07");
  });

  it("calculates D-day offsets from the KST date key", () => {
    expect(getDaysFromTodayKst("2026-07-20", new Date("2026-07-08T03:00:00+09:00"))).toBe(12);
  });
});
