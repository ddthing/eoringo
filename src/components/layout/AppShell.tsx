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
      <div className="mx-auto min-h-screen max-w-3xl border-x border-[rgb(var(--color-line-soft))] bg-bg/58">
        <header className="sticky top-0 z-20 border-b border-[rgb(var(--color-line-soft))] bg-bg/86 backdrop-blur-xl">
          <div className="flex items-center justify-between gap-3 px-4 py-2.5">
            <p className="shrink-0 text-sm font-black tracking-tight text-ink">에오링고</p>
            <p className="truncate text-right text-xs font-bold text-ink-muted">
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
