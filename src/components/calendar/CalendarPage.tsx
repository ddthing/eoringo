import {
  eachDayOfInterval,
  endOfMonth,
  format,
  getDay,
  parseISO,
  startOfMonth,
} from "date-fns";
import { useMemo, useState } from "react";
import { CalendarDays, ChevronDown } from "lucide-react";
import { frontlineMaps } from "../../data/frontline";
import { getDdayLabel } from "../../domain/dday/getDdayLabel";
import {
  getAnniversaryEventsByDate,
  getUpcomingAnniversaries,
} from "../../domain/dday/anniversaryManagement";
import { getFrontlineByDateKey } from "../../domain/frontline/getTodayFrontline";
import { getHousingPhase } from "../../domain/housing/getHousingPhase";
import { addDaysToDateKey, getKstDateKey } from "../../lib/date";
import { useCharacterStore } from "../../stores/useCharacterStore";
import { useDdayStore } from "../../stores/useDdayStore";
import type { FrontlineMap, HousingPhaseResult } from "../../types";
import { HousingListingsMemo } from "./HousingListingsMemo";
import { CalendarAnniversaryManager } from "./CalendarAnniversaryManager";

const weekdays = ["일", "월", "화", "수", "목", "금", "토"];

const phaseLabel: Record<HousingPhaseResult["phase"], string> = {
  entry: "신청",
  result: "발표",
};

const phasePillClassName: Record<HousingPhaseResult["phase"], string> = {
  entry: "calendar-tone-housing-entry",
  result: "calendar-tone-housing-result",
};

const frontlineCellClassName: Record<FrontlineMap["id"], string> = {
  "seal-rock": "calendar-tone-frontline-seal-rock",
  "borderland-ruins": "calendar-tone-frontline-borderland-ruins",
  onsal: "calendar-tone-frontline-onsal",
  "worqor-chitte": "calendar-tone-frontline-worqor-chitte",
  "fields-of-glory": "calendar-tone-frontline-fields-of-glory",
};

const housingCellClassName: Record<HousingPhaseResult["phase"], string> = {
  entry: "calendar-tone-housing-entry",
  result: "calendar-tone-housing-result",
};

const housingLegendItems = [
  {
    id: "entry",
    shortName: phaseLabel.entry,
    displayName: "신청 기간",
    className: housingCellClassName.entry,
  },
  {
    id: "result",
    shortName: phaseLabel.result,
    displayName: "발표 기간",
    className: housingCellClassName.result,
  },
] as const;

const toKstDate = (dateKey: string) => new Date(`${dateKey}T00:00:00+09:00`);

const formatMonthDay = (dateKey: string) => format(parseISO(dateKey), "MM.dd");
const formatDisplayDate = (dateKey: string) => dateKey.split("-").join(".");
const emptyEvents = [] as const;

const getNextPhaseCopy = (phase: HousingPhaseResult) => {
  const nextLabel = phase.phase === "entry" ? "발표" : "신청";

  return `다음 ${nextLabel} ${formatMonthDay(phase.nextPhaseDate)}`;
};

