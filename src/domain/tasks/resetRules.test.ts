import { describe, expect, it } from "vitest";
import { isEighteenHourResetExpired } from "./resetRules";

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
