import { describe, expect, it } from "vitest";
import { stripOAuthCallbackQuery } from "./oauthCallbackUrl";

describe("OAuth callback URL", () => {
  it("removes one-time code and provider error query parameters", () => {
    expect(
      stripOAuthCallbackQuery(
        "https://eoringo.pages.dev/auth/callback?code=one-time-code&state=opaque#ignored",
      ),
    ).toBe("/auth/callback#ignored");
  });
});
