import { describe, expect, it } from "vitest";
import {
  isAnniversaryDateInputAllowed,
  isValidAnniversaryDate,
  getAnniversaryEventsByDate,
  getUpcomingAnniversaries,
  sortAnniversaries,
  validateAnniversaryDraft,
} from "./anniversaryManagement";

describe("anniversary management", () => {
  it("validates required fields", () => {
    expect(validateAnniversaryDraft("", "")).toEqual({
      title: "기념일 이름을 입력해주세요.",
      date: "날짜를 선택해주세요.",
    });
  });

  it("accepts only real dates with a four-digit year", () => {
    expect(isValidAnniversaryDate("1000-01-01")).toBe(true);
    expect(isValidAnniversaryDate("9999-12-31")).toBe(true);
    expect(isValidAnniversaryDate("2026-02-29")).toBe(false);
    expect(isValidAnniversaryDate("02026-07-13")).toBe(false);
    expect(isValidAnniversaryDate("999-07-13")).toBe(false);
  });

  it("rejects input whose year exceeds four digits", () => {
    expect(isAnniversaryDateInputAllowed("2026-07-13")).toBe(true);
    expect(isAnniversaryDateInputAllowed("02026-07-13")).toBe(false);
  });

  it("sorts by date then Korean title", () => {
    expect(sortAnniversaries([
      { id: "b", title: "하나", date: "2026-08-01" },
      { id: "a", title: "가나", date: "2026-08-01" },
      { id: "c", title: "먼저", date: "2026-07-01" },
    ]).map((event) => event.id)).toEqual(["c", "a", "b"]);
  });

  it("prioritizes anniversaries closest to today for previews", () => {
    expect(getUpcomingAnniversaries([
      { id: "past", title: "지난 기록", date: "2026-08-01" },
      { id: "soon", title: "다가오는 기록", date: "2026-08-12" },
      { id: "later", title: "나중 기록", date: "2026-08-20" },
    ], 2, new Date("2026-08-10T00:00:00+09:00")).map((event) => event.id)).toEqual([
      "soon",
      "past",
    ]);
  });

  it("groups calendar markers by date without mutating the source", () => {
    const events = [
      { id: "a", title: "첫 기록", date: "2026-08-10" },
      { id: "b", title: "두 번째 기록", date: "2026-08-10" },
      { id: "c", title: "다른 날", date: "2026-08-12" },
    ];

    expect(getAnniversaryEventsByDate(events)).toEqual({
      "2026-08-10": [events[0], events[1]],
      "2026-08-12": [events[2]],
    });
    expect(events).toEqual([
      { id: "a", title: "첫 기록", date: "2026-08-10" },
      { id: "b", title: "두 번째 기록", date: "2026-08-10" },
      { id: "c", title: "다른 날", date: "2026-08-12" },
    ]);
  });
});
