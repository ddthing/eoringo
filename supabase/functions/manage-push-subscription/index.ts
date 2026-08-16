import { isAllowedOrigin, resolveAllowedOrigins } from "../_shared/cors.ts";
import { isUserId } from "../_shared/imageValidation.ts";
import {
  isAllowedPushEndpoint,
  isValidNotificationTime,
  isValidTimezone,
  normalizePushSubscription,
  normalizePushSummary,
} from "../_shared/pushNotification.ts";
import {
  parsePushSubscriptionDeleteResult,
  parsePushSubscriptionRateLimitResult,
  parsePushSubscriptionUpsertResult,
} from "../_shared/pushSubscriptionManagement.ts";

const maxRequestBytes = 128 * 1024;
const maxPushSubscriptionsPerUser = 5;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const hasExactKeys = (value: Record<string, unknown>, keys: string[]) => {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();

  return actual.length === expected.length && actual.every((key, index) => key === expected[index]);
};

const jsonResponse = (
  status: number,
  body: unknown,
  origin: string | null,
  extraHeaders: Record<string, string> = {},
) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      ...extraHeaders,
      ...(origin
        ? {
            "Access-Control-Allow-Origin": origin,
            Vary: "Origin",
          }
        : {}),
    },
  });

const getConfig = () => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  return supabaseUrl && anonKey && serviceRoleKey
    ? { supabaseUrl, anonKey, serviceRoleKey }
    : null;
};

const getPermanentUser = async (
  supabaseUrl: string,
  anonKey: string,
  authorization: string,
) => {
  const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { apikey: anonKey, Authorization: authorization },
  });

  if (!response.ok) {
    return null;
  }

  const user: unknown = await response.json();

  return isRecord(user) && isUserId(user.id) && user.is_anonymous !== true
    ? { id: user.id }
    : null;
};

const restHeaders = (serviceRoleKey: string) => ({
  apikey: serviceRoleKey,
  Authorization: `Bearer ${serviceRoleKey}`,
  "Content-Type": "application/json",
});