export const CalendarPage = () => {
  const [monthlyMode, setMonthlyMode] = useState<"frontline" | "housing">("frontline");
  const [legendOpen, setLegendOpen] = useState(false);
  const activeCharacterId = useCharacterStore((state) => state.activeCharacterId);
  const events = useDdayStore((state) => state.eventsByCharacter[activeCharacterId] ?? emptyEvents);
  const todayKey = getKstDateKey();
  const todayHousing = getHousingPhase();
  const todayFrontline = getFrontlineByDateKey(todayKey);
  const tomorrowFrontline = getFrontlineByDateKey(addDaysToDateKey(todayKey, 1));
  const anniversaryEventsByDate = useMemo(() => getAnniversaryEventsByDate([...events]), [events]);
  const upcomingAnniversaries = useMemo(() => getUpcomingAnniversaries([...events]), [events]);
  const legendItems =
    monthlyMode === "frontline"
      ? frontlineMaps.map((map) => ({
          id: map.id,
          shortName: map.shortName,
          displayName: map.displayName,
          className: frontlineCellClassName[map.id],
        }))
      : housingLegendItems;

  const monthWeeks = useMemo(() => {
    const monthStart = startOfMonth(parseISO(todayKey));
    const monthEnd = endOfMonth(monthStart);
    const leadingBlankCount = getDay(monthStart);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd }).map((date) =>
      format(date, "yyyy-MM-dd"),
    );
    const cells = [...Array<string | null>(leadingBlankCount).fill(null), ...days];

    while (cells.length % 7 !== 0) {
      cells.push(null);
    }

    return Array.from({ length: cells.length / 7 }, (_, weekIndex) =>
      cells.slice(weekIndex * 7, weekIndex * 7 + 7),
    );
  }, [todayKey]);

  const monthLabel = format(parseISO(todayKey), "M월");
  return (
    <div className="space-y-5">
      <div className="ui-page-heading">
        <span className="ui-page-icon" aria-hidden>
          <CalendarDays size={19} strokeWidth={2.2} />
        </span>
        <div className="ui-page-heading-copy">
          <h1 className="text-xl font-extrabold text-ink">전장 / 하우징 달력</h1>
        </div>
      </div>

      <section className="space-y-2.5">
        <div className="px-1">
          <h2 className="text-sm font-bold text-ink">오늘 요약</h2>
        </div>
        <div className="grid grid-cols-2 gap-2.5 max-[520px]:grid-cols-1">
          <article className="calendar-panel p-4 transition duration-200 hover:border-primary/30">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="muted-label">전장</p>
              <span className="sticker bg-card/80">{todayFrontline.shortName}</span>
            </div>
            <h2 className="text-xl font-extrabold leading-tight text-ink">
              {todayFrontline.displayName}
            </h2>
            <p className="mt-3 grid gap-1 rounded-ui-sm bg-card/70 px-2.5 py-2 text-xs font-bold text-ink">
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
            <p className="mt-2 rounded-ui-sm bg-primary-soft/60 px-2.5 py-1.5 text-xs font-bold text-primary">
              {getNextPhaseCopy(todayHousing)}
            </p>
          </article>
        </div>
      </section>

      {upcomingAnniversaries.length ? (
        <section className="calendar-panel p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="muted-label block">내 일정</span>
              <h2 className="mt-1 text-base font-bold text-ink">다가오는 기념일</h2>
            </div>
            <span className="sticker bg-card-soft">최대 3개</span>
          </div>
          <div className="mt-3 grid gap-1.5">
            {upcomingAnniversaries.map((event) => (
              <div
                key={event.id}
                className="grid min-h-12 grid-cols-[4.5rem_minmax(0,1fr)] items-center gap-2 rounded-ui-md border border-[rgb(var(--color-line-muted))] bg-card-soft/62 p-2"
              >
                <span className="rounded-full bg-card px-2.5 py-1 text-center text-xs font-bold tabular-nums text-primary">
                  {getDdayLabel(event.date)}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-ink">{event.title}</p>
                  <p className="text-[11px] font-medium tabular-nums text-ink-muted">
                    {formatDisplayDate(event.date)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="calendar-panel p-4">
        <div className="flex items-end justify-between gap-3">
          <div>
            <span className="muted-label block">게임 일정</span>
            <h2 className="mt-1 text-base font-bold text-ink">{monthLabel} 달력</h2>
          </div>
          <span className="text-[11px] font-bold text-ink-muted">한국 시간(KST) 기준</span>
        </div>

        <div className="mt-3 space-y-3">
          <div className="grid grid-cols-2 gap-1.5 rounded-ui-md bg-card-soft/70 p-1">
            <button
              type="button"
              className={[
                "min-h-11 rounded-ui-sm px-3 py-1.5 text-xs font-bold transition",
                monthlyMode === "frontline" ? "bg-card text-primary shadow-soft" : "text-ink-muted",
              ].join(" ")}
              onClick={() => setMonthlyMode("frontline")}
              aria-pressed={monthlyMode === "frontline"}
            >
              전장 월간
            </button>
            <button
              type="button"
              className={[
                "min-h-11 rounded-ui-sm px-3 py-1.5 text-xs font-bold transition",
                monthlyMode === "housing" ? "bg-card text-primary shadow-soft" : "text-ink-muted",
              ].join(" ")}
              onClick={() => setMonthlyMode("housing")}
              aria-pressed={monthlyMode === "housing"}
            >
              하우징 월간
            </button>
          </div>

          <table className="w-full table-fixed border-separate border-spacing-1 rounded-ui-xs bg-card-soft/80 px-1 py-2 text-center text-[10px] font-bold text-ink-muted">
            <caption className="sr-only">
              {monthLabel} {monthlyMode === "frontline" ? "전장" : "하우징"} 월간 달력
            </caption>
            <thead>
              <tr>
                {weekdays.map((weekday, index) => (
                  <th
                    key={weekday}
                    scope="col"
                    abbr={weekday + "요일"}
                    aria-label={weekday + "요일"}
                    className={[
                      "h-7 font-bold",
                      index === 0
                        ? "text-[rgb(var(--color-danger))]"
                        : index === 6
                          ? "text-primary"
                          : "",
                    ].join(" ")}
                  >
                    {weekday}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {monthWeeks.map((week, weekIndex) => (
                <tr key={"week-" + weekIndex}>
                  {week.map((dateKey, dayIndex) => {
                    if (!dateKey) {
                      return (
                        <td
                          key={"blank-" + weekIndex + "-" + dayIndex}
                          className="h-14 rounded-ui-xs"
                          aria-hidden="true"
                        />
                      );
                    }

                    const isToday = dateKey === todayKey;
                    const frontline = getFrontlineByDateKey(dateKey);
                    const housing = getHousingPhase(toKstDate(dateKey));
                    const dateAnniversaries = anniversaryEventsByDate[dateKey] ?? [];
                    const label =
                      monthlyMode === "frontline" ? frontline.shortName : phaseLabel[housing.phase];
                    const dateLabel =
                      format(parseISO(dateKey), "M월 d일") +
                      " " +
                      (monthlyMode === "frontline"
                        ? frontline.displayName
                        : phaseLabel[housing.phase]) +
                      (dateAnniversaries.length
                        ? " · " + dateAnniversaries.map((event) => event.title).join(", ")
                        : "");
                    const toneClassName = isToday
                      ? "border-primary bg-card text-ink ring-2 ring-primary/35"
                      : monthlyMode === "frontline"
                        ? frontlineCellClassName[frontline.id]
                        : housingCellClassName[housing.phase];

                    return (
                      <td
                        key={dateKey}
                        className="p-0 align-top"
                        aria-current={isToday ? "date" : undefined}
                        aria-label={dateLabel}
                      >
                        <div
                          className={[
                            "calendar-cell min-h-14 rounded-ui-xs border px-1 py-1.5 text-center transition duration-200 hover:-translate-y-0.5 hover:shadow-sm",
                            toneClassName,
                          ].join(" ")}
                          data-calendar-mode={monthlyMode}
                          data-calendar-tone={monthlyMode === "frontline" ? frontline.id : housing.phase}
                          data-today={isToday ? "true" : undefined}
                          title={dateLabel}
                        >
                          <p className="text-[11px] font-bold text-ink">
                            {format(parseISO(dateKey), "d")}
                          </p>
                          <p className="mt-1 truncate text-xs font-bold">{label}</p>
                          {dateAnniversaries.length ? (
                            <span className="mt-1 inline-flex max-w-full items-center justify-center gap-1 truncate text-[10px] font-extrabold text-primary">
                              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
                              {dateAnniversaries.length > 1 ? dateAnniversaries.length + "개" : "기념"}
                            </span>
                          ) : null}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <CalendarAnniversaryManager />

      <HousingListingsMemo />

      <section className="calendar-panel overflow-hidden px-4 py-2">
        <button
          type="button"
          className="flex min-h-11 w-full items-center justify-between gap-3 text-left text-sm font-bold text-ink"
          onClick={() => setLegendOpen((current) => !current)}
          aria-expanded={legendOpen}
          aria-controls="calendar-legend-list"
        >
          <span>범례</span>
          <ChevronDown aria-hidden size={17} className={`text-primary transition-transform duration-200 ${legendOpen ? "rotate-180" : ""}`} />
        </button>
        {legendOpen ? (
          <div
            id="calendar-legend-list"
            className="calendar-accordion mt-1 grid gap-2 border-t border-[rgb(var(--color-line-muted))] py-3 text-xs"
            role="region"
            aria-label={monthlyMode === "frontline" ? "전장 월간 범례" : "하우징 월간 범례"}
          >
            {legendItems.map((item) => (
              <div key={item.id} className="grid min-w-0 grid-cols-[2.4rem_minmax(0,1fr)] gap-2">
                <span
                  className={[
                    "w-fit rounded-full border px-2 py-0.5 text-[11px] font-bold",
                    item.className,
                  ].join(" ")}
                >
                  {item.shortName}
                </span>
                <span className="min-w-0 text-ink-muted">{item.displayName}</span>
              </div>
            ))}
          </div>
        ) : null}
      </section>
    </div>
  );
};
