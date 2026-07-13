import { describe, expect, it } from "vitest";
import {
  isAnniversaryDateInputAllowed,
  isValidAnniversaryDate,
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
});
