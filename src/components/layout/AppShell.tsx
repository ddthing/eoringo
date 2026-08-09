import { useEffect, useState } from "react";
import type { PropsWithChildren } from "react";
import { formatKoreanDate } from "../../lib/date";
import { BottomNav } from "./BottomNav";

export const AppShell = ({ children }: PropsWithChildren) => {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timerId = window.setInterval(() => setNow(new Date()), 60_000);

    return () => window.clearInterval(timerId);
  }, []);

  return (
    <div className="min-h-screen bg-bg">
      <div className="ui-app-container mx-auto min-h-screen max-w-3xl border-x border-[rgb(var(--color-line-soft))]">
        <header className="ui-top-app-bar sticky top-0 z-20 h-[var(--app-header-height)]">
          <div className="flex h-full items-center justify-between gap-3 px-4">
            <p className="ui-brand-mark shrink-0">에오링고</p>
            <p className="ui-date-pill truncate text-right">
              {formatKoreanDate(now)}
            </p>
          </div>
        </header>
        <main className="px-3 pb-[calc(6.5rem+env(safe-area-inset-bottom))] pt-3">
          {children}
        </main>
        <BottomNav />
      </div>
    </div>
  );
};
