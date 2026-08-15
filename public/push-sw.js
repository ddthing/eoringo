const notificationTag = "eoringo-daily-incomplete";

self.addEventListener("push", (event) => {
  let payload = {};

  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = {};
  }

  const title = typeof payload.title === "string" ? payload.title : "에오링고 알림";
  const body = typeof payload.body === "string" ? payload.body : "확인할 숙제가 있어요.";
  const url = typeof payload.url === "string" ? payload.url : "/tasks";

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      tag: notificationTag,
      renotify: true,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      data: { url },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  let targetUrl = new URL("/tasks", self.location.origin);

  try {
    const candidate = new URL(event.notification.data?.url || "/tasks", self.location.origin);

    if (candidate.origin === self.location.origin) {
      targetUrl = candidate;
    }
  } catch {
    // Keep the safe same-origin fallback.
  }

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      const existingClient = clients.find((client) => "focus" in client);

      if (existingClient) {
        return existingClient.focus();
      }

      return self.clients.openWindow(targetUrl.href);
    }),
  );
});
