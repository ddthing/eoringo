import type { SerializedPushSubscription } from "./pushSubscription";
import type { BackgroundNotificationTaskSummary } from "./notificationSchedule";
import { getSupabaseClient } from "../../lib/supabase/client";

type PushSubscriptionSummary = {
  summaryDate: string;
  characters: BackgroundNotificationTaskSummary[];
};

const invokePushSubscriptionFunction = async (body: Record<string, unknown>) => {
  const client = await getSupabaseClient();

  if (!client) {
    throw new Error("Remote sync is not enabled.");
  }

  const { error } = await client.functions.invoke("manage-push-subscription", { body });

  if (error) {
    throw new Error("백그라운드 알림 설정을 서버에 저장하지 못했습니다.");
  }
};

export const upsertRemotePushSubscription = async (input: {
  subscription: SerializedPushSubscription;
  timezone: string;
  notificationTime: string;
  summary: PushSubscriptionSummary;
}) =>
  invokePushSubscriptionFunction({
    operation: "upsert",
    subscription: input.subscription,
    timezone: input.timezone,
    notificationTime: input.notificationTime,
    summary: input.summary,
  });

export const removeRemotePushSubscription = async (endpoint: string) =>
  invokePushSubscriptionFunction({ operation: "delete", endpoint });
