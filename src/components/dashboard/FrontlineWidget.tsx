import { addDaysToDateKey, getKstDateKey } from "../../lib/date";
import { getFrontlineByDateKey } from "../../domain/frontline/getTodayFrontline";

export const FrontlineWidget = () => {
  const todayKey = getKstDateKey();
  const today = getFrontlineByDateKey(todayKey);
  const tomorrow = getFrontlineByDateKey(addDaysToDateKey(todayKey, 1));

  return (
    <section className="home-panel h-full p-3.5 min-[420px]:p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="muted-label">오늘의 전장</p>
          <h2 className="home-heading mt-2 text-[26px] font-black leading-none tracking-[-0.035em] text-ink min-[420px]:text-[28px]">{today.shortName}</h2>
        </div>
        <span className="sticker">PvP</span>
      </div>
      <p className="mt-2.5 truncate text-[13px] font-bold leading-5 text-ink min-[420px]:text-sm">{today.displayName}</p>
      <p className="mt-0.5 text-[11px] font-medium leading-5 text-ink-muted">내일: {tomorrow.shortName}</p>
    </section>
  );
};
