import {
  eachDayOfInterval,
  endOfMonth,
  format,
  getDay,
  parseISO,
  startOfMonth,
} from "date-fns";
import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { frontlineMaps } from "../../data/frontline";
import { getFrontlineByDateKey } from "../../domain/frontline/getTodayFrontline";
import { getHousingPhase } from "../../domain/housing/getHousingPhase";
import { addDaysToDateKey, getKstDateKey } from "../../lib/date";
import type { FrontlineMap, HousingPhaseResult } from "../../types";
import { HousingListingsMemo } from "./HousingListingsMemo";

const weekdays = ["일", "월", "화", "수", "목", "금", "토"];

const phaseLabel: Record<HousingPhaseResult["phase"], string> = {
  entry: "신청",
  result: "발표",
};

const phasePillClassName: Record<HousingPhaseResult["phase"], string> = {
  entry: "border-[rgb(199_217_196)] bg-[rgb(235_243_231)] text-[rgb(88_124_82)]",
  result: "border-[rgb(225_205_174)] bg-[rgb(249_240_226)] text-[rgb(139_109_64)]",
};

const frontlineCellClassName: Record<FrontlineMap["id"], string> = {
  "seal-rock": "border-[rgb(205_220_202)] bg-[rgb(239_246_236)] text-[rgb(92_121_85)]",
  "borderland-ruins": "border-[rgb(218_211_202)] bg-[rgb(246_242_236)] text-[rgb(121_108_94)]",
  onsal: "border-[rgb(197_219_216)] bg-[rgb(235_246_244)] text-[rgb(82_120_116)]",
  "worqor-chitte": "border-[rgb(203_216_226)] bg-[rgb(238_245_250)] text-[rgb(84_109_128)]",
  "fields-of-glory": "border-[rgb(212_209_225)] bg-[rgb(243_241_248)] text-[rgb(103_96_126)]",
};

const housingCellClassName: Record<HousingPhaseResult["phase"], string> = {
  entry: "border-[rgb(205_220_202)] bg-[rgb(239_246_236)] text-[rgb(92_121_85)]",
  result: "border-[rgb(225_205_174)] bg-[rgb(249_240_226)] text-[rgb(139_109_64)]",
};

const toKstDate = (dateKey: string) => new Date(`${dateKey}T00:00:00+09:00`);

const formatMonthDay = (dateKey: string) => format(parseISO(dateKey), "MM.dd");

const getNextPhaseCopy = (phase: HousingPhaseResult) => {
  const nextLabel = phase.phase === "entry" ? "발표" : "신청";

  return `다음 ${nextLabel} ${formatMonthDay(phase.nextPhaseDate)}`;
};

