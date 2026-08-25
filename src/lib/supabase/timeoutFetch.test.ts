import { afterEach, describe, expect, it, vi } from "vitest";
import { createTimeoutFetch } from "./timeoutFetch";

describe("createTimeoutFetch", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("aborts a stalled request when the timeout elapses", async () => {
    vi.useFakeTimers();
    let requestSignal: AbortSignal | null | undefined;
    const fetchImpl = vi.fn(
      (_input: RequestInfo | URL, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          requestSignal = init?.signal;
          init?.signal?.addEventListener(
            "abort",
            () => reject(init.signal?.reason),
            { once: true },
          );
        }),
    );

    const request = createTimeoutFetch(fetchImpl, 25)("/slow");
    const rejection = expect(request).rejects.toMatchObject({
      name: "TimeoutError",
    });

    await vi.advanceTimersByTimeAsync(25);
    await rejection;

    expect(requestSignal?.aborted).toBe(true);
  });

  it("propagates a caller abort reason to the underlying request", async () => {
    const callerController = new AbortController();
    const callerReason = new Error("navigation cancelled");
    let requestSignal: AbortSignal | null | undefined;
    const fetchImpl = vi.fn(
      (_input: RequestInfo | URL, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          requestSignal = init?.signal;
          init?.signal?.addEventListener(
            "abort",
            () => reject(init.signal?.reason),
            { once: true },
          );
        }),
    );

    const request = createTimeoutFetch(fetchImpl, 1_000)("/cancel", {
      signal: callerController.signal,
    });
    callerController.abort(callerReason);

    await expect(request).rejects.toBe(callerReason);
    expect(requestSignal?.aborted).toBe(true);
  });

  it("clears the timeout after a successful request", async () => {
    vi.useFakeTimers();
    let requestSignal: AbortSignal | null | undefined;
    const fetchImpl = vi.fn(
      async (_input: RequestInfo | URL, init?: RequestInit) => {
        requestSignal = init?.signal;
        return {} as Response;
      },
    );

    await expect(createTimeoutFetch(fetchImpl, 25)("/fast")).resolves.toEqual(
      {},
    );
    await vi.advanceTimersByTimeAsync(25);

    expect(requestSignal?.aborted).toBe(false);
  });
});
