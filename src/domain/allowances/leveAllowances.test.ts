import { describe, expect, it } from "vitest";
import {
  getCurrentLeveAccrualKey,
  normalizeLeveAllowanceSnapshot,
  setLeveAllowanceValue,
} from "./leveAllowances";

describe("leve allowance accruals", () => {
  it("changes accrual keys exactly at 09:00 and 21:00 KST", () => {
    expect(getCurrentLeveAccrualKey(new Date("2026-07-12T00:00:00.000Z"))).toBe(
      "2026-07-12T00:00:00.000Z",
    );
    expect(getCurrentLeveAccrualKey(new Date("2026-07-12T11:59:59.000Z"))).toBe(
      "2026-07-12T00:00:00.000Z",
    );
    expect(getCurrentLeveAccrualKey(new Date("2026-07-12T12:00:00.000Z"))).toBe(
      "2026-07-12T12:00:00.000Z",
    );
  });

  it("catches up missed accruals and caps at 100", () => {
    expect(
      normalizeLeveAllowanceSnapshot(
        { value: 95, lastAccrualKey: "2026-07-11T00:00:00.000Z" },
        new Date("2026-07-12T12:00:00.000Z"),
      ),
    ).toEqual({ value: 100, lastAccrualKey: "2026-07-12T12:00:00.000Z" });
  });

  it("normalizes damaged and future data without granting allowances", () => {
    expect(
      normalizeLeveAllowanceSnapshot(
        { value: -4, lastAccrualKey: "not-a-date" },
        new Date("2026-07-12T12:00:00.000Z"),
      ),
    ).toEqual({ value: 0, lastAccrualKey: "2026-07-12T12:00:00.000Z" });
    expect(setLeveAllowanceValue(120)).toBe(100);
  });
});
