import { getDaysFromTodayKst } from "../../lib/date";
import { getDdayLabel } from "../../domain/dday/getDdayLabel";
import { useDdayStore } from "../../stores/useDdayStore";
import { useCharacterStore } from "../../stores/useCharacterStore";
import { CalendarDays } from "lucide-react";

const formatDisplayDate = (dateKey: string) => dateKey.split("-").join(".");
const emptyEvents = [] as const;

export const UpcomingAnniversaryWidget = () => {
  const activeCharacterId = useCharacterStore((state) => state.activeCharacterId);
  const events = useDdayStore((state) => state.eventsByCharacter[activeCharacterId] ?? emptyEvents);
  const upcomingEvents = [...events]
    .sort((a, b) => {
      const daysA = Math.abs(getDaysFromTodayKst(a.date));
      const daysB = Math.abs(getDaysFromTodayKst(b.date));

      return daysA === daysB ? a.date.localeCompare(b.date) : daysA - daysB;
    })
    .slice(0, 3);

  if (upcomingEvents.length === 0) {
    return (
      <section className="home-panel p-4 min-[420px]:p-[18px] md:p-5">
        <div className="mb-3.5">
          <p className="muted-label">기념일</p>
          <h2 className="home-heading mt-1 text-base font-black tracking-[-0.02em] text-ink">기념일</h2>
        </div>
        <div className="home-empty-state min-h-20">
          <CalendarDays aria-hidden size={17} />
          <p>다가오는 기념일이 없습니다.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="home-panel p-4 min-[420px]:p-[18px] md:p-5">
      <div className="mb-3.5">
        <p className="muted-label">기념일</p>
        <h2 className="home-heading mt-1 text-base font-black tracking-[-0.02em] text-ink">기념일</h2>
      </div>
      <div className="grid gap-1.5">
        {upcomingEvents.map((event) => (
          <div
            key={event.id}
            className="grid min-h-12 grid-cols-[4.5rem_1fr] items-center gap-2 rounded-[14px] border border-[rgb(var(--color-line-muted))] bg-card-soft/62 p-2"
          >
            <span className="rounded-full bg-card px-2.5 py-1 text-center text-xs font-black tabular-nums text-primary">
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
  );
};
