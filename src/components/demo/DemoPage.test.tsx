import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DemoPage } from "./DemoPage";

describe("DemoPage", () => {
  it("shows a useful sample workflow without requiring account data", () => {
    const markup = renderToStaticMarkup(<DemoPage />);

    expect(markup).toContain("오늘 할 일을 고르고, 다음 확인 시점을 기억합니다");
    expect(markup).toContain("실제 데이터 미사용");
    expect(markup).toContain("마지막 처리 후 18시간");
    expect(markup).toContain("체크는 저장되지 않음");
    expect(markup).toContain('href="/guide/getting-started"');
  });
});
