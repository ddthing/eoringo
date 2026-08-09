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
    expect(markup).toContain('href="/terms"');
  });

  it("makes the service notice link back to privacy guidance", () => {
    const markup = renderToStaticMarkup(<TermsNoticePage />);

    expect(markup).toContain('data-legal-notice="terms"');
    expect(markup).toContain("안전한 로그인");
    expect(markup).toContain('href="/privacy"');
    expect(markup).toContain('href="https://coner.luv3r.me/"');
  });
});
