import { describe, expect, it } from "vitest";
import { getDdayLabel } from "./getDdayLabel";

describe("getDdayLabel", () => {
  const today = new Date("2026-07-08T12:00:00+09:00");

  it("formats today, future, and past dates", () => {
    expect(getDdayLabel("2026-07-08", today)).toBe("D-Day");
    expect(getDdayLabel("2026-07-20", today)).toBe("D-12");
    expect(getDdayLabel("2026-07-01", today)).toBe("D+7");
  });
});
