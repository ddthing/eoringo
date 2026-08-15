import type { PropsWithChildren } from "react";
import { useLocation } from "react-router-dom";
import { formatKoreanDate } from "../../lib/date";
import { useMinuteNow } from "../../hooks/useMinuteNow";
import { BottomNav } from "./BottomNav";

const CurrentDatePill = () => {
  const now = useMinuteNow();

  return (
    <p className="ui-date-pill truncate text-right">
      {formatKoreanDate(now)}
    </p>
  );
};

const getPageContext = (pathname: string) => {
  if (pathname.startsWith("/tasks")) {
    return { label: "숙제 관리", copy: "일일·주간 루틴을 정리하세요" };
  }

  if (pathname.startsWith("/calendar")) {
    return { label: "일정 현황", copy: "전장과 하우징 일정을 확인하세요" };
  }

  if (pathname.startsWith("/settings")) {
    return { label: "환경 설정", copy: "캐릭터와 앱 동작을 관리하세요" };
  }

  if (pathname === "/") {
    return { label: "오늘의 현황", copy: "숙제와 게임 일정을 한눈에" };
  }

  return { label: "에오링고", copy: "루틴 대시보드" };
};

export const AppShell = ({ children }: PropsWithChildren) => {
  const location = useLocation();
  const pageContext = getPageContext(location.pathname);

  return (
    <div className="min-h-[100dvh] bg-bg">
      <div className="ui-app-container min-h-[100dvh] w-full max-w-none">
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
          <main className="ui-main">{children}</main>
        </div>
      </div>
    </div>
  );
};
