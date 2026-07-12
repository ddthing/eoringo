import { format, subDays } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { getKstDateKey, getKstWeekKey, KST_TIME_ZONE } from "../../lib/date";
import type { ResetRuleId, ResetType } from "../../types";

export type ResetRule =
  | { kind: "daily"; hour: number; minute: number; timeZone: typeof KST_TIME_ZONE }
  | {
      kind: "weekly";
      weekday: number;
      hour: number;
      minute: number;
      timeZone: typeof KST_TIME_ZONE;
    }
  | { kind: "interval"; durationHours: number }
  | { kind: "manual" };

export const resetRuleRegistry: Record<ResetRuleId, ResetRule> = {
  "daily-midnight": { kind: "daily", hour: 0, minute: 0, timeZone: KST_TIME_ZONE },
  "daily-0500": { kind: "daily", hour: 5, minute: 0, timeZone: KST_TIME_ZONE },
  "daily-1700": { kind: "daily", hour: 17, minute: 0, timeZone: KST_TIME_ZONE },
  "weekly-tue-1700": {
    kind: "weekly",
    weekday: 2,
    hour: 17,
    minute: 0,
    timeZone: KST_TIME_ZONE,
  },
  "weekly-fri-1700": {
    kind: "weekly",
    weekday: 5,
    hour: 17,
    minute: 0,
    timeZone: KST_TIME_ZONE,
  },
  "weekly-sat-2100": {
    kind: "weekly",
    weekday: 6,
    hour: 21,
    minute: 0,
    timeZone: KST_TIME_ZONE,
  },
  "interval-18h": { kind: "interval", durationHours: 18 },
  manual: { kind: "manual" },
};

export const isResetRuleId = (value: unknown): value is ResetRuleId =>
  typeof value === "string" && value in resetRuleRegistry;

export const isValidResetRule = (rule: ResetRule) => {
  if (rule.kind === "manual") return true;
  if (rule.kind === "interval") return Number.isFinite(rule.durationHours) && rule.durationHours > 0;

  const validClock =
    Number.isInteger(rule.hour) &&
    rule.hour >= 0 &&
    rule.hour <= 23 &&
    Number.isInteger(rule.minute) &&
    rule.minute >= 0 &&
    rule.minute <= 59;

  return rule.kind === "daily"
    ? validClock
    : validClock && Number.isInteger(rule.weekday) && rule.weekday >= 0 && rule.weekday <= 6;
};

const isBeforeClock = (date: Date, hour: number, minute: number) =>
  date.getHours() < hour || (date.getHours() === hour && date.getMinutes() < minute);

export const getResetCycleKey = (rule: ResetRule, date: Date = new Date()): string | null => {
  if (!isValidResetRule(rule) || rule.kind === "manual" || rule.kind === "interval") {
    return null;
  }

  const zoned = toZonedTime(date, rule.timeZone);

  if (rule.kind === "daily") {
    const cycleDate = isBeforeClock(zoned, rule.hour, rule.minute) ? subDays(zoned, 1) : zoned;
    return format(cycleDate, "yyyy-MM-dd");
  }

  let daysSinceReset = (zoned.getDay() - rule.weekday + 7) % 7;
  if (daysSinceReset === 0 && isBeforeClock(zoned, rule.hour, rule.minute)) {
    daysSinceReset = 7;
  }

  return format(subDays(zoned, daysSinceReset), "yyyy-MM-dd");
};

export const getResetCycleKeyById = (ruleId: ResetRuleId, date: Date = new Date()) =>
  getResetCycleKey(resetRuleRegistry[ruleId], date);

export const getCurrentFixedResetKeys = (date: Date = new Date()) =>
  Object.fromEntries(
    Object.entries(resetRuleRegistry).flatMap(([ruleId, rule]) => {
      const key = getResetCycleKey(rule, date);
      return key ? [[ruleId, key]] : [];
    }),
  ) as Partial<Record<ResetRuleId, string>>;

export const getLegacyResetRuleId = (resetType: ResetType | undefined): ResetRuleId => {
  if (resetType === "daily") return "daily-midnight";
  if (resetType === "weekly") return "weekly-tue-1700";
  if (resetType === "eighteenHours") return "interval-18h";
  return "manual";
};

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

export const isIntervalResetExpired = (
  completedAt: string | undefined,
  durationHours: number,
  date: Date = new Date(),
) => {
  if (!completedAt || !Number.isFinite(durationHours) || durationHours <= 0) return true;
  const completedAtTime = new Date(completedAt).getTime();
  return Number.isFinite(completedAtTime)
    ? date.getTime() - completedAtTime >= durationHours * 60 * 60 * 1000
    : true;
};
