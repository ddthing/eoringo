import { format } from "date-fns";
import { getKstDateKey, getKstNow } from "../../lib/date";
import { getTaskCount } from "../tasks/getTaskProgress";
import type { TaskTemplate } from "../../types";

export const DEFAULT_NOTIFICATION_TIME = "21:00";

const notificationTimePattern = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

export type NotificationTaskSummary = {
  characterName: string;
  taskTitles: string[];
};

export type BackgroundNotificationTaskSummary = NotificationTaskSummary & {
  dailyTaskTitles: string[];
  summaryDate: string;
};

export type BrowserNotificationPayload = {
  title: string;
  body: string;
};

export const normalizeNotificationTime = (
  value: unknown,
  fallback = DEFAULT_NOTIFICATION_TIME,
) => (typeof value === "string" && notificationTimePattern.test(value) ? value : fallback);

export const getKstNotificationTime = (date: Date) =>
  format(getKstNow(date), "HH:mm");

export const getDailyIncompleteNotificationKey = (date: Date, notificationTime: string) =>
  `${getKstDateKey(date)}:${normalizeNotificationTime(notificationTime)}`;

export const isDailyIncompleteNotificationDue = (date: Date, notificationTime: string) =>
  getKstNotificationTime(date) === normalizeNotificationTime(notificationTime);

export const getDailyIncompleteTaskTitles = (
  tasks: TaskTemplate[],
  completedByTaskId: Record<string, boolean | number | undefined>,
) =>
  tasks
    .filter(
      (task) =>
        task.category === "daily" &&
        getTaskCount(completedByTaskId[task.id]) < task.maxCount,
    )
    .map((task) => task.title);

export const getDailyTaskTitles = (tasks: TaskTemplate[]) =>
  tasks.filter((task) => task.category === "daily").map((task) => task.title);

export const buildDailyIncompleteNotification = (
  summaries: NotificationTaskSummary[],
): BrowserNotificationPayload | null => {
  const pendingSummaries = summaries.filter((summary) => summary.taskTitles.length > 0);

  if (pendingSummaries.length === 0) {
    return null;
  }

  return {
    title: "오늘 미완료 숙제가 있어요",
    body: pendingSummaries
      .map(({ characterName, taskTitles }) => `${characterName} ${taskTitles.length}개`)
      .join(" · "),
  };
};
