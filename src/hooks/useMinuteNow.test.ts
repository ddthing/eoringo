import { afterEach, describe, expect, it, vi } from "vitest";
import { createMinuteClock } from "./useMinuteNow";

afterEach(() => {
  vi.useRealTimers();
});

describe("minute clock", () => {
  it("uses one aligned timer while subscribers exist and stops after the last unsubscribe", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-09T12:00:30.000Z"));
    const clock = createMinuteClock();
    const first = vi.fn();
    const second = vi.fn();
    const unsubscribeFirst = clock.subscribe(first);
    const unsubscribeSecond = clock.subscribe(second);

    vi.advanceTimersByTime(30_000);

    expect(first).toHaveBeenCalledOnce();
    expect(second).toHaveBeenCalledOnce();
    expect(clock.getSnapshot()).toEqual(new Date("2026-08-09T12:01:00.000Z"));

    unsubscribeFirst();
    unsubscribeSecond();
    vi.advanceTimersByTime(60_000);

    expect(first).toHaveBeenCalledOnce();
    expect(second).toHaveBeenCalledOnce();
  });
});
