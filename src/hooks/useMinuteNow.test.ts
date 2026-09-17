import { afterEach, describe, expect, it, vi } from "vitest";
import { createMinuteClock } from "./useMinuteNow";

afterEach(() => {
  vi.useRealTimers();
});

describe("minute clock", () => {
  it("refreshes immediately after returning to a throttled tab and cleans up", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-17T14:59:30Z"));
    const visibilitySource = Object.assign(new EventTarget(), { visibilityState: "visible" as DocumentVisibilityState });
    const clock = createMinuteClock({ visibilitySource });
    const listener = vi.fn();
    const unsubscribe = clock.subscribe(listener);
    visibilitySource.visibilityState = "hidden";
    visibilitySource.dispatchEvent(new Event("visibilitychange"));
    expect(listener).not.toHaveBeenCalled();
    vi.setSystemTime(new Date("2026-09-18T00:15:20Z"));
    visibilitySource.visibilityState = "visible";
    visibilitySource.dispatchEvent(new Event("visibilitychange"));
    expect(clock.getSnapshot()).toEqual(new Date("2026-09-18T00:15:20Z"));
    expect(listener).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(1);
    vi.advanceTimersByTime(40_000);
    expect(clock.getSnapshot()).toEqual(new Date("2026-09-18T00:16:00Z"));
    unsubscribe();
    expect(vi.getTimerCount()).toBe(0);
    visibilitySource.dispatchEvent(new Event("visibilitychange"));
    expect(listener).toHaveBeenCalledTimes(2);
  });
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
