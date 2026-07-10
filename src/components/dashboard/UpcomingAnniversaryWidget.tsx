import { getDaysFromTodayKst } from "../../lib/date";
import { getDdayLabel } from "../../domain/dday/getDdayLabel";
import { useDdayStore } from "../../stores/useDdayStore";
import { useCharacterStore } from "../../stores/useCharacterStore";

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
    return null;
  }

  return (
    <section className="home-panel p-4 sm:p-5">
      <div className="mb-3">
        <p className="muted-label">기념일</p>
        <h2 className="text-base font-black text-ink">기념일</h2>
      </div>
      <div className="grid gap-1.5">
        {upcomingEvents.map((event) => (
          <div
            key={event.id}
            className="grid grid-cols-[4.5rem_1fr] items-center gap-2 rounded-[12px] border border-[rgb(var(--color-line-muted))] bg-card-soft/62 p-2"
          >
            <span className="rounded-full bg-card px-2.5 py-1 text-center text-xs font-black text-primary">
              {getDdayLabel(event.date)}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-ink">{event.title}</p>
              <p className="text-[11px] font-medium text-ink-muted">
                {formatDisplayDate(event.date)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
