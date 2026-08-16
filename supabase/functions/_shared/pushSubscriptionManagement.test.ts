import { describe, expect, it } from "vitest";
import {
  parsePushSubscriptionDeleteResult,
  parsePushSubscriptionRateLimitResult,
  parsePushSubscriptionUpsertResult,
} from "./pushSubscriptionManagement";

describe("push subscription management RPC boundaries", () => {
  it("accepts an allowed rate limit result", () => {
    expect(
      parsePushSubscriptionRateLimitResult([{ allowed: true, retry_after_seconds: 0 }]),
    ).toEqual({ allowed: true, retryAfterSeconds: 0 });
  });

  it("accepts a rejected rate limit result with a bounded retry delay", () => {
    expect(
      parsePushSubscriptionRateLimitResult([{ allowed: false, retry_after_seconds: 42 }]),
    ).toEqual({ allowed: false, retryAfterSeconds: 42 });
  });

  it("rejects malformed or ambiguous rate limit results", () => {
    for (const value of [
      [],
      [{ allowed: "yes", retry_after_seconds: 0 }],
      [{ allowed: false, retry_after_seconds: 0 }],
      [{ allowed: false, retry_after_seconds: 601 }],
      [{ allowed: true, retry_after_seconds: 0 }, { allowed: true, retry_after_seconds: 0 }],
    ]) {
      expect(parsePushSubscriptionRateLimitResult(value)).toBeNull();
    }
  });

  it("distinguishes successful, quota, and endpoint-conflict upserts", () => {
    expect(
      parsePushSubscriptionUpsertResult([
        { stored: true, quota_exceeded: false, endpoint_conflict: false },
      ]),
    ).toBe("stored");
    expect(
      parsePushSubscriptionUpsertResult([
        { stored: false, quota_exceeded: true, endpoint_conflict: false },
      ]),
    ).toBe("quota_exceeded");
    expect(
      parsePushSubscriptionUpsertResult([
        { stored: false, quota_exceeded: false, endpoint_conflict: true },
      ]),
    ).toBe("endpoint_conflict");
  });

  it("rejects ambiguous upsert results", () => {
    expect(
      parsePushSubscriptionUpsertResult([
        { stored: true, quota_exceeded: true, endpoint_conflict: false },
      ]),
    ).toBeNull();
    expect(parsePushSubscriptionUpsertResult([])).toBeNull();
  });

  it("accepts only a single boolean delete result", () => {
    expect(parsePushSubscriptionDeleteResult([{ deleted: true }])).toBe(true);
    expect(parsePushSubscriptionDeleteResult([{ deleted: false }])).toBe(false);
    expect(parsePushSubscriptionDeleteResult([{ deleted: "true" }])).toBeNull();
    expect(parsePushSubscriptionDeleteResult([])).toBeNull();
  });
});
