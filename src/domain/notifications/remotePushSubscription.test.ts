import { beforeEach, describe, expect, it, vi } from "vitest";
import { getSupabaseClient } from "../../lib/supabase/client";
import {
  getRemotePushSubscriptionStatus,
  removeRemotePushSubscription,
  upsertRemotePushSubscription,
} from "./remotePushSubscription";

vi.mock("../../lib/supabase/client", () => ({
  getSupabaseClient: vi.fn(),
}));

const getClientMock = vi.mocked(getSupabaseClient);

const subscription = {
  endpoint: "https://push.example.test/send/abc",
  expirationTime: null,
  keys: {
    p256dh: "BAbcdefghijklmnopABCDEFGHIJKLMNOPQRSTUVWX",
    auth: "abcdefghijklmnop",
  },
};

describe("remote push subscription transport", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sends the validated upsert payload to the Edge Function", async () => {
    const invoke = vi.fn().mockResolvedValue({ error: null });
    getClientMock.mockResolvedValue({ functions: { invoke } } as never);

    await upsertRemotePushSubscription({
      subscription,
      timezone: "Asia/Seoul",
      notificationTime: "21:00",
      summary: {
        summaryDate: "2026-08-15",
        characters: [],
        sourceDigest: "a".repeat(64),
      },
    });

    expect(invoke).toHaveBeenCalledWith("manage-push-subscription", {
      body: {
        operation: "upsert",
        subscription,
        timezone: "Asia/Seoul",
        notificationTime: "21:00",
        summary: {
          summaryDate: "2026-08-15",
          characters: [],
          sourceDigest: "a".repeat(64),
        },
      },
    });
  });

  it("sends a delete request for the current endpoint", async () => {
    const invoke = vi.fn().mockResolvedValue({ error: null });
    getClientMock.mockResolvedValue({ functions: { invoke } } as never);

    await removeRemotePushSubscription(subscription.endpoint);

    expect(invoke).toHaveBeenCalledWith("manage-push-subscription", {
      body: { operation: "delete", endpoint: subscription.endpoint },
    });
  });

  it("does not hide a failed remote operation as success", async () => {
    const invoke = vi.fn().mockResolvedValue({ error: new Error("failed") });
    getClientMock.mockResolvedValue({ functions: { invoke } } as never);

    await expect(removeRemotePushSubscription(subscription.endpoint)).rejects.toThrow(
      "백그라운드 알림 설정을 서버에 저장하지 못했습니다.",
    );
  });

  it("reads server delivery state without returning subscription keys", async () => {
    const invoke = vi.fn().mockResolvedValue({
      data: {
        ok: true,
        registered: true,
        enabled: true,
        lastError: "stale_task_summary",
        updatedAt: "2026-08-16T05:00:00.000Z",
      },
      error: null,
    });
    getClientMock.mockResolvedValue({ functions: { invoke } } as never);

    await expect(getRemotePushSubscriptionStatus(subscription.endpoint)).resolves.toEqual({
      registered: true,
      enabled: true,
      lastError: "stale_task_summary",
      updatedAt: "2026-08-16T05:00:00.000Z",
    });

    expect(invoke).toHaveBeenCalledWith("manage-push-subscription", {
      body: { operation: "status", endpoint: subscription.endpoint },
    });
  });

  it("rejects an untrusted server status payload", async () => {
    const invoke = vi.fn().mockResolvedValue({
      data: { ok: true, registered: true, enabled: "yes" },
      error: null,
    });
    getClientMock.mockResolvedValue({ functions: { invoke } } as never);

    await expect(getRemotePushSubscriptionStatus(subscription.endpoint)).rejects.toThrow(
      "백그라운드 알림 서버 상태를 확인하지 못했습니다.",
    );
  });
});
