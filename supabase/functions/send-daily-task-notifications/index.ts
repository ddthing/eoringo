import webpush from "npm:web-push@3.6.7";
import {
  fetchWithTimeout,
  runWithConcurrency,
  runWithCursorPagination,
  withTimeout,
} from "../_shared/asyncControl.ts";
import {
  buildNotificationSourceFromDocuments,
  digestNotificationSource,
} from "../_shared/notificationSource.ts";
import { isUserId } from "../_shared/imageValidation.ts";
import {
  buildPushNotificationPayload,
  isValidNotificationTime,
  isPushSummaryFresh,
  isValidTimezone,
  normalizePushSubscription,
  normalizePushSummary,
  type PushNotificationSummary,
} from "../_shared/pushNotification.ts";
import { deliverPushNotification } from "./delivery.ts";

const pageSize = 500;
const externalRequestTimeoutMs = 8_000;
const deliveryConcurrency = 8;

type PushSubscriptionRow = {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  timezone: string;
  notification_time: string;
  task_summary: unknown;
};

type SubscriptionResult = "sent" | "removed" | "failed" | "invalid" | "skipped";

const jsonResponse = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const getConfig = () => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const vapidSubject = Deno.env.get("WEB_PUSH_VAPID_SUBJECT");
  const vapidPublicKey = Deno.env.get("WEB_PUSH_VAPID_PUBLIC_KEY");
  const vapidPrivateKey = Deno.env.get("WEB_PUSH_VAPID_PRIVATE_KEY");
  const cronSecret = Deno.env.get("PUSH_CRON_SECRET");

  return supabaseUrl &&
    serviceRoleKey &&
    vapidSubject &&
    vapidPublicKey &&
    vapidPrivateKey &&
    cronSecret
    ? {
        supabaseUrl,
        serviceRoleKey,
        vapidSubject,
        vapidPublicKey,
        vapidPrivateKey,
        cronSecret,
      }
    : null;
};

const restHeaders = (serviceRoleKey: string) => ({
  apikey: serviceRoleKey,
  Authorization: `Bearer ${serviceRoleKey}`,
  "Content-Type": "application/json",
});

const cleanupExpiredAnonymousAccounts = async (
  config: NonNullable<ReturnType<typeof getConfig>>,
) => {
  const response = await fetchWithTimeout(
    `${config.supabaseUrl}/rest/v1/rpc/cleanup_expired_anonymous_accounts`,
    {
      method: "POST",
      headers: restHeaders(config.serviceRoleKey),
      body: "{}",
    },
    externalRequestTimeoutMs,
  );

  if (!response.ok) {
    throw new Error("anonymous_account_cleanup_failed");
  }

  const deletedUsers: unknown = await withTimeout(
    () => response.json(),
    externalRequestTimeoutMs,
    "anonymous_account_cleanup_body_read",
  );

  if (
    !Array.isArray(deletedUsers) ||
    deletedUsers.some(
      (row) => !isRecord(row) || !isUserId(row.user_id),
    )
  ) {
    throw new Error("anonymous_account_cleanup_response_invalid");
  }

  return deletedUsers.length;
};

const getCurrentLocalDateTime = (timezone: string, date: Date) => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const values = Object.fromEntries(
    parts
      .filter(({ type }) => type !== "literal")
      .map(({ type, value }) => [type, value]),
  );

  return {
    dateKey: `${values.year}-${values.month}-${values.day}`,
    timeKey: `${values.hour}:${values.minute}`,
  };
};

const isDue = (currentTime: string, configuredTime: string) => {
  const [currentHour, currentMinute] = currentTime.split(":").map(Number);
  const [configuredHour, configuredMinute] = configuredTime.slice(0, 5).split(":").map(Number);

  return currentHour * 60 + currentMinute >= configuredHour * 60 + configuredMinute;
};

const deliveryKey = (dateKey: string, configuredTime: string) =>
  `${dateKey}:${configuredTime.slice(0, 5)}`;

const fetchSubscriptionPage = async (
  config: NonNullable<ReturnType<typeof getConfig>>,
  afterId: string | null,
) => {
  // Processing can disable invalid subscriptions, so offset pagination could
  // shift underneath us and skip rows. Keep the cursor on the immutable id.
  const params = new URLSearchParams({
    select: "id,user_id,endpoint,p256dh,auth,timezone,notification_time,task_summary",
    notification_enabled: "eq.true",
    order: "id.asc",
    limit: String(pageSize),
  });

  if (afterId) {
    params.set("id", `gt.${afterId}`);
  }

  const response = await fetchWithTimeout(
    `${config.supabaseUrl}/rest/v1/push_notification_subscriptions?${params.toString()}`,
    { headers: restHeaders(config.serviceRoleKey) },
    externalRequestTimeoutMs,
  );

  if (!response.ok) {
    throw new Error("subscription_read_failed");
  }

  const page: unknown = await withTimeout(
    () => response.json(),
    externalRequestTimeoutMs,
    "subscription_read_body",
  );

  if (!Array.isArray(page)) {
    throw new Error("subscription_response_invalid");
  }

  return page as PushSubscriptionRow[];
};

