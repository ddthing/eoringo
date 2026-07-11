import { getHousingPhase } from "../../domain/housing/getHousingPhase";

const shortPhaseLabel = {
  entry: "신청",
  result: "발표",
};

const formatShortDate = (dateKey: string) => dateKey.slice(5).replace("-", ".");

export const HousingWidget = () => {
  const phase = getHousingPhase();

  return (
    <section className="home-panel h-full p-3.5 min-[420px]:p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="muted-label">하우징</p>
          <h2 className="home-heading mt-2 text-[26px] font-black leading-none tracking-[-0.035em] text-ink min-[420px]:text-[28px]">
            {shortPhaseLabel[phase.phase]}
          </h2>
        </div>
        <span className="sticker">
          {phase.day}/{phase.totalDays}
        </span>
      </div>
      <p className="mt-2.5 truncate text-[13px] font-bold leading-5 text-ink min-[420px]:text-sm">{phase.label}</p>
      <p className="mt-0.5 text-[11px] font-medium leading-5 text-ink-muted tabular-nums">
        다음 {shortPhaseLabel[phase.phase === "entry" ? "result" : "entry"]}{" "}
        {formatShortDate(phase.nextPhaseDate)}
      </p>
    </section>
  );
};
