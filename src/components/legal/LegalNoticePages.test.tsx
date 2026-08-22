import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PrivacyNoticePage, TermsNoticePage } from "./LegalNoticePages";

describe("LegalNoticePages", () => {
  it("makes the privacy notice publicly linkable and clear about Google data access", () => {
    const markup = renderToStaticMarkup(<PrivacyNoticePage />);

    expect(markup).toContain('data-legal-notice="privacy"');
    expect(markup).toContain("Google 비밀번호");
    expect(markup).toContain("Gmail");
    expect(markup).toContain("Supabase");
    expect(markup).toContain("안전한 경우");
    expect(markup).toContain("Google AdSense 광고 태그");
    expect(markup).toContain("Google 파트너 사이트에서의 데이터 사용");
    expect(markup).toContain("삭제·문의 요청");
    expect(markup).toContain('href="/terms"');
  });

  it("makes the service notice link back to privacy guidance", () => {
    const markup = renderToStaticMarkup(<TermsNoticePage />);

    expect(markup).toContain('data-legal-notice="terms"');
    expect(markup).toContain("안전한 로그인");
    expect(markup).toContain("안전한 자동 검증");
    expect(markup).toContain("정보의 성격과 외부 출처");
    expect(markup).toContain('href="/privacy"');
    expect(markup).toContain('href="https://coner.luv3r.me/"');
  });
});
