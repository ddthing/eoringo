import type { AuthState } from "../../auth/authTypes";
import {
  getExistingPushSubscription,
  serializePushSubscription,
} from "../../domain/notifications/pushSubscription";
import type { PushSubscriptionUpsertInput } from "../../domain/notifications/remotePushSubscription";
import { getKstDateKey, KST_TIME_ZONE } from "../../lib/date";
import type { Character } from "../../types";
import type { NotificationState } from "../../stores/notifications/useNotificationStore";
import {
  getBackgroundNotificationTaskSummaries,
  getNotificationSourceDigest,
  type NotificationTaskSource,
} from "./notificationSummary";

type BackgroundPushRuntimeSyncOptions = {
  getAuth: () => Pick<AuthState, "mode" | "userId">;
  getNotificationState: () => Pick<
    NotificationState,
    "backgroundPushEnabled" | "dailyIncompleteTime"
  >;
  getExistingSubscription?: typeof getExistingPushSubscription;
  serializeSubscription?: typeof serializePushSubscription;
  getCharacters: () => Character[];
  getTaskSource: () => NotificationTaskSource;
  isMounted: () => boolean;
  setBackgroundPushEnabled: (enabled: boolean) => void;
  upsert: (input: PushSubscriptionUpsertInput) => Promise<void>;
  getNow?: () => Date;
};

export const syncBackgroundPushSubscription = async ({
  getAuth,
  getNotificationState,
  getExistingSubscription = getExistingPushSubscription,
  serializeSubscription = serializePushSubscription,
  getCharacters,
  getTaskSource,
  isMounted,
  setBackgroundPushEnabled,
  upsert,
  getNow = () => new Date(),
}: BackgroundPushRuntimeSyncOptions) => {
  const initialAuth = getAuth();
  const initialNotificationState = getNotificationState();

  if (
    !initialNotificationState.backgroundPushEnabled ||
    initialAuth.mode !== "permanent" ||
    !initialAuth.userId
  ) {
    return;
  }

  const subscription = await getExistingSubscription();

  if (!isMounted()) {
    return;
  }

  const currentAuth = getAuth();
  const currentNotificationState = getNotificationState();

  if (
    !currentNotificationState.backgroundPushEnabled ||
    currentAuth.mode !== "permanent" ||
    currentAuth.userId !== initialAuth.userId
  ) {
    return;
  }

  if (!subscription) {
    setBackgroundPushEnabled(false);
    return;
  }

  const serializedSubscription = serializeSubscription(subscription);

  if (!serializedSubscription) {
    setBackgroundPushEnabled(false);
    return;
  }

  const summaryDate = getKstDateKey(getNow());
  const characters = getCharacters();
  const taskSource = getTaskSource();
  const sourceDigest = await getNotificationSourceDigest(characters, taskSource);

  if (!isMounted()) {
    return;
  }

  await upsert({
    subscription: serializedSubscription,
    timezone: KST_TIME_ZONE,
    notificationTime: currentNotificationState.dailyIncompleteTime,
    deduplicationKey: initialAuth.userId,
    summary: {
      summaryDate,
      characters: getBackgroundNotificationTaskSummaries(characters, taskSource, summaryDate),
      sourceDigest,
    },
  });
};
