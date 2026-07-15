import { describe, expect, it } from "vitest";
import { frontlineMaps } from "../../data/frontline";
import { getFrontlineByDateKey, getTodayFrontline } from "./getTodayFrontline";

const kstDate = (dateKey: string) => new Date(`${dateKey}T12:00:00+09:00`);

describe("frontline rotation", () => {
  it.each([
    ["2026-07-08", "워코", "워코 치테 (연습전)"],
    ["2026-07-09", "봉바", "봉인된 바위섬 (쟁탈전)"],
    ["2026-07-10", "제압", "외곽 유적지대 (제압전)"],
    ["2026-07-11", "온살", "온살 하카이르 (계절 끝 합전)"],
    ["2026-07-12", "워코", "워코 치테 (연습전)"],
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

  it("uses one consistent official display name for every map", () => {
    expect(Object.fromEntries(frontlineMaps.map((map) => [map.id, map.displayName]))).toEqual({
      "seal-rock": "봉인된 바위섬 (쟁탈전)",
      "fields-of-glory": "영광의 평원 (쇄빙전)",
      onsal: "온살 하카이르 (계절 끝 합전)",
      "worqor-chitte": "워코 치테 (연습전)",
      "borderland-ruins": "외곽 유적지대 (제압전)",
    });
  });
});
