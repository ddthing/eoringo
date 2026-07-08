import {
  eachDayOfInterval,
  endOfMonth,
  format,
  getDay,
  parseISO,
  startOfMonth,
} from "date-fns";
import { useMemo, useState } from "react";
import { frontlineMaps, frontlineRotation } from "../../data/frontline";
import { getFrontlineByDateKey } from "../../domain/frontline/getTodayFrontline";
import { getHousingPhase } from "../../domain/housing/getHousingPhase";
import { addDaysToDateKey, getKstDateKey } from "../../lib/date";
import type { HousingPhaseResult } from "../../types";

const weekdays = ["일", "월", "화", "수", "목", "금", "토"];

const phaseLabel = {
  entry: "신청",
  result: "발표",
};

const phasePillClassName = {
  entry: "border-emerald-200 bg-mint text-emerald-800",
  result: "border-orange-200 bg-peach text-orange-800",
};

const toKstDate = (dateKey: string) => new Date(`${dateKey}T00:00:00+09:00`);

const formatMonthDay = (dateKey: string) => format(parseISO(dateKey), "MM.dd");

const formatListDate = (dateKey: string) => {
  const date = parseISO(dateKey);

  return `${format(date, "MM.dd")} ${weekdays[getDay(date)]}`;
};

const getNextPhaseCopy = (phase: HousingPhaseResult) => {
  const nextLabel = phase.nextPhaseLabel === "신청 기간" ? "신청" : "발표";

  return `다음 ${nextLabel} ${formatMonthDay(phase.nextPhaseDate)}`;
};

export const CalendarPage = () => {
  const [isMonthlyOpen, setIsMonthlyOpen] = useState(false);
  const [monthlyMode, setMonthlyMode] = useState<"frontline" | "housing">("frontline");
  const todayKey = getKstDateKey();
  const todayHousing = getHousingPhase();
  const todayFrontline = getFrontlineByDateKey(todayKey);
  const tomorrowFrontline = getFrontlineByDateKey(addDaysToDateKey(todayKey, 1));

  const upcomingDays = useMemo(
    () =>
      Array.from({ length: 7 }, (_, index) => {
        const dateKey = addDaysToDateKey(todayKey, index);
        const housing = getHousingPhase(toKstDate(dateKey));
        const frontline = getFrontlineByDateKey(dateKey);

        return { dateKey, housing, frontline };
      }),
    [todayKey],
  );

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
        <p className="muted-label">calendar</p>
        <h1 className="text-lg font-bold text-ink">하우징 / 전장 달력</h1>
      </div>

      <section className="space-y-2">
        <p className="px-1 text-xs font-bold text-ink-muted">오늘 요약</p>
        <div className="grid grid-cols-2 gap-2.5 max-[360px]:grid-cols-1">
          <article className="memo-card bg-card/86 p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="muted-label">HOUSING</p>
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

          <article className="memo-card bg-sky/70 p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="muted-label">FRONTLINE</p>
              <span className="sticker bg-card/80">{todayFrontline.shortName}</span>
            </div>
            <p className="text-xs font-bold text-ink-muted">오늘 {todayFrontline.shortName}</p>
            <h2 className="mt-1 text-base font-bold leading-tight">{todayFrontline.displayName}</h2>
            <p className="mt-4 rounded-[14px] bg-card/70 px-2.5 py-1.5 text-xs font-bold text-ink">
              내일 {tomorrowFrontline.shortName}
            </p>
          </article>
        </div>
      </section>

      <section className="memo-card overflow-hidden bg-card/86">
        <div className="border-b border-[rgb(var(--color-line-soft))] px-3 py-2.5">
          <p className="muted-label">next 7 days</p>
          <h2 className="text-sm font-bold">앞으로 7일</h2>
        </div>
        <div className="divide-y divide-[rgb(var(--color-line-soft))]">
          {upcomingDays.map(({ dateKey, housing, frontline }) => {
            const isToday = dateKey === todayKey;

            return (
              <div
                key={dateKey}
                className={[
                  "grid grid-cols-[4.8rem_1fr_auto] items-center gap-2 px-3 py-2 text-xs",
                  isToday ? "bg-primary-soft/45" : "bg-card/40",
                ].join(" ")}
              >
                <span className={isToday ? "font-bold text-primary" : "font-bold text-ink"}>
                  {formatListDate(dateKey)}
                </span>
                <span
                  className={[
                    "w-fit rounded-full border px-2 py-0.5 font-bold",
                    phasePillClassName[housing.phase],
                  ].join(" ")}
                >
                  {phaseLabel[housing.phase]} {housing.day}/{housing.totalDays}
                </span>
                <span className="rounded-full border border-[rgb(var(--color-line-muted))] bg-card-soft/80 px-2 py-0.5 font-bold text-primary">
                  {frontline.shortName}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="memo-card bg-card/86 p-3">
        <button
          type="button"
          className="flex w-full items-center justify-between gap-3 text-left"
          onClick={() => setIsMonthlyOpen((value) => !value)}
        >
          <span>
            <span className="muted-label block">monthly</span>
            <span className="text-sm font-bold">{monthLabel} 달력 보기</span>
          </span>
          <span className="sticker">{isMonthlyOpen ? "접기" : "펼치기"}</span>
        </button>

        {isMonthlyOpen ? (
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

                return (
                  <div
                    key={dateKey}
                    className={[
                      "min-h-14 rounded-[14px] border px-1.5 py-1.5 text-center",
                      isToday
                        ? "border-primary bg-primary-soft/55"
                        : "border-[rgb(var(--color-line-muted))] bg-card-soft/60",
                    ].join(" ")}
                  >
                    <p className="text-[11px] font-bold text-ink">{format(parseISO(dateKey), "d")}</p>
                    <p className="mt-1 truncate text-xs font-bold text-primary">{label}</p>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}
      </section>

      <section className="memo-card bg-card/80 p-3">
        <p className="muted-label">legend</p>
        <h2 className="text-sm font-bold">범례</h2>
        <div className="mt-2 grid gap-1.5 text-xs">
          {frontlineMaps.map((map) => (
            <div key={map.id} className="grid grid-cols-[2.4rem_1fr] gap-2">
              <span className="font-bold text-primary">{map.shortName}</span>
              <span className="text-ink-muted">{map.displayName}</span>
            </div>
          ))}
        </div>
        <p className="mt-2 text-[11px] text-ink-muted">
          {frontlineRotation.seedDate} 봉인된 바위섬 기준 8일 패턴
        </p>
        <p className="mt-1 text-[11px] text-ink-muted">
          점검이나 패치로 실제 일정이 달라질 수 있어요.
        </p>
      </section>
    </div>
  );
};
