import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SectionHeader } from "./SectionHeader";

describe("SectionHeader", () => {
  it("uses the shared page alignment variant for page-level titles", () => {
    const markup = renderToStaticMarkup(
      <SectionHeader
        variant="page"
        eyebrow="일정"
        title="전장 / 하우징 달력"
        description="주요 일정을 확인하세요."
        headingLevel="h1"
      />,
    );

    expect(markup).toContain('class="ui-page-heading"');
    expect(markup).toContain('class="ui-page-heading-copy"');
    expect(markup).toContain('class="ui-section-title"');
  });

  it("keeps section headers on the section layout by default", () => {
    const markup = renderToStaticMarkup(
      <SectionHeader title="오늘 요약" description="오늘의 상태입니다." />,
    );

    expect(markup).toContain('class="ui-section-heading"');
    expect(markup).toContain('class="ui-section-header-copy"');
  });
});
