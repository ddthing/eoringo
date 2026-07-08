import { addDaysToDateKey, getKstDateKey } from "../../lib/date";
import { getFrontlineByDateKey } from "../../domain/frontline/getTodayFrontline";

export const FrontlineWidget = () => {
  const todayKey = getKstDateKey();
  const today = getFrontlineByDateKey(todayKey);
  const tomorrow = getFrontlineByDateKey(addDaysToDateKey(todayKey, 1));

  return (
    <section className="rounded-[16px] border border-[rgb(var(--color-line-soft))] bg-card/95 p-3 shadow-soft">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="muted-label">오늘의 전장</p>
          <h2 className="mt-2 text-3xl font-black leading-none text-ink">{today.shortName}</h2>
        </div>
        <span className="sticker">PvP</span>
      </div>
      <p className="mt-2 truncate text-sm font-bold text-ink">{today.displayName}</p>
      <p className="mt-1 text-[11px] font-medium text-ink-muted">내일: {tomorrow.shortName}</p>
    </section>
  );
};
