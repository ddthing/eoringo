import { getTodayFrontline } from "../../domain/frontline/getTodayFrontline";

export const FrontlineCard = () => {
  const frontline = getTodayFrontline();

  return (
    <section className="memo-card bg-sky/70 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="muted-label">오늘의 전장</p>
        <span className="sticker bg-card/80">{frontline.shortName}</span>
      </div>
      <h2 className="truncate text-base font-bold">{frontline.displayName}</h2>
      <p className="mt-1 text-[11px] text-ink-muted">한국 서버 기준 로테이션으로 계산했어요.</p>
    </section>
  );
};
