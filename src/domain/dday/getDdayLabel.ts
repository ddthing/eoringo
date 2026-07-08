import { getDaysFromTodayKst } from "../../lib/date";

export const getDdayLabel = (dateKey: string, today: Date = new Date()) => {
  const days = getDaysFromTodayKst(dateKey, today);

  if (days === 0) {
    return "D-Day";
  }

  return days > 0 ? `D-${days}` : `D+${Math.abs(days)}`;
};
