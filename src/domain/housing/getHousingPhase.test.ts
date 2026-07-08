import { describe, expect, it } from "vitest";
import { getHousingPhase } from "./getHousingPhase";

const kstDate = (dateKey: string) => new Date(`${dateKey}T12:00:00+09:00`);

describe("getHousingPhase", () => {
  it.each([
    ["2026-07-08", "result", "결과 발표 기간", 1, 4, "2026-07-03", "2026-07-07", "2026-07-08", "2026-07-11", "2026-07-12", "신청 기간"],
    ["2026-07-09", "result", "결과 발표 기간", 2, 4, "2026-07-03", "2026-07-07", "2026-07-08", "2026-07-11", "2026-07-12", "신청 기간"],
    ["2026-07-10", "result", "결과 발표 기간", 3, 4, "2026-07-03", "2026-07-07", "2026-07-08", "2026-07-11", "2026-07-12", "신청 기간"],
    ["2026-07-11", "result", "결과 발표 기간", 4, 4, "2026-07-03", "2026-07-07", "2026-07-08", "2026-07-11", "2026-07-12", "신청 기간"],
    ["2026-07-12", "entry", "신청 기간", 1, 5, "2026-07-12", "2026-07-16", "2026-07-17", "2026-07-20", "2026-07-17", "결과 발표 기간"],
  ])(
    "%s housing phase",
    (
      dateKey,
      phase,
      label,
      day,
      totalDays,
      entryStartDate,
      entryEndDate,
      resultStartDate,
      resultEndDate,
      nextPhaseDate,
      nextPhaseLabel,
    ) => {
      expect(getHousingPhase(kstDate(dateKey))).toMatchObject({
        phase,
        label,
        day,
        totalDays,
        entryStartDate,
        entryEndDate,
        resultStartDate,
        resultEndDate,
        nextPhaseDate,
        nextPhaseLabel,
      });
    },
  );
});
