import { describe, expect, it } from "vitest";
import { isSafeCaptchaToken, turnstileScriptUrl } from "./CaptchaGate";

describe("CaptchaGate security boundary", () => {
  it("loads Turnstile only from the vendor's exact HTTPS endpoint", () => {
    expect(turnstileScriptUrl).toBe(
      "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit",
    );
  });

  it("rejects empty, control-character, and oversized tokens", () => {
    expect(isSafeCaptchaToken("")).toBe(false);
    expect(isSafeCaptchaToken("token\nvalue")).toBe(false);
    expect(isSafeCaptchaToken("x".repeat(4097))).toBe(false);
    expect(isSafeCaptchaToken("XXXX.DUMMY.TOKEN.XXXX")).toBe(true);
  });
});
