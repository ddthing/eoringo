import { describe, expect, it } from "vitest";
import {
  authStateReducer,
  disabledAuthState,
  initializingAuthState,
} from "./AuthProvider";

describe("auth state reducer", () => {
  it("keeps remote failures in a local-safe state", () => {
    expect(
      authStateReducer(initializingAuthState, {
        type: "error",
        code: "network",
      }),
    ).toEqual({
      ...disabledAuthState,
      status: "error",
      errorCode: "network",
    });
  });

  it("distinguishes guest and permanent verified sessions", () => {
    const guest = authStateReducer(initializingAuthState, {
      type: "ready",
      session: {
        userId: "guest-id",
        mode: "guest",
        provider: "anonymous",
      },
    });
    const permanent = authStateReducer(guest, {
      type: "ready",
      session: {
        userId: "permanent-id",
        mode: "permanent",
        provider: "google",
      },
    });

    expect(guest).toMatchObject({ status: "guest", mode: "guest" });
    expect(permanent).toMatchObject({
      status: "permanent",
      mode: "permanent",
      provider: "google",
    });
  });

  it("does not discard the current identity while starting OAuth", () => {
    const guest = {
      status: "guest",
      mode: "guest",
      userId: "guest-id",
      provider: "anonymous",
      errorCode: null,
    } as const;

    expect(authStateReducer(guest, { type: "oauth-redirect" })).toMatchObject({
      status: "oauth-redirect",
      mode: "guest",
      userId: "guest-id",
    });
  });

  it("waits for an explicit CAPTCHA result before entering guest creation", () => {
    expect(
      authStateReducer(initializingAuthState, { type: "no-session" }),
    ).toMatchObject({ status: "no-session", mode: "local-only" });
  });
});
