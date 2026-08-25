import { describe, expect, it, vi } from "vitest";
import {
  fetchWithTimeout,
  runWithConcurrency,
  runWithCursorPagination,
  withTimeout,
} from "./asyncControl";

describe("async control boundaries", () => {
  it("keeps concurrent work within the configured limit", async () => {
    let inFlight = 0;
    let peakInFlight = 0;
    const completed: number[] = [];

    await runWithConcurrency([1, 2, 3, 4, 5], 2, async (value) => {
      inFlight += 1;
      peakInFlight = Math.max(peakInFlight, inFlight);
      await new Promise((resolve) => setTimeout(resolve, 5));
      completed.push(value);
      inFlight -= 1;
    });

    expect(peakInFlight).toBe(2);
    expect([...completed].sort((left, right) => left - right)).toEqual([1, 2, 3, 4, 5]);
  });

  it("isolates one rejected task and still completes the remaining tasks", async () => {
    const results = await runWithConcurrency(["ok-1", "fail", "ok-2"], 2, async (value) => {
      if (value === "fail") {
        throw new Error("expected_failure");
      }

      return value.toUpperCase();
    });

    expect(results).toEqual([
      { item: "ok-1", status: "fulfilled", value: "OK-1" },
      { item: "fail", status: "rejected", reason: expect.any(Error) },
      { item: "ok-2", status: "fulfilled", value: "OK-2" },
    ]);
  });

  it("rejects a stalled operation after the configured timeout", async () => {
    await expect(
      withTimeout(
        () => new Promise<void>(() => undefined),
        5,
        "push_send",
      ),
    ).rejects.toThrow("push_send_timeout");
  });

  it("aborts a stalled fetch", async () => {
    const fetchMock = vi.fn(
      (_input: string, init?: RequestInit) =>
        new Promise<Response>((_, reject) => {
          init?.signal?.addEventListener("abort", () => {
            reject(new DOMException("aborted", "AbortError"));
          });
        }),
    );
    vi.stubGlobal("fetch", fetchMock);

    try {
      await expect(fetchWithTimeout("https://example.test", {}, 5)).rejects.toMatchObject({
        name: "AbortError",
      });
      expect(fetchMock).toHaveBeenCalledOnce();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("processes cursor pages without retaining the full collection", async () => {
    const cursors: Array<string | null> = [];
    const processed: number[] = [];
    const pages = new Map<string | null, number[]>([
      [null, [1, 2]],
      ["2", [3, 4]],
      ["4", [5]],
    ]);

    const scanned = await runWithCursorPagination(
      2,
      async (cursor) => {
        cursors.push(cursor);
        return pages.get(cursor) ?? [];
      },
      (page) => String(page[page.length - 1] ?? ""),
      async (page) => {
        processed.push(...page);
      },
    );

    expect(scanned).toBe(5);
    expect(cursors).toEqual([null, "2", "4"]);
    expect(processed).toEqual([1, 2, 3, 4, 5]);
  });

  it("rejects a full page that cannot advance its cursor", async () => {
    await expect(
      runWithCursorPagination(
        2,
        async () => [1, 2],
        () => null,
        async () => undefined,
      ),
    ).rejects.toThrow("pagination_cursor_invalid");
  });
});
