import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AccountPanel } from "./AccountPanel";

const authState = {
  status: "guest" as "guest" | "no-session" | "permanent" | "signing-out" | "oauth-redirect",
  mode: "guest" as "guest" | "local-only" | "permanent",
  userId: "guest-id" as string | null,
  provider: "anonymous" as "anonymous" | "google" | null,
  errorCode: null,
  createGuest: vi.fn(),
  signInGoogle: vi.fn(),
  connectGoogle: vi.fn(),
  signInExistingGoogle: vi.fn(),
  signOut: vi.fn(),
  completeOAuthCallback: vi.fn(),
  retry: vi.fn(),
};

vi.mock("../../auth/useAuth", () => ({
  useAuth: () => authState,
}));

vi.mock("../sync/SyncStatus", () => ({
  SyncStatus: () => null,
}));

vi.mock("../../lib/supabase/env", () => ({
  remoteSyncEnvironment: {
    enabled: true,
    imageUploadsEnabled: false,
    supabaseUrl: "https://project.supabase.co",
    publishableKey: "sb_publishable_test",
    turnstileSiteKey: "turnstile-test-site-key",
  },
}));

describe("AccountPanel", () => {
  beforeEach(() => {
    authState.status = "guest";
    authState.mode = "guest";
    authState.userId = "guest-id";
    authState.provider = "anonymous";
    authState.errorCode = null;
    vi.clearAllMocks();
  });

  it("shows Google connection after guest creation", () => {
    const markup = renderToStaticMarkup(<AccountPanel embedded />);

    expect(markup).toContain("Google");
    expect(markup).toContain('type="button"');
    expect(markup).toContain('href="/privacy"');
    expect(markup).toContain("Google 비밀번호");
  });

  it("shows Google sign-in before guest creation", () => {
    authState.status = "no-session";
    authState.mode = "local-only";
    authState.userId = null;
    authState.provider = null;

    const markup = renderToStaticMarkup(<AccountPanel embedded />);

    expect(markup).toContain("Google로 로그인");
    expect(markup).toContain("게스트로 계속하기");
    expect(markup).toContain("안전한 Google 로그인");
  });

  it("shows account switch and device logout for a Google account", () => {
    authState.status = "permanent";
    authState.mode = "permanent";
    authState.userId = "permanent-id";
    authState.provider = "google";

    const markup = renderToStaticMarkup(<AccountPanel embedded />);

    expect(markup).toContain("다른 Google 계정으로 전환");
    expect(markup).toContain("이 기기에서 로그아웃");
  });
});
