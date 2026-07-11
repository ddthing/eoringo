import { FormEvent, useState } from "react";
import { getDaysFromTodayKst } from "../../lib/date";
import { getDdayLabel } from "../../domain/dday/getDdayLabel";
import { useDdayStore } from "../../stores/useDdayStore";
import { useCharacterStore } from "../../stores/useCharacterStore";
import { CalendarDays, Plus, X } from "lucide-react";

const formatDisplayDate = (dateKey: string) => dateKey.split("-").join(".");
const emptyEvents = [] as const;

export const UpcomingAnniversaryWidget = () => {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const activeCharacterId = useCharacterStore((state) => state.activeCharacterId);
  const events = useDdayStore((state) => state.eventsByCharacter[activeCharacterId] ?? emptyEvents);
  const addEvent = useDdayStore((state) => state.addEvent);
  const upcomingEvents = [...events]
    .sort((a, b) => {
      const daysA = Math.abs(getDaysFromTodayKst(a.date));
      const daysB = Math.abs(getDaysFromTodayKst(b.date));

      return daysA === daysB ? a.date.localeCompare(b.date) : daysA - daysB;
    })
    .slice(0, 3);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!title.trim() || !date) return;

    addEvent(activeCharacterId, { title: title.trim(), date });
    setTitle("");
    setDate("");
    setIsFormOpen(false);
  };

  return (
    <section className="home-panel p-4 min-[420px]:p-[18px] md:p-5">
      <div className="mb-3.5 flex items-start justify-between gap-3">
        <div>
          <p className="muted-label">기념일</p>
          <h2 className="home-heading mt-1 text-base font-black tracking-[-0.02em] text-ink">기념일</h2>
        </div>
        <button
          type="button"
          className="secondary-button home-touch-target gap-1.5"
          onClick={() => setIsFormOpen((current) => !current)}
          aria-expanded={isFormOpen}
        >
          {isFormOpen ? <X aria-hidden size={14} /> : <Plus aria-hidden size={14} />}
          {isFormOpen ? "닫기" : "기록"}
        </button>
      </div>
      {isFormOpen ? (
        <form onSubmit={handleSubmit} className="mb-3 grid gap-2 rounded-[14px] bg-card-soft/55 p-3">
          <input
            className="field"
            name="home-anniversary-title"
            aria-label="기념일 이름"
            autoComplete="off"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="기념일 이름"
          />
          <input
            className="field"
            type="date"
            name="home-anniversary-date"
            aria-label="기념일 날짜"
            value={date}
            onChange={(event) => setDate(event.target.value)}
          />
          <button type="submit" className="primary-button w-fit" disabled={!title.trim() || !date}>
            추가
          </button>
        </form>
      ) : null}
      {upcomingEvents.length === 0 ? (
        <div className="home-empty-state min-h-20">
          <CalendarDays aria-hidden size={17} />
          <p>다가오는 기념일이 없습니다.</p>
        </div>
      ) : (
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
      )}
    </section>
  );
};