const updateSubscription = async (
  config: NonNullable<ReturnType<typeof getConfig>>,
  id: string,
  patch: Record<string, unknown>,
) => {
  const params = new URLSearchParams({ id: `eq.${id}` });
  const response = await fetchWithTimeout(
    `${config.supabaseUrl}/rest/v1/push_notification_subscriptions?${params.toString()}`,
    {
      method: "PATCH",
      headers: {
        ...restHeaders(config.serviceRoleKey),
        Prefer: "return=minimal",
      },
      body: JSON.stringify(patch),
    },
    externalRequestTimeoutMs,
  );

  if (!response.ok) {
    throw new Error("subscription_update_failed");
  }
};

const removeSubscription = async (
  config: NonNullable<ReturnType<typeof getConfig>>,
  id: string,
) => {
  const params = new URLSearchParams({ id: `eq.${id}` });
  const response = await fetchWithTimeout(
    `${config.supabaseUrl}/rest/v1/push_notification_subscriptions?${params.toString()}`,
    { method: "DELETE", headers: restHeaders(config.serviceRoleKey) },
    externalRequestTimeoutMs,
  );

  if (!response.ok) {
    throw new Error("subscription_delete_failed");
  }
};

const invokeDeliveryRpc = async (
  config: NonNullable<ReturnType<typeof getConfig>>,
  functionName: string,
  body: Record<string, unknown>,
  resultKey: string,
) => {
  const response = await fetchWithTimeout(
    `${config.supabaseUrl}/rest/v1/rpc/${functionName}`,
    {
      method: "POST",
      headers: restHeaders(config.serviceRoleKey),
      body: JSON.stringify(body),
    },
    externalRequestTimeoutMs,
  );

  if (!response.ok) {
    throw new Error(`${functionName}_failed`);
  }

  const raw: unknown = await withTimeout(
    () => response.json(),
    externalRequestTimeoutMs,
    `${functionName}_body_read`,
  );
  const row = Array.isArray(raw) ? raw[0] : raw;

  return isRecord(row) && row[resultKey] === true;
};

const fetchRemoteNotificationSourceDigest = async (
  config: NonNullable<ReturnType<typeof getConfig>>,
  userId: string,
) => {
  const params = new URLSearchParams({
    select: "document_type,payload",
    user_id: `eq.${userId}`,
    document_type: "in.(characters,tasks)",
    deleted_at: "is.null",
  });
  const response = await fetchWithTimeout(
    `${config.supabaseUrl}/rest/v1/user_documents?${params.toString()}`,
    { headers: restHeaders(config.serviceRoleKey) },
    externalRequestTimeoutMs,
  );

  if (!response.ok) {
    throw new Error("notification_source_read_failed");
  }

  const documents: unknown = await withTimeout(
    () => response.json(),
    externalRequestTimeoutMs,
    "notification_source_body_read",
  );

  if (!Array.isArray(documents)) {
    throw new Error("notification_source_response_invalid");
  }

  const source = buildNotificationSourceFromDocuments(documents);

  return source ? digestNotificationSource(source) : null;
};

const getPushStatusCode = (error: unknown) =>
  isRecord(error) && typeof error.statusCode === "number" ? error.statusCode : null;

const deliverSubscription = async (
  config: NonNullable<ReturnType<typeof getConfig>>,
  subscriptionRow: PushSubscriptionRow,
  summary: PushNotificationSummary,
  currentDateKey: string,
  key: string,
) => {
  const subscription = normalizePushSubscription({
    endpoint: subscriptionRow.endpoint,
    expirationTime: null,
    keys: {
      p256dh: subscriptionRow.p256dh,
      auth: subscriptionRow.auth,
    },
  });

  if (!subscription) {
    await updateSubscription(config, subscriptionRow.id, {
      notification_enabled: false,
      last_error: "invalid_subscription",
    });
    return "invalid" as const;
  }

  const payload = buildPushNotificationPayload(summary, currentDateKey);

  if (!payload) {
    return "empty" as const;
  }

  const claimToken = crypto.randomUUID();

  return deliverPushNotification({
    claim: async () =>
      invokeDeliveryRpc(
        config,
        "claim_push_notification_delivery",
        {
          p_subscription_id: subscriptionRow.id,
          p_delivery_key: key,
          p_claim_token: claimToken,
        },
        "claimed",
      ),
    send: () => webpush.sendNotification(subscription, JSON.stringify(payload)),
    finalize: async () => {
      const completed = await invokeDeliveryRpc(
        config,
        "complete_push_notification_delivery",
        {
          p_subscription_id: subscriptionRow.id,
          p_delivery_key: key,
          p_claim_token: claimToken,
        },
        "completed",
      );

      if (!completed) {
        throw new Error("delivery_finalize_rejected");
      }
    },
    markFailure: async () => {
      await invokeDeliveryRpc(
        config,
        "record_failed_push_notification_delivery",
        {
          p_subscription_id: subscriptionRow.id,
          p_delivery_key: key,
          p_claim_token: claimToken,
          p_error: "push_delivery_failed",
        },
        "recorded",
      );
    },
    remove: () => removeSubscription(config, subscriptionRow.id),
    getStatusCode: getPushStatusCode,
    timeoutMs: externalRequestTimeoutMs,
  });
};

