import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { describe, expect, it, vi } from "vitest";

const source = readFileSync(new URL("../../../public/push-sw.js", import.meta.url), "utf8");
const worker = () => {
  const handlers = new Map<string, (event: unknown) => void>();
  const showNotification = vi.fn().mockResolvedValue(undefined);
  const openWindow = vi.fn().mockResolvedValue(undefined);
  runInNewContext(source, { URL, self: {
    addEventListener: (name: string, handler: (event: unknown) => void) => handlers.set(name, handler),
    location: { origin: "https://eoringo.pages.dev" },
    registration: { showNotification },
    clients: { matchAll: async () => [], openWindow },
  } });
  return { handlers, showNotification, openWindow };
};

describe("push worker input safety", () => {
  it.each([null, [], 42, "bad payload"])("handles malformed payload %j without losing the notification", (payload) => {
    const { handlers, showNotification } = worker();
    handlers.get("push")!({ data: { json: () => payload }, waitUntil: vi.fn() });
    expect(showNotification).toHaveBeenCalledWith("에오링고 알림", expect.objectContaining({ body: "확인할 숙제가 있어요." }));
  });
  it("bounds notification text", () => {
    const { handlers, showNotification } = worker();
    handlers.get("push")!({ data: { json: () => ({ title: "a".repeat(200), body: "b".repeat(2000) }) }, waitUntil: vi.fn() });
    expect(showNotification.mock.calls[0][0]).toHaveLength(120);
    expect(showNotification.mock.calls[0][1].body).toHaveLength(1000);
  });
  it.each(["https://attacker.example/", "javascript:alert(1)", "//attacker.example/"])("does not open external notification target %s", async (url) => {
    const { handlers, openWindow } = worker();
    let work: Promise<unknown> | undefined;
    handlers.get("notificationclick")!({ notification: { close: vi.fn(), data: { url } }, waitUntil: (promise: Promise<unknown>) => { work = promise; } });
    await work;
    expect(openWindow).toHaveBeenCalledWith("https://eoringo.pages.dev/tasks");
  });
});
