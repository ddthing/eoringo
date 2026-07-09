import { getKstDateKey, getKstWeekKey } from "../../lib/date";

export const EIGHTEEN_HOUR_RESET_MS = 18 * 60 * 60 * 1000;

export const getResetKeys = (date: Date = new Date()) => ({
  dailyResetKey: getKstDateKey(date),
  weeklyResetKey: getKstWeekKey(date),
});

export const isEighteenHourResetExpired = (
  completedAt: string | undefined,
  date: Date = new Date(),
) => {
  if (!completedAt) {
    return true;
  }

  const completedAtTime = new Date(completedAt).getTime();

  if (!Number.isFinite(completedAtTime)) {
    return true;
  }

  return date.getTime() - completedAtTime >= EIGHTEEN_HOUR_RESET_MS;
};