export const CalendarPage = () => {
  const [monthlyMode, setMonthlyMode] = useState<"frontline" | "housing">("frontline");
  const [legendOpen, setLegendOpen] = useState(false);
  const todayKey = getKstDateKey();
  const todayHousing = getHousingPhase();
  const todayFrontline = getFrontlineByDateKey(todayKey);
  const tomorrowFrontline = getFrontlineByDateKey(addDaysToDateKey(todayKey, 1));

  const monthCells = useMemo(() => {
    const monthStart = startOfMonth(parseISO(todayKey));
    const monthEnd = endOfMonth(monthStart);
    const leadingBlankCount = getDay(monthStart);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd }).map((date) =>
      format(date, "yyyy-MM-dd"),
    );

    return [...Array<string | null>(leadingBlankCount).fill(null), ...days];
  }, [todayKey]);

  const monthLabel = format(parseISO(todayKey), "M월");
  return (
    <div className="space-y-5">
      <div className="px-1 pt-1">
        <p className="muted-label">일정</p>
        <h1 className="mt-1 text-xl font-black text-ink">전장 / 하우징 달력</h1>
      </div>

      <section className="space-y-2.5">
        <div className="flex items-center gap-2 px-1">
          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
          <h2 className="text-sm font-black text-ink">오늘 요약</h2>
        </div>
        <div className="grid grid-cols-2 gap-2.5 max-[520px]:grid-cols-1">
          <article className="calendar-panel p-4 transition duration-200 hover:border-primary/30">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="muted-label">전장</p>
              <span className="sticker bg-card/80">{todayFrontline.shortName}</span>
            </div>
            <h2 className="text-xl font-black leading-tight text-ink">
              {todayFrontline.displayName}
            </h2>
            <p className="mt-3 grid gap-1 rounded-[14px] bg-card/70 px-2.5 py-2 text-xs font-bold text-ink">
              <span className="text-ink-muted">내일 전장은</span>
              <span className="break-keep text-ink">{tomorrowFrontline.displayName}</span>
            </p>
          </article>

          <article className="calendar-panel p-4 transition duration-200 hover:border-primary/30">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="muted-label">하우징</p>
              <span
                className={[
                  "rounded-full border px-2 py-0.5 text-[11px] font-bold",
                  phasePillClassName[todayHousing.phase],
                ].join(" ")}
              >
                {phaseLabel[todayHousing.phase]}
              </span>
            </div>
            <h2 className="text-base font-bold leading-tight">{todayHousing.label}</h2>
            <p className="mt-1 text-sm font-bold text-primary">
              {todayHousing.day}/{todayHousing.totalDays}일차
            </p>
            <div className="mt-2 space-y-1 text-[12px] font-medium text-ink-muted">
              <p>
                신청 {formatMonthDay(todayHousing.entryStartDate)} ~{" "}
                {formatMonthDay(todayHousing.entryEndDate)}
              </p>
              <p>
                발표 {formatMonthDay(todayHousing.resultStartDate)} ~{" "}
                {formatMonthDay(todayHousing.resultEndDate)}
              </p>
            </div>
            <p className="mt-2 rounded-[14px] bg-primary-soft/60 px-2.5 py-1.5 text-xs font-bold text-primary">
              {getNextPhaseCopy(todayHousing)}
            </p>
          </article>
        </div>
      </section>

      <section className="calendar-panel p-4">
        <div className="flex items-end justify-between gap-3">
          <div>
            <span className="muted-label block">월간 달력</span>
            <h2 className="mt-1 text-base font-black text-ink">{monthLabel} 달력</h2>
          </div>
          <span className="text-[11px] font-bold text-ink-muted">KST 기준</span>
        </div>

        <div className="mt-3 space-y-3">
          <div className="grid grid-cols-2 gap-1.5 rounded-[18px] bg-card-soft/70 p-1">
            <button
              type="button"
              className={[
                "min-h-10 rounded-[14px] px-3 py-1.5 text-xs font-bold transition",
                monthlyMode === "frontline" ? "bg-card text-primary shadow-soft" : "text-ink-muted",
              ].join(" ")}
              onClick={() => setMonthlyMode("frontline")}
            >
              전장 월간
            </button>
            <button
              type="button"
              className={[
                "min-h-10 rounded-[14px] px-3 py-1.5 text-xs font-bold transition",
                monthlyMode === "housing" ? "bg-card text-primary shadow-soft" : "text-ink-muted",
              ].join(" ")}
              onClick={() => setMonthlyMode("housing")}
            >
              하우징 월간
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 rounded-[10px] bg-card-soft/80 px-1 py-2 text-center text-[10px] font-black text-ink-muted">
            {weekdays.map((weekday, index) => (
              <span key={weekday} className={index === 0 ? "text-[rgb(var(--color-danger))]" : index === 6 ? "text-primary" : ""}>{weekday}</span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {monthCells.map((dateKey, index) => {
              if (!dateKey) {
                return <div key={`blank-${index}`} className="min-h-14" />;
              }

              const isToday = dateKey === todayKey;
              const frontline = getFrontlineByDateKey(dateKey);
              const housing = getHousingPhase(toKstDate(dateKey));
              const label =
                monthlyMode === "frontline" ? frontline.shortName : phaseLabel[housing.phase];
              const toneClassName = isToday
                ? "border-primary bg-card text-ink ring-2 ring-primary/35"
                : monthlyMode === "frontline"
                  ? frontlineCellClassName[frontline.id]
                  : housingCellClassName[housing.phase];

              return (
                <div
                  key={dateKey}
                  className={[
                    "calendar-cell min-h-14 rounded-[11px] border px-1 py-1.5 text-center transition duration-200 hover:-translate-y-0.5 hover:shadow-sm",
                    toneClassName,
                  ].join(" ")}
                >
                  <p className="text-[11px] font-bold text-ink">
                    {format(parseISO(dateKey), "d")}
                  </p>
                  <p className="mt-1 truncate text-xs font-black">{label}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <HousingListingsMemo />

      <section className="calendar-panel overflow-hidden px-4 py-2">
        <button
          type="button"
          className="flex min-h-10 w-full items-center justify-between gap-3 text-left text-sm font-bold text-ink"
          onClick={() => setLegendOpen((current) => !current)}
          aria-expanded={legendOpen}
        >
          <span>범례</span>
          <ChevronDown aria-hidden size={17} className={`text-primary transition-transform duration-200 ${legendOpen ? "rotate-180" : ""}`} />
        </button>
        {legendOpen ? (
          <div className="calendar-accordion mt-1 grid gap-2 border-t border-[rgb(var(--color-line-muted))] py-3 text-xs">
            {frontlineMaps.map((map) => (
              <div key={map.id} className="grid grid-cols-[2.4rem_1fr] gap-2">
                <span
                  className={[
                    "w-fit rounded-full border px-2 py-0.5 text-[11px] font-bold",
                    frontlineCellClassName[map.id],
                  ].join(" ")}
                >
                  {map.shortName}
                </span>
                <span className="text-ink-muted">{map.displayName}</span>
              </div>
            ))}
          </div>
        ) : null}
      </section>
    </div>
  );
};
