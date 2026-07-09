import {
  eachDayOfInterval,
  endOfMonth,
  format,
  getDay,
  parseISO,
  startOfMonth,
} from "date-fns";
import { useMemo, useState } from "react";
import { frontlineMaps } from "../../data/frontline";
import { getFrontlineByDateKey } from "../../domain/frontline/getTodayFrontline";
import { getHousingPhase } from "../../domain/housing/getHousingPhase";
import { addDaysToDateKey, getKstDateKey } from "../../lib/date";
import type { FrontlineMap, HousingPhaseResult } from "../../types";

const weekdays = ["일", "월", "화", "수", "목", "금", "토"];

const phaseLabel = {
  entry: "신청",
  result: "발표",
};

const phasePillClassName = {
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
  const nextLabel = phase.nextPhaseLabel === "신청 기간" ? "신청" : "발표";

  return `다음 ${nextLabel} ${formatMonthDay(phase.nextPhaseDate)}`;
};

export const CalendarPage = () => {
  const [monthlyMode, setMonthlyMode] = useState<"frontline" | "housing">("frontline");
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
    <div className="space-y-3">
      <div className="px-1">
        <h1 className="text-lg font-bold text-ink">전장 / 하우징 달력</h1>
      </div>

      <section className="space-y-2">
        <p className="px-1 text-xs font-bold text-ink-muted">오늘 요약</p>
        <div className="grid grid-cols-2 gap-2.5 max-[520px]:grid-cols-1">
          <article className="memo-card bg-sky/70 p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="muted-label">전장</p>
              <span className="sticker bg-card/80">{todayFrontline.shortName}</span>
            </div>
            <h2 className="text-xl font-black leading-tight text-ink">
              {todayFrontline.displayName}
            </h2>
            <p className="mt-3 grid gap-1 rounded-[14px] bg-card/70 px-2.5 py-2 text-xs font-bold text-ink">
              <span className="text-ink-muted">내일 전장은?</span>
              <span className="break-keep text-ink">{tomorrowFrontline.displayName}</span>
            </p>
          </article>

          <article className="memo-card bg-card/86 p-3">
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

      <section className="memo-card bg-card/86 p-3">
        <div>
          <span className="muted-label block">월간 달력</span>
          <span className="text-sm font-bold">{monthLabel} 달력</span>
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

          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-ink-muted">
            {weekdays.map((weekday) => (
              <span key={weekday}>{weekday}</span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {monthCells.map((dateKey, index) => {
              if (!dateKey) {
                return <div key={`blank-${index}`} className="min-h-12" />;
              }

              const isToday = dateKey === todayKey;
              const frontline = getFrontlineByDateKey(dateKey);
              const housing = getHousingPhase(toKstDate(dateKey));
              const label =
                monthlyMode === "frontline" ? frontline.shortName : phaseLabel[housing.phase];
              const toneClassName =
                monthlyMode === "frontline"
                  ? frontlineCellClassName[frontline.id]
                  : housingCellClassName[housing.phase];

              return (
                <div
                  key={dateKey}
                  className={[
                    "min-h-14 rounded-[14px] border px-1.5 py-1.5 text-center transition",
                    toneClassName,
                    isToday ? "ring-2 ring-primary/40" : "",
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

      <section className="memo-card bg-card/80 p-3">
        <h2 className="text-sm font-bold">범례</h2>
        <div className="mt-2 grid gap-1.5 text-xs">
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
        <p className="mt-2 text-[11px] text-ink-muted">
          점검이나 패치로 실제 일정이 달라질 수 있어요.
        </p>
        <p className="mt-1 text-[11px] text-ink-muted">
          하우징 정보 제공:{" "}
          <a
            href="https://x.com/ff14gingerS"
            target="_blank"
            rel="noopener noreferrer"
            className="font-bold text-primary underline-offset-2 hover:underline"
          >
            @ff14gingerS
          </a>
        </p>
      </section>
    </div>
  );
};
