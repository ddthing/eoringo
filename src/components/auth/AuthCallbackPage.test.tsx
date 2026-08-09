import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { AuthCallbackPage } from "./AuthCallbackPage";

vi.mock("../../auth/useAuth", () => ({
  useAuth: () => ({
    completeOAuthCallback: vi.fn(),
    signInExistingGoogle: vi.fn(),
  }),
}));

describe("AuthCallbackPage", () => {
  it("starts a neutral recovery state for an already-linked Google identity", () => {
    const markup = renderToStaticMarkup(
      <MemoryRouter
        initialEntries={[
          "/auth/callback?error=server_error&error_code=identity_already_exists&error_description=internal-details",
        ]}
      >
        <AuthCallbackPage />
      </MemoryRouter>,
    );

    expect(markup).toContain("기존 Google 계정으로 안전하게 로그인 중");
    expect(markup).toContain("이미 연결된 계정을 확인하고 동기화를 준비하고 있습니다");
    expect(markup).toContain('aria-busy="true"');
    expect(markup).toContain("secure sign-in");
    expect(markup).not.toContain("이미 연결된 Google 계정입니다");
    expect(markup).not.toContain("기존 Google 계정으로 로그인");
    expect(markup).not.toContain("identity_already_exists");
    expect(markup).not.toContain("internal-details");
  });

  it("keeps other provider failures generic without exposing query details", () => {
    const markup = renderToStaticMarkup(
      <MemoryRouter
        initialEntries={["/auth/callback?error=server_error&error_code=server_error&error_description=secret"]}
      >
        <AuthCallbackPage />
      </MemoryRouter>,
    );

    expect(markup).toContain("Google 연결을 완료하지 못했습니다");
    expect(markup).toContain("기존 게스트 세션과 로컬 데이터는 삭제되지 않았습니다");
    expect(markup).not.toContain("secret");
  });
});
