import {
  buildDailyIncompleteNotification,
  getDailyIncompleteNotificationKey,
  isDailyIncompleteNotificationDue,
  type BrowserNotificationPayload,
  type NotificationTaskSummary,
} from "./notificationSchedule";

type DailyIncompleteNotificationInput = {
  now: Date;
  notificationTime: string;
  lastDeliveryKey: string | null;
  summaries: NotificationTaskSummary[];
};

export type DailyIncompleteNotificationPlan =
  | { kind: "skip"; deliveryKey: string }
  | {
      kind: "deliver";
      deliveryKey: string;
      payload: BrowserNotificationPayload;
    };

export const planDailyIncompleteNotification = ({
  now,
  notificationTime,
  lastDeliveryKey,
  summaries,
}: DailyIncompleteNotificationInput): DailyIncompleteNotificationPlan => {
  const deliveryKey = getDailyIncompleteNotificationKey(now, notificationTime);

  if (!isDailyIncompleteNotificationDue(now, notificationTime) || lastDeliveryKey === deliveryKey) {
    return { kind: "skip", deliveryKey };
  }

  const payload = buildDailyIncompleteNotification(summaries);

  return payload
    ? { kind: "deliver", deliveryKey, payload }
    : { kind: "skip", deliveryKey };
};
