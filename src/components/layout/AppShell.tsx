import type { PropsWithChildren } from "react";
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

export const AppShell = ({ children }: PropsWithChildren) => {
  return (
    <div className="min-h-screen bg-bg">
      <div className="ui-app-container mx-auto min-h-screen w-full max-w-7xl border-x border-[rgb(var(--color-line-soft))]">
        <header className="ui-top-app-bar sticky top-0 z-20">
          <div className="ui-top-app-bar-row flex items-center justify-between gap-3 px-4 lg:px-6">
            <p className="ui-brand-mark shrink-0">에오링고</p>
            <CurrentDatePill />
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
