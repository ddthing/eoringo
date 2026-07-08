import { getHousingPhase } from "../../domain/housing/getHousingPhase";

const phaseClassName = {
  entry: "bg-mint text-emerald-800",
  result: "bg-peach text-orange-800",
};

const shortPhaseLabel = {
  entry: "신청",
  result: "발표",
};

export const HousingCard = () => {
  const phase = getHousingPhase();

  return (
    <section className="memo-card bg-card-soft/80 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="muted-label">하우징</p>
        <span
          className={[
            "rounded-full border border-[rgb(var(--color-line-soft))] px-2.5 py-1 text-xs font-bold",
            phaseClassName[phase.phase],
          ].join(" ")}
        >
          {shortPhaseLabel[phase.phase]} {phase.day}/{phase.totalDays}
        </span>
      </div>
      <h2 className="truncate text-base font-bold">{phase.label}</h2>
      <div className="mt-1 space-y-0.5 text-[11px] text-ink-muted">
        <p>
          신청 {phase.entryStartDate} ~ {phase.entryEndDate}
        </p>
        <p>
          발표 {phase.resultStartDate} ~ {phase.resultEndDate}
        </p>
        <p>
          다음 {phase.nextPhaseLabel} {phase.nextPhaseDate}
        </p>
      </div>
    </section>
  );
};
