import { describe, expect, it, vi } from "vitest";
import { isSafeCaptchaToken, loadTurnstile, turnstileOnloadCallbackName, turnstileScriptUrl } from "./CaptchaGate";

describe("CaptchaGate security boundary", () => {
  it("loads Turnstile only from the vendor's exact HTTPS endpoint", () => {
    expect(turnstileScriptUrl).toBe(
      "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=__eoringoTurnstileOnload",
    );
  });

  it("uses the explicit onload callback and retries after a script failure", async () => {
    type FakeScript = {
      src: string;
      async: boolean;
      defer: boolean;
      referrerPolicy: string;
      handlers: Record<string, () => void>;
      addEventListener: (type: string, handler: () => void) => void;
      removeEventListener: (type: string, handler: () => void) => void;
      remove: () => void;
    };

    const scripts: FakeScript[] = [];
    const documentMock = {
      querySelector: () => null,
      createElement: () => {
        const script: FakeScript = {
          src: "",
          async: false,
          defer: false,
          referrerPolicy: "",
          handlers: {},
          addEventListener(type, handler) {
            script.handlers[type] = handler;
          },
          removeEventListener: () => undefined,
          remove: () => undefined,
        };
        scripts.push(script);
        return script;
      },
      head: { append: () => undefined },
    };
    const windowMock: Record<string, unknown> = {};
    vi.stubGlobal("document", documentMock);
    vi.stubGlobal("window", windowMock);

    const firstLoad = loadTurnstile();
    expect(scripts[0]?.src).toBe(turnstileScriptUrl);
    expect(windowMock[turnstileOnloadCallbackName]).toEqual(expect.any(Function));
    scripts[0]?.handlers.error?.();
    await expect(firstLoad).rejects.toThrow("Turnstile script failed to load.");

    const secondLoad = loadTurnstile();
    expect(scripts).toHaveLength(2);
    const api = { render: vi.fn(), remove: vi.fn() };
    windowMock.turnstile = api;
    (windowMock[turnstileOnloadCallbackName] as () => void)();
    await expect(secondLoad).resolves.toBe(api);
    expect(api).not.toHaveProperty("ready");
    vi.unstubAllGlobals();
  });

  it("rejects empty, control-character, and oversized tokens", () => {
    expect(isSafeCaptchaToken("")).toBe(false);
    expect(isSafeCaptchaToken("token\nvalue")).toBe(false);
    expect(isSafeCaptchaToken("x".repeat(4097))).toBe(false);
    expect(isSafeCaptchaToken("XXXX.DUMMY.TOKEN.XXXX")).toBe(true);
  });
});
