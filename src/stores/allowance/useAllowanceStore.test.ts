import { afterEach, describe, expect, it, vi } from "vitest";
import { useAllowanceStore } from "./useAllowanceStore";

const originalAllowance = {
  value: useAllowanceStore.getState().value,
  lastAccrualKey: useAllowanceStore.getState().lastAccrualKey,
};

afterEach(() => {
  useAllowanceStore.setState(originalAllowance);
  vi.unstubAllGlobals();
});

describe("allowance store accruals", () => {
  it("does not publish a state update when the accrual boundary has not changed", () => {
    const currentBoundary = "2026-07-12T00:00:00.000Z";
    useAllowanceStore.setState({ value: 10, lastAccrualKey: currentBoundary });
    const before = useAllowanceStore.getState();
    const listener = vi.fn();
    const unsubscribe = useAllowanceStore.subscribe(listener);

    useAllowanceStore.getState().ensureCurrentAccruals(
      new Date("2026-07-12T01:00:00.000Z"),
    );

    expect(useAllowanceStore.getState()).toBe(before);
    expect(listener).not.toHaveBeenCalled();
    unsubscribe();
  });

  it("updates and persists once after an accrual boundary passes", () => {
    useAllowanceStore.setState({ value: 10, lastAccrualKey: "2026-07-12T00:00:00.000Z" });
    const listener = vi.fn();
    const unsubscribe = useAllowanceStore.subscribe(listener);

    useAllowanceStore.getState().ensureCurrentAccruals(
      new Date("2026-07-12T12:00:00.000Z"),
    );

    expect(useAllowanceStore.getState()).toMatchObject({
      value: 13,
      lastAccrualKey: "2026-07-12T12:00:00.000Z",
    });
    expect(listener).toHaveBeenCalledOnce();
    unsubscribe();
  });
});
