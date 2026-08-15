import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getBrowserNotificationPermission,
  requestBrowserNotificationPermission,
  showBrowserNotification,
} from "./browserNotification";

describe("browser notifications", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("reports unsupported when the browser has no Notification API", () => {
    vi.stubGlobal("Notification", undefined);

    expect(getBrowserNotificationPermission()).toBe("unsupported");
  });

  it("requests permission and sends a granted notification", async () => {
    const NotificationMock = Object.assign(vi.fn(), {
      permission: "default" as NotificationPermission,
      requestPermission: vi.fn().mockResolvedValue("granted" as NotificationPermission),
    });
    vi.stubGlobal("Notification", NotificationMock);

    await expect(requestBrowserNotificationPermission()).resolves.toBe("granted");

    NotificationMock.permission = "granted";
    expect(
      showBrowserNotification({
        title: "오늘 미완료 숙제가 있어요",
        body: "모험가 1개",
      }),
    ).toBe(true);
    expect(NotificationMock).toHaveBeenCalledWith(
      "오늘 미완료 숙제가 있어요",
      expect.objectContaining({ body: "모험가 1개" }),
    );
  });
});
