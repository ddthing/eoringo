import { getKstDateKey, getKstWeekKey } from "../../lib/date";

export const getResetKeys = (date: Date = new Date()) => ({
  dailyResetKey: getKstDateKey(date),
  weeklyResetKey: getKstWeekKey(date),
});
