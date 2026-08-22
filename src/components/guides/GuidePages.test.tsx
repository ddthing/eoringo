import { renderToStaticMarkup } from "react-dom/server";
import type { ReactElement } from "react";
import { describe, expect, it } from "vitest";
import {
  AboutPage,
  CalendarGuidePage,
  GettingStartedGuidePage,
  GuideIndexPage,
  RoutineGuidePage,
  TaskCatalogGuidePage,
} from "./GuidePages";

const renderGuide = (element: ReactElement) =>
  renderToStaticMarkup(element);

describe("GuidePages", () => {
  it("publishes a useful guide hub with links to each original article", () => {
    const markup = renderGuide(<GuideIndexPage />);

    expect(markup).toContain("파이널판타지14 루틴을, 오늘 해야 할 일로 바꾸는 법");
    expect(markup).toContain('href="/guide/routine"');
    expect(markup).toContain('href="/guide/getting-started"');
    expect(markup).toContain('href="/guide/calendar"');
    expect(markup).toContain("공식 게임 정보 사이트가 아닙니다");
  });

  it("explains the app's reset models instead of repeating generic SEO copy", () => {
    const markup = renderGuide(<RoutineGuidePage />);

    expect(markup).toContain("18시간 주기");
    expect(markup).toContain("KST 기준 시각");
    expect(markup).toContain("숙제 상세 관리");
    expect(markup).toContain("게임의 공식 리셋이나 보상 조건을 대신하는 문서가 아닙니다");
  });

  it("documents local-first storage and safe account linking", () => {
    const markup = renderGuide(<GettingStartedGuidePage />);

    expect(markup).toContain("JSON 백업");
    expect(markup).toContain("Google 연결은 목적이 있을 때만 사용합니다");
    expect(markup).toContain('href="/privacy"');
  });

  it("discloses calendar data limitations and sources", () => {
    const markup = renderGuide(<CalendarGuidePage />);

    expect(markup).toContain("한국 시간(KST)");
    expect(markup).toContain("커뮤니티 제공 정보");
    expect(markup).toContain("원본 시트");
    expect(markup).toContain("게임 내 정보를 최종 확인");
  });

  it("publishes a concrete task model instead of a generic feature list", () => {
    const markup = renderGuide(<TaskCatalogGuidePage />);

    expect(markup).toContain("숙제 항목의 리셋·횟수 기준표");
    expect(markup).toContain("마지막 완료 후 18시간");
    expect(markup).toContain("규칙이 바뀌면 어떻게 고치나요?");
    expect(markup).toContain("게임 안의 정보가 최종 기준입니다");
  });

  it("explains ownership, source boundaries, and correction principles", () => {
    const markup = renderGuide(<AboutPage />);

    expect(markup).toContain("에오링고는 무엇을 기록하고, 무엇을 주장하지 않는가");
    expect(markup).toContain("Square Enix와 제휴하거나 게임 계정에 접근하지 않습니다");
    expect(markup).toContain("https://github.com/ddthing/eoringo");
    expect(markup).toContain("FINAL FANTASY XIV 공식 Lodestone");
  });
});
