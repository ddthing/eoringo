import { describe, expect, it, vi } from "vitest";
import type { Session, SupabaseClient, User } from "@supabase/supabase-js";
import {
  buildAuthCallbackUrl,
  createAuthClient,
  createGuestSessionOnce,
  exchangeOAuthCodeOnce,
  initializeAuthClient,
  normalizeAuthFailure,
  type AuthClient,
} from "./authClient";

const makeUser = (overrides: Partial<User> = {}) =>
  ({
    id: "00000000-0000-0000-0000-000000000001",
    is_anonymous: true,
    identities: [],
    ...overrides,
  }) as User;

const makeSession = (user = makeUser()) => ({ user }) as Session;

const makeAuthApi = () => ({
  getSession: vi.fn(),
  getUser: vi.fn(),
  signInAnonymously: vi.fn(),
  linkIdentity: vi.fn(),
  exchangeCodeForSession: vi.fn(),
  onAuthStateChange: vi.fn(() => ({
    data: { subscription: { unsubscribe: vi.fn() } },
  })),
});

describe("auth client", () => {
  it("verifies a restored session with the Auth server before returning it", async () => {
    const auth = makeAuthApi();
    const session = makeSession();
    auth.getSession.mockResolvedValue({ data: { session }, error: null });
    auth.getUser.mockResolvedValue({ data: { user: session.user }, error: null });

    await expect(
      createAuthClient(auth as unknown as SupabaseClient["auth"]).getCurrentSession(),
    ).resolves.toMatchObject({ mode: "guest", provider: "anonymous" });
    expect(auth.getUser).toHaveBeenCalledOnce();
  });

  it("rejects a restored session whose verified user does not match", async () => {
    const auth = makeAuthApi();
    auth.getSession.mockResolvedValue({ data: { session: makeSession() }, error: null });
    auth.getUser.mockResolvedValue({
      data: { user: makeUser({ id: "00000000-0000-0000-0000-000000000002" }) },
      error: null,
    });

    await expect(
      createAuthClient(auth as unknown as SupabaseClient["auth"]).getCurrentSession(),
    ).rejects.toMatchObject({ code: "session-invalid" });
  });

  it("restores a session without creating an unprotected guest", async () => {
    const summary = {
      userId: "00000000-0000-0000-0000-000000000001",
      mode: "guest",
      provider: "anonymous",
    } as const;
    const client: AuthClient = {
      getCurrentSession: vi.fn().mockResolvedValue(summary),
      createGuestSession: vi.fn().mockResolvedValue(summary),
      connectGoogle: vi.fn(),
      exchangeOAuthCode: vi.fn(),
      subscribe: vi.fn(() => vi.fn()),
    };

    const first = initializeAuthClient(client);
    const second = initializeAuthClient(client);

    await expect(Promise.all([first, second])).resolves.toEqual([summary, summary]);
    expect(client.createGuestSession).not.toHaveBeenCalled();
  });

  it("requires CAPTCHA and deduplicates explicit guest creation", async () => {
    const auth = makeAuthApi();
    auth.signInAnonymously.mockResolvedValue({ data: { session: null }, error: null });
    const authClient = createAuthClient(auth as unknown as SupabaseClient["auth"]);

    await expect(authClient.createGuestSession(" ")).rejects.toMatchObject({
      code: "captcha-required",
    });
    expect(auth.signInAnonymously).not.toHaveBeenCalled();

    const summary = {
      userId: "00000000-0000-0000-0000-000000000001",
      mode: "guest",
      provider: "anonymous",
    } as const;
    const client = {
      createGuestSession: vi.fn().mockResolvedValue(summary),
    } as unknown as AuthClient;

    await Promise.all([
      createGuestSessionOnce(client, "captcha-token"),
      createGuestSessionOnce(client, "captcha-token"),
    ]);

    expect(client.createGuestSession).toHaveBeenCalledOnce();
    expect(client.createGuestSession).toHaveBeenCalledWith("captcha-token");
  });

  it("links Google to the verified current user with exact identity scopes", async () => {
    const auth = makeAuthApi();
    const session = makeSession();
    auth.getSession.mockResolvedValue({ data: { session }, error: null });
    auth.getUser.mockResolvedValue({ data: { user: session.user }, error: null });
    auth.linkIdentity.mockResolvedValue({ data: {}, error: null });

    await createAuthClient(auth as unknown as SupabaseClient["auth"]).connectGoogle(
      "https://app.example.com/auth/callback",
    );

    expect(auth.linkIdentity).toHaveBeenCalledWith({
      provider: "google",
      options: {
        redirectTo: "https://app.example.com/auth/callback",
        scopes: "openid email profile",
      },
    });
  });

  it("exchanges each PKCE callback code once", async () => {
    const summary = {
      userId: "00000000-0000-0000-0000-000000000001",
      mode: "permanent",
      provider: "google",
    } as const;
    const client = {
      exchangeOAuthCode: vi.fn().mockResolvedValue(summary),
    } as unknown as AuthClient;

    await Promise.all([
      exchangeOAuthCodeOnce(client, "one-time-code"),
      exchangeOAuthCodeOnce(client, "one-time-code"),
    ]);

    expect(client.exchangeOAuthCode).toHaveBeenCalledOnce();
  });

  it("maps provider failures without exposing their raw message", () => {
    const failure = normalizeAuthFailure({
      status: 429,
      message: "provider request details that must not reach the UI",
    });

    expect(failure.code).toBe("rate-limited");
    expect(failure.message).toBe("rate-limited");
  });

  it("builds only exact secure or local callback URLs", () => {
    expect(buildAuthCallbackUrl("https://app.example.com/anything?next=evil")).toBe(
      "https://app.example.com/auth/callback",
    );
    expect(buildAuthCallbackUrl("http://127.0.0.1:5173")).toBe(
      "http://127.0.0.1:5173/auth/callback",
    );
    expect(() => buildAuthCallbackUrl("http://app.example.com")).toThrow();
    expect(() => buildAuthCallbackUrl("https://user:pass@app.example.com")).toThrow();
  });
});