const invokeServiceRpc = async (
  config: NonNullable<ReturnType<typeof getConfig>>,
  functionName: string,
  body: Record<string, unknown>,
) => {
  const response = await fetch(`${config.supabaseUrl}/rest/v1/rpc/${functionName}`, {
    method: "POST",
    headers: restHeaders(config.serviceRoleKey),
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error("service_rpc_failed");
  }

  return response.json();
};

const consumePushSubscriptionRateLimit = async (
  config: NonNullable<ReturnType<typeof getConfig>>,
  userId: string,
) => {
  const result = parsePushSubscriptionRateLimitResult(
    await invokeServiceRpc(config, "consume_push_subscription_rate_limit", {
      p_user_id: userId,
    }),
  );

  if (!result) {
    throw new Error("rate_limit_response_invalid");
  }

  return result;
};

const upsertPushSubscription = async (
  config: NonNullable<ReturnType<typeof getConfig>>,
  body: {
    userId: string;
    endpoint: string;
    p256dh: string;
    auth: string;
    timezone: string;
    notificationTime: string;
    summary: unknown;
  },
) => {
  const result = parsePushSubscriptionUpsertResult(
    await invokeServiceRpc(config, "upsert_push_notification_subscription", {
      p_user_id: body.userId,
      p_endpoint: body.endpoint,
      p_p256dh: body.p256dh,
      p_auth: body.auth,
      p_timezone: body.timezone,
      p_notification_time: body.notificationTime,
      p_task_summary: body.summary,
    }),
  );

  if (!result) {
    throw new Error("subscription_response_invalid");
  }

  return result;
};

const deletePushSubscription = async (
  config: NonNullable<ReturnType<typeof getConfig>>,
  userId: string,
  endpoint: string,
) => {
  const result = parsePushSubscriptionDeleteResult(
    await invokeServiceRpc(config, "delete_push_notification_subscription", {
      p_user_id: userId,
      p_endpoint: endpoint,
    }),
  );

  if (result === null) {
    throw new Error("subscription_response_invalid");
  }

  return result;
};

Deno.serve(async (request) => {
  const origin = request.headers.get("Origin");
  const allowedOrigins = resolveAllowedOrigins(
    Deno.env.get("ALLOWED_ORIGINS") ?? "",
    Deno.env.get("ALLOW_LOCAL_ORIGINS") === "true",
  );

  if (!isAllowedOrigin(origin, allowedOrigins)) {
    return jsonResponse(403, { code: "origin_rejected" }, null);
  }

  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": origin ?? "",
        "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Max-Age": "600",
        Vary: "Origin",
      },
    });
  }

  if (request.method !== "POST") {
    return jsonResponse(405, { code: "method_not_allowed" }, origin);
  }

  const authorization = request.headers.get("Authorization") ?? "";

  if (!/^Bearer [A-Za-z0-9._~-]{20,4096}$/.test(authorization)) {
    return jsonResponse(401, { code: "authentication_required" }, origin);
  }

  const config = getConfig();

  if (!config) {
    return jsonResponse(503, { code: "configuration" }, origin);
  }

  let user: { id: string } | null;

  try {
    user = await getPermanentUser(config.supabaseUrl, config.anonKey, authorization);
  } catch {
    return jsonResponse(503, { code: "authentication_unavailable" }, origin);
  }

  if (!user) {
    return jsonResponse(403, { code: "permanent_account_required" }, origin);
  }

  let rateLimit: Awaited<ReturnType<typeof consumePushSubscriptionRateLimit>>;

  try {
    rateLimit = await consumePushSubscriptionRateLimit(config, user.id);
  } catch {
    return jsonResponse(503, { code: "rate_limit_unavailable" }, origin);
  }

  if (!rateLimit.allowed) {
    return jsonResponse(
      429,
      {
        code: "rate_limited",
        retryAfterSeconds: rateLimit.retryAfterSeconds,
      },
      origin,
      { "Retry-After": String(rateLimit.retryAfterSeconds) },
    );
  }

  const declaredLength = Number(request.headers.get("Content-Length") ?? 0);

  if (declaredLength > maxRequestBytes) {
    return jsonResponse(413, { code: "payload_too_large" }, origin);
  }

  const rawBody = await request.text();

  if (new TextEncoder().encode(rawBody).byteLength > maxRequestBytes) {
    return jsonResponse(413, { code: "payload_too_large" }, origin);
  }

  let body: unknown;

  try {
    body = JSON.parse(rawBody);
  } catch {
    return jsonResponse(400, { code: "invalid_payload" }, origin);
  }

  if (!isRecord(body) || typeof body.operation !== "string") {
    return jsonResponse(400, { code: "invalid_payload" }, origin);
  }

  if (body.operation === "upsert") {
    if (
      !hasExactKeys(body, ["operation", "subscription", "timezone", "notificationTime", "summary"])
    ) {
      return jsonResponse(400, { code: "invalid_payload" }, origin);
    }

    const subscription = normalizePushSubscription(body.subscription);
    const summary = normalizePushSummary(body.summary);

    if (
      !subscription ||
      !isValidTimezone(body.timezone) ||
      !isValidNotificationTime(body.notificationTime) ||
      !summary
    ) {
      return jsonResponse(400, { code: "invalid_payload" }, origin);
    }

    let result: Awaited<ReturnType<typeof upsertPushSubscription>>;

    try {
      result = await upsertPushSubscription(config, {
        userId: user.id,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        timezone: body.timezone,
        notificationTime: body.notificationTime,
        summary,
      });
    } catch {
      return jsonResponse(503, { code: "storage_unavailable" }, origin);
    }

    if (result === "quota_exceeded") {
      return jsonResponse(
        409,
        {
          code: "subscription_limit_reached",
          maxSubscriptions: maxPushSubscriptionsPerUser,
        },
        origin,
      );
    }

    if (result === "endpoint_conflict") {
      return jsonResponse(409, { code: "subscription_endpoint_conflict" }, origin);
    }

    return jsonResponse(200, { ok: true }, origin);
  }

  if (body.operation === "status") {
    if (!hasExactKeys(body, ["operation", "endpoint"]) || typeof body.endpoint !== "string") {
      return jsonResponse(400, { code: "invalid_payload" }, origin);
    }

    if (!isAllowedPushEndpoint(body.endpoint)) {
      return jsonResponse(400, { code: "invalid_payload" }, origin);
    }

    const params = new URLSearchParams({
      user_id: `eq.${user.id}`,
      endpoint: `eq.${body.endpoint}`,
      select: "notification_enabled,last_error,updated_at",
      limit: "1",
    });

    let response: Response;

    try {
      response = await fetch(
        `${config.supabaseUrl}/rest/v1/push_notification_subscriptions?${params.toString()}`,
        { headers: restHeaders(config.serviceRoleKey) },
      );
    } catch {
      return jsonResponse(503, { code: "storage_unavailable" }, origin);
    }

    if (!response.ok) {
      return jsonResponse(502, { code: "storage_rejected" }, origin);
    }

    const rows: unknown = await response.json();

    if (!Array.isArray(rows)) {
      return jsonResponse(502, { code: "storage_response_invalid" }, origin);
    }

    const row = rows[0];

    if (row === undefined) {
      return jsonResponse(200, { ok: true, registered: false }, origin);
    }

    if (
      !isRecord(row) ||
      typeof row.notification_enabled !== "boolean" ||
      (row.last_error !== null && typeof row.last_error !== "string") ||
      typeof row.updated_at !== "string"
    ) {
      return jsonResponse(502, { code: "storage_response_invalid" }, origin);
    }

    return jsonResponse(
      200,
      {
        ok: true,
        registered: true,
        enabled: row.notification_enabled,
        lastError: row.last_error,
        updatedAt: row.updated_at,
      },
      origin,
    );
  }

  if (body.operation === "delete") {
    if (!hasExactKeys(body, ["operation", "endpoint"]) || typeof body.endpoint !== "string") {
      return jsonResponse(400, { code: "invalid_payload" }, origin);
    }

    if (!isAllowedPushEndpoint(body.endpoint)) {
      return jsonResponse(400, { code: "invalid_payload" }, origin);
    }

    let deleted: boolean;

    try {
      deleted = await deletePushSubscription(config, user.id, body.endpoint);
    } catch {
      return jsonResponse(503, { code: "storage_unavailable" }, origin);
    }

    return jsonResponse(200, { ok: true, deleted }, origin);
  }

  return jsonResponse(400, { code: "invalid_operation" }, origin);
});
