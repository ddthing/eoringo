import { differenceInCalendarDays, parseISO } from "date-fns";
import { housingConfig } from "../../data/housing";
import { addDaysToDateKey, getKstDateKey } from "../../lib/date";
import type { HousingPhaseResult } from "../../types";

const positiveModulo = (value: number, divisor: number) => ((value % divisor) + divisor) % divisor;

export const getHousingPhase = (date: Date = new Date()): HousingPhaseResult => {
  const targetDateKey = getKstDateKey(date);
  const override = housingConfig.overrides[targetDateKey];
  const cycleLength = housingConfig.entryDays + housingConfig.resultDays;
  const diff = differenceInCalendarDays(
    parseISO(targetDateKey),
    parseISO(housingConfig.seedEntryStartDate),
  );
  const cycleDay = positiveModulo(diff, cycleLength);
  const cycleStartDate = addDaysToDateKey(targetDateKey, -cycleDay);
  const entryStartDate = cycleStartDate;
  const entryEndDate = addDaysToDateKey(entryStartDate, housingConfig.entryDays - 1);
  const resultStartDate = addDaysToDateKey(entryStartDate, housingConfig.entryDays);
  const resultEndDate = addDaysToDateKey(resultStartDate, housingConfig.resultDays - 1);
  const isEntry = cycleDay < housingConfig.entryDays;
  const baseResult: HousingPhaseResult = isEntry
    ? {
        phase: "entry",
        label: "신청 기간",
        day: cycleDay + 1,
        totalDays: housingConfig.entryDays,
        cycleStartDate,
        entryStartDate,
        entryEndDate,
        resultStartDate,
        resultEndDate,
        nextPhaseDate: resultStartDate,
        nextPhaseLabel: "결과 발표 기간",
      }
    : {
        phase: "result",
        label: "결과 발표 기간",
        day: cycleDay - housingConfig.entryDays + 1,
        totalDays: housingConfig.resultDays,
        cycleStartDate,
        entryStartDate,
        entryEndDate,
        resultStartDate,
        resultEndDate,
        nextPhaseDate: addDaysToDateKey(resultEndDate, 1),
        nextPhaseLabel: "신청 기간",
      };

  return override ? { ...baseResult, ...override } : baseResult;
};
