import { describe, expect, it } from "vitest";
import { getFrontlineByDateKey, getTodayFrontline } from "./getTodayFrontline";

const kstDate = (dateKey: string) => new Date(`${dateKey}T12:00:00+09:00`);

describe("frontline rotation", () => {
  it.each([
    ["2026-07-08", "워코", "워코 치테"],
    ["2026-07-09", "봉바", "봉인된 바위섬"],
    ["2026-07-10", "제압", "외곽 유적지대(제압전)"],
    ["2026-07-11", "온살", "온살 하카이르"],
    ["2026-07-12", "워코", "워코 치테"],
  ])("%s returns %s", (dateKey, shortName, displayName) => {
    expect(getFrontlineByDateKey(dateKey)).toMatchObject({
      shortName,
      displayName,
    });
    expect(getTodayFrontline(kstDate(dateKey))).toMatchObject({
      shortName,
      displayName,
    });
  });
});
