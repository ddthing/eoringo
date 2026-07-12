import { describe, expect, it } from "vitest";
import {
  getResetCycleKeyById,
  isEighteenHourResetExpired,
  isValidResetRule,
} from "./resetRules";

describe("fixed KST reset cycles", () => {
  it("changes a 05:00 daily key exactly at the boundary", () => {
    expect(getResetCycleKeyById("daily-0500", new Date("2026-07-11T19:59:59.000Z"))).toBe(
      "2026-07-11",
    );
    expect(getResetCycleKeyById("daily-0500", new Date("2026-07-11T20:00:00.000Z"))).toBe(
      "2026-07-12",
    );
  });

  it("changes the Tuesday 17:00 weekly key exactly at the boundary", () => {
    expect(
      getResetCycleKeyById("weekly-tue-1700", new Date("2026-07-14T07:59:59.000Z")),
    ).toBe("2026-07-07");
    expect(
      getResetCycleKeyById("weekly-tue-1700", new Date("2026-07-14T08:00:00.000Z")),
    ).toBe("2026-07-14");
  });

  it("handles month and year boundaries in KST", () => {
    expect(getResetCycleKeyById("daily-1700", new Date("2026-01-01T07:59:59.000Z"))).toBe(
      "2025-12-31",
    );
    expect(getResetCycleKeyById("daily-1700", new Date("2026-01-01T08:00:00.000Z"))).toBe(
      "2026-01-01",
    );
  });

  it("rejects invalid clock, weekday, and interval rules", () => {
    expect(isValidResetRule({ kind: "daily", hour: 24, minute: 0, timeZone: "Asia/Seoul" })).toBe(false);
    expect(isValidResetRule({ kind: "weekly", weekday: 7, hour: 17, minute: 0, timeZone: "Asia/Seoul" })).toBe(false);
    expect(isValidResetRule({ kind: "interval", durationHours: 0 })).toBe(false);
  });
});

describe("eighteen hour reset", () => {
  it("expires after 18 hours from completion", () => {
    expect(
      isEighteenHourResetExpired(
        "2026-07-08T12:00:00.000Z",
        new Date("2026-07-09T06:00:00.000Z"),
      ),
    ).toBe(true);
  });

  it("does not expire before 18 hours", () => {
    expect(
      isEighteenHourResetExpired(
        "2026-07-08T12:00:00.000Z",
        new Date("2026-07-09T05:59:59.000Z"),
      ),
    ).toBe(false);
  });

  it("treats missing timestamps as expired", () => {
    expect(isEighteenHourResetExpired(undefined, new Date("2026-07-09T06:00:00.000Z"))).toBe(
      true,
    );
  });
});
