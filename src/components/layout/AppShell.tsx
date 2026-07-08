import type { PropsWithChildren } from "react";
import { BottomNav } from "./BottomNav";

export const AppShell = ({ children }: PropsWithChildren) => (
  <div className="min-h-screen bg-bg">
    <div className="mx-auto min-h-screen max-w-3xl border-x border-dashed border-[rgb(var(--color-line-soft))] bg-card/35">
      <header className="sticky top-0 z-20 border-b border-[rgb(var(--color-line-soft))] bg-bg/92">
        <div className="flex items-center justify-between px-4 py-2.5">
          <div>
            <p className="text-sm font-bold tracking-tight text-ink">FF14 Daily Board</p>
            <p className="text-[11px] font-medium text-ink-muted">my eorzea routine memo</p>
          </div>
          <span className="rounded-full border border-[rgb(var(--color-line-soft))] bg-card-soft px-2.5 py-1 text-[11px] font-bold text-primary">
            memo
          </span>
        </div>
      </header>
      <main className="px-3 pb-[calc(6.5rem+env(safe-area-inset-bottom))] pt-3">
        {children}
      </main>
      <BottomNav />
    </div>
  </div>
);
