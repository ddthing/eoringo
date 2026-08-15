import type { BrowserNotificationPayload } from "./notificationSchedule";

export type BrowserNotificationPermission = NotificationPermission | "unsupported";

const getNotificationApi = (): typeof Notification | undefined =>
  typeof globalThis !== "undefined" && typeof globalThis.Notification === "function"
    ? globalThis.Notification
    : undefined;

export const getBrowserNotificationPermission = (): BrowserNotificationPermission =>
  getNotificationApi()?.permission ?? "unsupported";

export const requestBrowserNotificationPermission = async (): Promise<BrowserNotificationPermission> => {
  const notificationApi = getNotificationApi();

  if (!notificationApi) {
    return "unsupported";
  }

  try {
    return await notificationApi.requestPermission();
  } catch {
    return notificationApi.permission;
  }
};

export const showBrowserNotification = (payload: BrowserNotificationPayload) => {
  const notificationApi = getNotificationApi();

  if (!notificationApi || notificationApi.permission !== "granted") {
    return false;
  }

  try {
    new notificationApi(payload.title, {
      body: payload.body,
      tag: "ff14-daily-board/daily-incomplete",
    });
    return true;
  } catch {
    return false;
  }
};
