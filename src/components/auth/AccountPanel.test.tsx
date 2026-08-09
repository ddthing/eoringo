import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AccountPanel } from "./AccountPanel";

const authState = {
  status: "guest" as "guest" | "no-session",
  mode: "guest" as "guest" | "local-only",
  userId: "guest-id" as string | null,
  provider: "anonymous" as "anonymous" | null,
  errorCode: null,
  createGuest: vi.fn(),
  signInGoogle: vi.fn(),
  connectGoogle: vi.fn(),
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
  });

  it("shows Google sign-in before guest creation", () => {
    authState.status = "no-session";
    authState.mode = "local-only";
    authState.userId = null;
    authState.provider = null;

    const markup = renderToStaticMarkup(<AccountPanel embedded />);

    expect(markup).toContain("Google로 로그인");
    expect(markup).toContain("게스트로 계속하기");
  });
});
