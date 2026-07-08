import { addDays, differenceInCalendarDays, format, parseISO } from "date-fns";
import { formatInTimeZone, fromZonedTime, toZonedTime } from "date-fns-tz";

export const KST_TIME_ZONE = "Asia/Seoul";

const koreanWeekdays = ["일요일", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일"];

export const getKstDateKey = (date: Date = new Date()) =>
  formatInTimeZone(date, KST_TIME_ZONE, "yyyy-MM-dd");

export const getKstNow = (date: Date = new Date()) => toZonedTime(date, KST_TIME_ZONE);

export const formatKoreanDate = (date: Date = new Date()) => {
  const zoned = getKstNow(date);

  return `${zoned.getMonth() + 1}월 ${zoned.getDate()}일 ${koreanWeekdays[zoned.getDay()]}`;
};

export const getKstDisplayDate = formatKoreanDate;

export const getNextKstDailyReset = (date: Date = new Date()) => {
  const zoned = getKstNow(date);
  const nextResetClock = new Date(
    zoned.getFullYear(),
    zoned.getMonth(),
    zoned.getDate() + 1,
    0,
    0,
    0,
  );

  return fromZonedTime(nextResetClock, KST_TIME_ZONE);
};

export const getTimeUntil = (target: Date, from: Date = new Date()) => {
  const totalSeconds = Math.max(0, Math.floor((target.getTime() - from.getTime()) / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return { totalSeconds, hours, minutes, seconds };
};

export const formatDurationKo = (duration: ReturnType<typeof getTimeUntil>) => {
  if (duration.totalSeconds <= 0) {
    return "곧 초기화";
  }

  return `${duration.hours}시간 ${duration.minutes}분 ${duration.seconds}초`;
};

export const getKstWeekKey = (date: Date = new Date()) => {
  const zoned = getKstNow(date);
  const weekday = zoned.getDay();
  const daysSinceTuesday = (weekday - 2 + 7) % 7;
  const weekStart = addDays(
    new Date(zoned.getFullYear(), zoned.getMonth(), zoned.getDate()),
    -daysSinceTuesday,
  );

  return format(weekStart, "yyyy-MM-dd");
};

export const getDaysFromTodayKst = (targetDateKey: string, today: Date = new Date()) => {
  const todayKey = getKstDateKey(today);
  return differenceInCalendarDays(parseISO(targetDateKey), parseISO(todayKey));
};

export const addDaysToDateKey = (dateKey: string, days: number) =>
  format(addDays(parseISO(dateKey), days), "yyyy-MM-dd");
