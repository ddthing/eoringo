import { getHousingPhase } from "../../domain/housing/getHousingPhase";

const shortPhaseLabel = {
  entry: "신청",
  result: "발표",
};

const formatShortDate = (dateKey: string) => dateKey.slice(5).replace("-", ".");

export const HousingWidget = () => {
  const phase = getHousingPhase();

  return (
    <section className="rounded-[16px] border border-[rgb(var(--color-line-soft))] bg-card p-3 shadow-soft transition duration-200 hover:border-primary/35 active:scale-[0.99]">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="muted-label">하우징</p>
          <h2 className="mt-2 text-3xl font-black leading-none text-ink">
            {shortPhaseLabel[phase.phase]}
          </h2>
        </div>
        <span className="sticker">
          {phase.day}/{phase.totalDays}
        </span>
      </div>
      <p className="mt-2 truncate text-sm font-bold text-ink">{phase.label}</p>
      <p className="mt-1 text-[11px] font-medium text-ink-muted">
        다음 {shortPhaseLabel[phase.phase === "entry" ? "result" : "entry"]}{" "}
        {formatShortDate(phase.nextPhaseDate)}
      </p>
    </section>
  );
};
