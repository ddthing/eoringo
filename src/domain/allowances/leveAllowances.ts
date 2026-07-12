import { subDays } from "date-fns";
import { fromZonedTime } from "date-fns-tz";
import { getKstNow, KST_TIME_ZONE } from "../../lib/date";

export const LEVE_ALLOWANCE_MAX = 100;
export const LEVE_ALLOWANCE_INCREMENT = 3;
const ACCRUAL_INTERVAL_MS = 12 * 60 * 60 * 1000;

export type LeveAllowanceSnapshot = {
  value: number;
  lastAccrualKey: string;
};

const clampValue = (value: unknown) => {
  const numeric = typeof value === "number" && Number.isFinite(value) ? value : 0;
  return Math.min(LEVE_ALLOWANCE_MAX, Math.max(0, Math.floor(numeric)));
};

export const getCurrentLeveAccrualDate = (date: Date = new Date()) => {
  const zoned = getKstNow(date);
  const hour = zoned.getHours();
  const boundaryHour = hour >= 21 ? 21 : hour >= 9 ? 9 : 21;
  const boundaryDay = hour >= 9 ? zoned : subDays(zoned, 1);
  const localBoundary = new Date(
    boundaryDay.getFullYear(),
    boundaryDay.getMonth(),
    boundaryDay.getDate(),
    boundaryHour,
    0,
    0,
    0,
  );
  return fromZonedTime(localBoundary, KST_TIME_ZONE);
};

export const getCurrentLeveAccrualKey = (date: Date = new Date()) =>
  getCurrentLeveAccrualDate(date).toISOString();

export const normalizeLeveAllowanceSnapshot = (
  value: unknown,
  date: Date = new Date(),
): LeveAllowanceSnapshot => {
  const state = typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
  const currentBoundary = getCurrentLeveAccrualDate(date);
  const parsedLastBoundary =
    typeof state.lastAccrualKey === "string" ? new Date(state.lastAccrualKey) : currentBoundary;
  const validLastBoundary =
    Number.isFinite(parsedLastBoundary.getTime()) && parsedLastBoundary <= currentBoundary
      ? parsedLastBoundary
      : currentBoundary;
  const elapsedAccruals = Math.max(
    0,
    Math.floor((currentBoundary.getTime() - validLastBoundary.getTime()) / ACCRUAL_INTERVAL_MS),
  );

  return {
    value: clampValue(clampValue(state.value) + elapsedAccruals * LEVE_ALLOWANCE_INCREMENT),
    lastAccrualKey: currentBoundary.toISOString(),
  };
};

export const setLeveAllowanceValue = (value: number) => clampValue(value);
