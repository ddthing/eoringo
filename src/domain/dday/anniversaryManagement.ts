import type { DdayEvent } from "../../types";
import { getDaysFromTodayKst } from "../../lib/date";

const anniversaryDatePattern = /^(\d{4})-(\d{2})-(\d{2})$/;

export const isAnniversaryDateInputAllowed = (value: string) => {
  if (!value) return true;
  const year = value.split("-", 1)[0];
  return year.length <= 4;
};

export const isValidAnniversaryDate = (value: string) => {
  const match = anniversaryDatePattern.exec(value);
  if (!match) return false;

  const [, yearText, monthText, dayText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  if (year < 1000 || year > 9999) return false;

  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day;
};

export const validateAnniversaryDraft = (title: string, date: string) => ({
  title: !title.trim() ? "기념일 이름을 입력해주세요." : "",
  date: !date
    ? "날짜를 선택해주세요."
    : !isValidAnniversaryDate(date)
      ? "연도 4자리의 올바른 날짜를 입력해주세요."
      : "",
});

export const sortAnniversaries = (events: DdayEvent[]) =>
  [...events].sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title, "ko"));

export const getUpcomingAnniversaries = (events: DdayEvent[], limit = 3, today = new Date()) =>
  [...events]
    .sort((a, b) => {
      const daysA = Math.abs(getDaysFromTodayKst(a.date, today));
      const daysB = Math.abs(getDaysFromTodayKst(b.date, today));

      return daysA === daysB
        ? a.date.localeCompare(b.date) || a.title.localeCompare(b.title, "ko")
        : daysA - daysB;
    })
    .slice(0, limit);

export const getAnniversaryEventsByDate = (events: DdayEvent[]) =>
  events.reduce<Record<string, DdayEvent[]>>((eventsByDate, event) => {
    const eventsForDate = eventsByDate[event.date] ?? [];
    eventsByDate[event.date] = [...eventsForDate, event];
    return eventsByDate;
  }, {});
