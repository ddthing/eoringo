import { FormEvent, useMemo, useState } from "react";
import { Plus, Trash2, X } from "lucide-react";
import { getDdayLabel } from "../../domain/dday/getDdayLabel";
import { useCharacterStore } from "../../stores/useCharacterStore";
import { useDdayStore } from "../../stores/useDdayStore";

export const DdayCard = () => {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const activeCharacterId = useCharacterStore((state) => state.activeCharacterId);
  const characters = useCharacterStore((state) => state.characters);
  const events = useDdayStore((state) => state.events);
  const addEvent = useDdayStore((state) => state.addEvent);
  const removeEvent = useDdayStore((state) => state.removeEvent);
  const characterNameById = useMemo(
    () => Object.fromEntries(characters.map((character) => [character.id, character.name])),
    [characters],
  );

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!title.trim() || !date) {
      return;
    }

    addEvent({ title: title.trim(), date, characterId: activeCharacterId });
    setTitle("");
    setDate("");
    setIsFormOpen(false);
  };

  return (
    <section className="memo-card bg-card/82 p-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div>
          <p className="muted-label">anniversary</p>
          <h2 className="text-sm font-bold">기념일 노트</h2>
        </div>
        <button
          type="button"
          className="secondary-button flex items-center gap-1.5"
          onClick={() => setIsFormOpen((value) => !value)}
        >
          {isFormOpen ? <X aria-hidden size={14} /> : <Plus aria-hidden size={14} />}
          {isFormOpen ? "닫기" : "기록"}
        </button>
      </div>
      {isFormOpen ? (
        <form onSubmit={handleSubmit} className="mb-3 grid gap-2">
          <input
            className="field"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="기념일 이름"
          />
          <input
            className="field"
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
          />
          <button type="submit" className="primary-button w-fit">
            추가
          </button>
        </form>
      ) : null}
      <div className="space-y-1.5">
        {events.length === 0 ? (
          <p className="rounded-[18px] border border-dashed border-[rgb(var(--color-line-soft))] bg-card-soft/55 p-3 text-xs leading-relaxed text-ink-muted">
            아직 등록된 기념일이 없어요. 언약일이나 캐릭터 생일을 살짝 기록해둘까요?
          </p>
        ) : (
          events.map((event) => (
            <div
              key={event.id}
              className="flex items-center justify-between gap-2 rounded-[18px] border border-[rgb(var(--color-line-muted))] bg-lavender/70 p-2"
            >
              <div className="flex min-w-0 items-center gap-2">
                <span className="shrink-0 rounded-full bg-card px-2.5 py-1 text-xs font-bold text-primary">
                  {getDdayLabel(event.date)}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold">{event.title}</p>
                  <p className="text-[11px] text-ink-muted">
                    {event.date.split("-").join(".")}
                    {event.characterId ? ` · ${characterNameById[event.characterId] ?? "캐릭터"}` : ""}
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-ink-muted"
                onClick={() => removeEvent(event.id)}
                aria-label={`${event.title} 삭제`}
                title="삭제"
              >
                <Trash2 aria-hidden size={14} />
              </button>
            </div>
          ))
        )}
      </div>
    </section>
  );
};
