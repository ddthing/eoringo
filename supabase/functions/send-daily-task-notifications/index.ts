import webpush from "npm:web-push@3.6.7";
import {
  buildNotificationSourceFromDocuments,
  digestNotificationSource,
} from "../_shared/notificationSource.ts";
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

const fetchSubscriptions = async (config: NonNullable<ReturnType<typeof getConfig>>) => {
  const subscriptions: PushSubscriptionRow[] = [];

  for (let offset = 0; ; offset += pageSize) {
    const params = new URLSearchParams({
      select: "id,user_id,endpoint,p256dh,auth,timezone,notification_time,task_summary",
      notification_enabled: "eq.true",
      limit: String(pageSize),
      offset: String(offset),
    });
    const response = await fetch(
      `${config.supabaseUrl}/rest/v1/push_notification_subscriptions?${params.toString()}`,
      { headers: restHeaders(config.serviceRoleKey) },
    );

    if (!response.ok) {
      throw new Error("subscription_read_failed");
    }

    const page: unknown = await response.json();

    if (!Array.isArray(page)) {
      throw new Error("subscription_response_invalid");
    }

    subscriptions.push(...(page as PushSubscriptionRow[]));

    if (page.length < pageSize) {
      return subscriptions;
    }
  }
};

const updateSubscription = async (
  config: NonNullable<ReturnType<typeof getConfig>>,
  id: string,
  patch: Record<string, unknown>,
) => {
  const params = new URLSearchParams({ id: `eq.${id}` });
  const response = await fetch(
    `${config.supabaseUrl}/rest/v1/push_notification_subscriptions?${params.toString()}`,
    {
      method: "PATCH",
      headers: {
        ...restHeaders(config.serviceRoleKey),
        Prefer: "return=minimal",
      },
      body: JSON.stringify(patch),
    },
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
  const response = await fetch(
    `${config.supabaseUrl}/rest/v1/push_notification_subscriptions?${params.toString()}`,
    { method: "DELETE", headers: restHeaders(config.serviceRoleKey) },
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
  const response = await fetch(`${config.supabaseUrl}/rest/v1/rpc/${functionName}`, {
    method: "POST",
    headers: restHeaders(config.serviceRoleKey),
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`${functionName}_failed`);
  }

  const raw: unknown = await response.json();
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
  const response = await fetch(
    `${config.supabaseUrl}/rest/v1/user_documents?${params.toString()}`,
    { headers: restHeaders(config.serviceRoleKey) },
  );

  if (!response.ok) {
    throw new Error("notification_source_read_failed");
  }

  const documents: unknown = await response.json();

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

    const subscriptions = await fetchSubscriptions(config);
    const results = {
      scanned: subscriptions.length,
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

    for (const subscription of subscriptions) {
      const configuredTime = subscription.notification_time.slice(0, 5);

      if (
        !isValidTimezone(subscription.timezone) ||
        !isValidNotificationTime(configuredTime)
      ) {
        results.invalid += 1;
        await updateSubscription(config, subscription.id, {
          notification_enabled: false,
          last_error: "invalid_schedule",
        });
        continue;
      }

      let localDateTime: { dateKey: string; timeKey: string };

      try {
        localDateTime = getCurrentLocalDateTime(subscription.timezone, new Date());
      } catch {
        results.invalid += 1;
        await updateSubscription(config, subscription.id, {
          notification_enabled: false,
          last_error: "invalid_timezone",
        });
        continue;
      }

      if (!isDue(localDateTime.timeKey, configuredTime)) {
        results.skipped += 1;
        continue;
      }

      const summary = normalizePushSummary(subscription.task_summary);

      if (!summary) {
        results.invalid += 1;
        await updateSubscription(config, subscription.id, {
          notification_enabled: false,
          last_error: "invalid_task_summary",
        });
        continue;
      }

      if (!summary.sourceDigest) {
        results.skipped += 1;
        await updateSubscription(config, subscription.id, {
          last_error: "stale_task_summary",
        });
        continue;
      }

      let remoteSourceDigest: string | null;

      try {
        remoteSourceDigest = await getRemoteSourceDigest(subscription.user_id);
      } catch {
        results.failed += 1;
        await updateSubscription(config, subscription.id, {
          last_error: "source_read_failed",
        });
        continue;
      }

      if (!isPushSummaryFresh(summary, remoteSourceDigest)) {
        results.skipped += 1;
        await updateSubscription(config, subscription.id, {
          last_error: "stale_task_summary",
        });
        continue;
      }

      const result = await deliverSubscription(
        config,
        subscription,
        summary,
        localDateTime.dateKey,
        deliveryKey(localDateTime.dateKey, configuredTime),
      );

      if (result === "sent") {
        results.sent += 1;
      } else if (result === "removed") {
        results.removed += 1;
      } else if (["empty", "already_claimed"].includes(result)) {
        results.skipped += 1;
      } else if (result === "invalid") {
        results.invalid += 1;
      } else {
        results.failed += 1;
      }
    }

    return jsonResponse(200, { ok: true, ...results });
  } catch {
    return jsonResponse(502, { code: "notification_delivery_unavailable" });
  }
});
