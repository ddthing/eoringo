type RecordValue = Record<string, unknown>;

const isRecord = (value: unknown): value is RecordValue =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export type PushSubscriptionRateLimitResult = {
  allowed: boolean;
  retryAfterSeconds: number;
};

export const parsePushSubscriptionRateLimitResult = (
  value: unknown,
): PushSubscriptionRateLimitResult | null => {
  if (!Array.isArray(value) || value.length !== 1 || !isRecord(value[0])) {
    return null;
  }

  const allowed = value[0].allowed;
  const retryAfterSeconds = value[0].retry_after_seconds;

  if (
    typeof allowed !== "boolean" ||
    typeof retryAfterSeconds !== "number" ||
    !Number.isInteger(retryAfterSeconds) ||
    retryAfterSeconds < 0 ||
    retryAfterSeconds > 600 ||
    (!allowed && retryAfterSeconds < 1)
  ) {
    return null;
  }

  return { allowed, retryAfterSeconds };
};

export type PushSubscriptionUpsertResult =
  | "stored"
  | "quota_exceeded"
  | "endpoint_conflict";

export const parsePushSubscriptionUpsertResult = (
  value: unknown,
): PushSubscriptionUpsertResult | null => {
  if (!Array.isArray(value) || value.length !== 1 || !isRecord(value[0])) {
    return null;
  }

  const stored = value[0].stored;
  const quotaExceeded = value[0].quota_exceeded;
  const endpointConflict = value[0].endpoint_conflict;

  if (
    typeof stored !== "boolean" ||
    typeof quotaExceeded !== "boolean" ||
    typeof endpointConflict !== "boolean" ||
    [stored, quotaExceeded, endpointConflict].filter(Boolean).length !== 1
  ) {
    return null;
  }

  if (stored) {
    return "stored";
  }

  if (quotaExceeded) {
    return "quota_exceeded";
  }

  return "endpoint_conflict";
};

export const parsePushSubscriptionDeleteResult = (value: unknown): boolean | null => {
  if (!Array.isArray(value) || value.length !== 1 || !isRecord(value[0])) {
    return null;
  }

  return typeof value[0].deleted === "boolean" ? value[0].deleted : null;
};
