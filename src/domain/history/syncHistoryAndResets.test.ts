import { describe, expect, it, vi } from "vitest";
import { runHistoryRollover } from "./syncHistoryAndResets";

describe("runHistoryRollover", () => {
  it("captures the previous day before reset", () => {
    const order: string[] = [];

    runHistoryRollover({
      currentDateKey: "2026-07-02",
      previousDateKey: "2026-07-01",
      capturePreviousDay: (date) => order.push(`capture:${date}`),
      ensureCurrentResets: () => order.push("reset"),
    });

    expect(order).toEqual(["capture:2026-07-01", "reset"]);
  });

  it("does not create missing dates when several days were skipped", () => {
    const capture = vi.fn();

    runHistoryRollover({
      currentDateKey: "2026-07-05",
      previousDateKey: "2026-07-01",
      capturePreviousDay: capture,
      ensureCurrentResets: vi.fn(),
    });

    expect(capture).toHaveBeenCalledOnce();
    expect(capture).toHaveBeenCalledWith("2026-07-01");
  });

  it("does not reset when history capture fails", () => {
    const reset = vi.fn();

    expect(() =>
      runHistoryRollover({
        currentDateKey: "2026-07-02",
        previousDateKey: "2026-07-01",
        capturePreviousDay: () => {
          throw new Error("quota exceeded");
        },
        ensureCurrentResets: reset,
      }),
    ).toThrow("quota exceeded");
    expect(reset).not.toHaveBeenCalled();
  });

  it("only runs reset when the date has not changed", () => {
    const capture = vi.fn();
    const reset = vi.fn();

    runHistoryRollover({
      currentDateKey: "2026-07-01",
      previousDateKey: "2026-07-01",
      capturePreviousDay: capture,
      ensureCurrentResets: reset,
    });

    expect(capture).not.toHaveBeenCalled();
    expect(reset).toHaveBeenCalledOnce();
  });
});