Deno.serve(async (request) => {
  if (request.method !== "POST") {
    return jsonResponse(405, { code: "method_not_allowed" });
  }

  const config = getConfig();

  if (!config) {
    return jsonResponse(503, { code: "configuration" });
  }

  if (request.headers.get("X-Cron-Secret") !== config.cronSecret) {
    return jsonResponse(401, { code: "cron_authentication_required" });
  }

  try {
    webpush.setVapidDetails(
      config.vapidSubject,
      config.vapidPublicKey,
      config.vapidPrivateKey,
    );

    const results = {
      scanned: 0,
      sent: 0,
      skipped: 0,
      removed: 0,
      failed: 0,
      invalid: 0,
    };
    const sourceDigestCache = new Map<string, Promise<string | null>>();
    const getRemoteSourceDigest = (userId: string) => {
      const existing = sourceDigestCache.get(userId);

      if (existing) {
        return existing;
      }

      const pending = fetchRemoteNotificationSourceDigest(config, userId);
      sourceDigestCache.set(userId, pending);
      return pending;
    };

    const now = new Date();
    const processSubscription = async (
      subscription: PushSubscriptionRow,
    ): Promise<SubscriptionResult> => {
      try {
        const configuredTime = subscription.notification_time.slice(0, 5);

        if (
          !isValidTimezone(subscription.timezone) ||
          !isValidNotificationTime(configuredTime)
        ) {
          await updateSubscription(config, subscription.id, {
            notification_enabled: false,
            last_error: "invalid_schedule",
          });
          return "invalid";
        }

        let localDateTime: { dateKey: string; timeKey: string };

        try {
          localDateTime = getCurrentLocalDateTime(subscription.timezone, now);
        } catch {
          await updateSubscription(config, subscription.id, {
            notification_enabled: false,
            last_error: "invalid_timezone",
          });
          return "invalid";
        }

        if (!isDue(localDateTime.timeKey, configuredTime)) {
          return "skipped";
        }

        const summary = normalizePushSummary(subscription.task_summary);

        if (!summary) {
          await updateSubscription(config, subscription.id, {
            notification_enabled: false,
            last_error: "invalid_task_summary",
          });
          return "invalid";
        }

        if (!summary.sourceDigest) {
          await updateSubscription(config, subscription.id, {
            last_error: "stale_task_summary",
          });
          return "skipped";
        }

        let remoteSourceDigest: string | null;

        try {
          remoteSourceDigest = await getRemoteSourceDigest(subscription.user_id);
        } catch {
          await updateSubscription(config, subscription.id, {
            last_error: "source_read_failed",
          });
          return "failed";
        }

        if (!isPushSummaryFresh(summary, remoteSourceDigest)) {
          await updateSubscription(config, subscription.id, {
            last_error: "stale_task_summary",
          });
          return "skipped";
        }

        const result = await deliverSubscription(
          config,
          subscription,
          summary,
          localDateTime.dateKey,
          deliveryKey(localDateTime.dateKey, configuredTime),
        );

        if (result === "sent" || result === "removed" || result === "invalid") {
          return result;
        }

        return result === "empty" || result === "already_claimed"
          ? "skipped"
          : "failed";
      } catch {
        return "failed";
      }
    };

    const recordResult = (result: SubscriptionResult) => {
      results[result] += 1;
    };

    await runWithCursorPagination(
      pageSize,
      (afterId) => fetchSubscriptionPage(config, afterId),
      (page) => page[page.length - 1]?.id ?? null,
      async (page) => {
        results.scanned += page.length;
        const processed = await runWithConcurrency(
          page,
          deliveryConcurrency,
          processSubscription,
        );

        for (const task of processed) {
          recordResult(task.status === "fulfilled" ? task.value : "failed");
        }
      },
    );

    let anonymousAccountsDeleted = 0;

    try {
      anonymousAccountsDeleted = await cleanupExpiredAnonymousAccounts(config);
    } catch {
      return jsonResponse(502, {
        code: "anonymous_account_cleanup_unavailable",
        ...results,
      });
    }

    return jsonResponse(200, {
      ok: true,
      ...results,
      anonymousAccountsDeleted,
    });
  } catch {
    return jsonResponse(502, { code: "notification_delivery_unavailable" });
  }
});
