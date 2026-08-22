import { useEffect, useRef, type PropsWithChildren } from "react";
import { useLocation } from "react-router-dom";
import { formatKoreanDate } from "../../lib/date";
import { useMinuteNow } from "../../hooks/useMinuteNow";
import { BottomNav } from "./BottomNav";
import { setPageMetadata } from "../../lib/seo";

const CurrentDatePill = () => {
  const now = useMinuteNow();

  return (
    <p className="ui-date-pill truncate text-right">
      {formatKoreanDate(now)}
    </p>
  );
};

const getPageContext = (pathname: string) => {
  if (pathname.startsWith("/tasks/manage")) {
    return {
      label: "숙제 상세 관리",
      copy: "커스텀 숙제와 표시 순서를 관리하세요",
      title: "숙제 상세 관리 | 에오링고",
    };
  }

  if (pathname.startsWith("/tasks")) {
    return {
      label: "숙제 관리",
      copy: "일일·주간 루틴을 정리하세요",
      title: "숙제 관리 | 에오링고",
    };
  }

  if (pathname.startsWith("/calendar")) {
    return {
      label: "일정 현황",
      copy: "전장과 하우징 일정을 확인하세요",
      title: "전장 / 하우징 달력 | 에오링고",
    };
  }

  if (pathname.startsWith("/settings")) {
    return {
      label: "환경 설정",
      copy: "캐릭터와 앱 동작을 관리하세요",
      title: "환경 설정 | 에오링고",
    };
  }

  if (pathname.startsWith("/auth/callback")) {
    return {
      label: "Google 로그인",
      copy: "계정 연결 상태를 확인합니다",
      title: "Google 로그인 | 에오링고",
    };
  }

  if (pathname === "/") {
    return {
      label: "오늘의 현황",
      copy: "숙제와 게임 일정을 한눈에",
      title: "오늘의 루틴 | 에오링고",
    };
  }

  return { label: "에오링고", copy: "루틴 대시보드", title: "에오링고" };
};

export const AppShell = ({ children }: PropsWithChildren) => {
  const location = useLocation();
  const pageContext = getPageContext(location.pathname);
  const mainRef = useRef<HTMLElement | null>(null);
  const previousPathnameRef = useRef(location.pathname);

  useEffect(() => {
    setPageMetadata({
      title: pageContext.title,
      description: `${pageContext.copy}. 에오링고 앱에서 캐릭터별 파이널판타지14 루틴을 기록하세요.`,
      canonicalPath: location.pathname,
      robots: "noindex,nofollow",
    });

    if (previousPathnameRef.current !== location.pathname) {
      requestAnimationFrame(() => mainRef.current?.focus({ preventScroll: true }));
    }

    previousPathnameRef.current = location.pathname;
  }, [location.pathname, pageContext.title]);

  return (
    <div className="min-h-[100dvh] bg-bg">
      <div className="ui-app-container min-h-[100dvh] w-full max-w-none">
        <a className="ui-skip-link" href="#main-content">
          본문으로 바로가기
        </a>
        <header className="ui-top-app-bar sticky top-0 z-20">
          <div className="ui-top-app-bar-row">
            <div className="ui-top-app-bar-brand">
              <p className="ui-brand-mark">에오링고</p>
              <span className="ui-brand-subtitle">루틴 대시보드</span>
            </div>
            <div className="ui-top-app-bar-main">
              <div className="ui-top-app-bar-context">
                <span className="ui-top-app-bar-context-label">{pageContext.label}</span>
                <span className="ui-top-app-bar-context-copy">{pageContext.copy}</span>
              </div>
              <CurrentDatePill />
            </div>
          </div>
        </header>
        <div className="ui-app-body">
          <BottomNav />
          <main ref={mainRef} id="main-content" className="ui-main" tabIndex={-1}>
            <p className="sr-only" aria-live="polite" aria-atomic="true">
              {pageContext.label} 페이지로 이동했습니다.
            </p>
            {children}
          </main>
        </div>
      </div>
    </div>
  );
};
