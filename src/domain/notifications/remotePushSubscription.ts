import type { SerializedPushSubscription } from "./pushSubscription";
import type { BackgroundNotificationTaskSummary } from "./notificationSchedule";
import { getSupabaseClient } from "../../lib/supabase/client";

type PushSubscriptionSummary = {
  summaryDate: string;
  characters: BackgroundNotificationTaskSummary[];
  sourceDigest: string;
};

export type RemotePushSubscriptionStatus =
  | { registered: false }
  | {
      registered: true;
      enabled: boolean;
      lastError: string | null;
      updatedAt: string;
    };

export type PushSubscriptionUpsertInput = {
  subscription: SerializedPushSubscription;
  timezone: string;
  notificationTime: string;
  summary: PushSubscriptionSummary;
  /** Local-only key used to coalesce an immediate duplicate after settings changes. */
  deduplicationKey?: string;
};

const REMOTE_PUSH_UPSERT_DEDUPLICATION_WINDOW_MS = 1_000;

type UpsertCacheEntry = {
  key: string;
  promise: Promise<void>;
  expiresAt: number;
};

let lastUpsert: UpsertCacheEntry | null = null;

const getUpsertRequestBody = (input: PushSubscriptionUpsertInput) => ({
  operation: "upsert",
  subscription: input.subscription,
  timezone: input.timezone,
  notificationTime: input.notificationTime,
  summary: input.summary,
});

const getUpsertCacheKey = (input: PushSubscriptionUpsertInput) =>
  input.deduplicationKey
    ? JSON.stringify({
        account: input.deduplicationKey,
        request: getUpsertRequestBody(input),
      })
    : null;

const invokePushSubscriptionFunction = async (body: Record<string, unknown>): Promise<unknown> => {
  const client = await getSupabaseClient();

  if (!client) {
    throw new Error("Remote sync is not enabled.");
  }

  const { data, error } = await client.functions.invoke("manage-push-subscription", { body });

  if (error) {
    throw new Error("백그라운드 알림 설정을 서버에 저장하지 못했습니다.");
  }

  return data;
};

export const upsertRemotePushSubscription = async (input: PushSubscriptionUpsertInput) => {
  const cacheKey = getUpsertCacheKey(input);
  const now = Date.now();

  if (cacheKey && lastUpsert?.key === cacheKey && lastUpsert.expiresAt > now) {
    await lastUpsert.promise;
    return;
  }

  const request = invokePushSubscriptionFunction(getUpsertRequestBody(input)).then(
    () => undefined,
  );

  if (!cacheKey) {
    await request;
    return;
  }

  const cacheEntry: UpsertCacheEntry = {
    key: cacheKey,
    promise: request,
    expiresAt: Number.POSITIVE_INFINITY,
  };
  lastUpsert = cacheEntry;

  try {
    await request;
    if (lastUpsert === cacheEntry) {
      cacheEntry.expiresAt =
        Date.now() + REMOTE_PUSH_UPSERT_DEDUPLICATION_WINDOW_MS;
    }
  } catch (error) {
    if (lastUpsert === cacheEntry) {
      lastUpsert = null;
    }
    throw error;
  }
};

export const removeRemotePushSubscription = async (endpoint: string) => {
  lastUpsert = null;
  await invokePushSubscriptionFunction({ operation: "delete", endpoint });
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const getRemotePushSubscriptionStatus = async (
  endpoint: string,
): Promise<RemotePushSubscriptionStatus> => {
  const data = await invokePushSubscriptionFunction({ operation: "status", endpoint });

  if (!isRecord(data) || data.ok !== true || typeof data.registered !== "boolean") {
    throw new Error("백그라운드 알림 서버 상태를 확인하지 못했습니다.");
  }

  if (!data.registered) {
    return { registered: false };
  }

  if (
    typeof data.enabled !== "boolean" ||
    (data.lastError !== null && typeof data.lastError !== "string") ||
    typeof data.updatedAt !== "string"
  ) {
    throw new Error("백그라운드 알림 서버 상태를 확인하지 못했습니다.");
  }

  return {
    registered: true,
    enabled: data.enabled,
    lastError: data.lastError,
    updatedAt: data.updatedAt,
  };
};
