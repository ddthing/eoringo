import { afterEach, describe, expect, it, vi } from "vitest";
import { createBackgroundPushSyncController } from "./backgroundPushSync";

afterEach(() => {
  vi.useRealTimers();
});

describe("background push sync controller", () => {
  it("batches repeated triggers into one sync", async () => {
    vi.useFakeTimers();
    const sync = vi.fn().mockResolvedValue(undefined);
    const controller = createBackgroundPushSyncController({ sync });

    controller.schedule();
    await vi.advanceTimersByTimeAsync(200);
    controller.schedule();

    await vi.advanceTimersByTimeAsync(249);
    expect(sync).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    expect(sync).toHaveBeenCalledOnce();

    controller.dispose();
  });

  it("runs one follow-up after an in-flight sync settles", async () => {
    vi.useFakeTimers();
    let resolveFirst!: () => void;
    const firstSync = new Promise<void>((resolve) => {
      resolveFirst = resolve;
    });
    const sync = vi.fn()
      .mockImplementationOnce(() => firstSync)
      .mockResolvedValueOnce(undefined);
    const controller = createBackgroundPushSyncController({ sync });

    controller.schedule();
    await vi.advanceTimersByTimeAsync(250);
    expect(sync).toHaveBeenCalledOnce();

    controller.schedule();
    controller.schedule();
    await vi.advanceTimersByTimeAsync(250);
    expect(sync).toHaveBeenCalledOnce();

    resolveFirst();
    await vi.advanceTimersByTimeAsync(250);
    expect(sync).toHaveBeenCalledTimes(2);

    controller.dispose();
  });

  it("retries a failed sync without polling after recovery", async () => {
    vi.useFakeTimers();
    const sync = vi.fn()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce(undefined);
    const controller = createBackgroundPushSyncController({
      sync,
      retryDelayMs: 60_000,
    });

    controller.schedule();
    await vi.advanceTimersByTimeAsync(250);
    expect(sync).toHaveBeenCalledOnce();

    await vi.advanceTimersByTimeAsync(59_999);
    expect(sync).toHaveBeenCalledOnce();

    await vi.advanceTimersByTimeAsync(1_001);
    expect(sync).toHaveBeenCalledTimes(2);

    await vi.advanceTimersByTimeAsync(60 * 60 * 1_000);
    expect(sync).toHaveBeenCalledTimes(2);

    controller.dispose();
  });

  it("does not retry an in-flight failure after cancellation", async () => {
    vi.useFakeTimers();
    let rejectFirst!: (reason?: unknown) => void;
    const firstSync = new Promise<void>((_resolve, reject) => {
      rejectFirst = reject;
    });
    const sync = vi.fn().mockImplementationOnce(() => firstSync);
    const controller = createBackgroundPushSyncController({
      sync,
      retryDelayMs: 60_000,
    });

    controller.schedule();
    await vi.advanceTimersByTimeAsync(250);
    expect(sync).toHaveBeenCalledOnce();

    controller.cancel();
    rejectFirst(new Error("offline"));
    await vi.advanceTimersByTimeAsync(60_000);

    expect(sync).toHaveBeenCalledOnce();
    controller.dispose();
  });

  it("does not run a canceled or disposed trigger", async () => {
    vi.useFakeTimers();
    const sync = vi.fn().mockResolvedValue(undefined);
    const controller = createBackgroundPushSyncController({ sync });

    controller.schedule();
    controller.cancel();
    await vi.advanceTimersByTimeAsync(250);
    expect(sync).not.toHaveBeenCalled();

    controller.schedule();
    controller.dispose();
    await vi.advanceTimersByTimeAsync(250);
    expect(sync).not.toHaveBeenCalled();
  });

  it("does not poll after a successful sync", async () => {
    vi.useFakeTimers();
    const sync = vi.fn().mockResolvedValue(undefined);
    const controller = createBackgroundPushSyncController({ sync });

    controller.schedule();
    await vi.advanceTimersByTimeAsync(250);
    await vi.advanceTimersByTimeAsync(60 * 60 * 1_000);

    expect(sync).toHaveBeenCalledOnce();
    controller.dispose();
  });
});
