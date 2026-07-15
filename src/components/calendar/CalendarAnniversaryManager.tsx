import { FormEvent, useEffect, useMemo, useState } from "react";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import { getDdayLabel } from "../../domain/dday/getDdayLabel";
import {
  sortAnniversaries,
  validateAnniversaryDraft,
} from "../../domain/dday/anniversaryManagement";
import { useCharacterStore } from "../../stores/useCharacterStore";
import { useDdayStore } from "../../stores/useDdayStore";
import { useConfirmDialog } from "../common/ConfirmDialog";
import { AnniversaryDateField } from "../common/AnniversaryDateField";

const emptyEvents = [] as const;
const emptyErrors = { title: "", date: "" };

export const CalendarAnniversaryManager = () => {
  const characterId = useCharacterStore((state) => state.activeCharacterId);
  const events = useDdayStore((state) => state.eventsByCharacter[characterId] ?? emptyEvents);
  const addEvent = useDdayStore((state) => state.addEvent);
  const updateEvent = useDdayStore((state) => state.updateEvent);
  const removeEvent = useDdayStore((state) => state.removeEvent);
  const confirm = useConfirmDialog();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [errors, setErrors] = useState(emptyErrors);
  const sortedEvents = useMemo(() => sortAnniversaries([...events]), [events]);

  const resetDraft = () => {
    setTitle("");
    setDate("");
    setEditingEventId(null);
    setErrors(emptyErrors);
  };

  const closeForm = () => {
    resetDraft();
    setIsFormOpen(false);
  };

  useEffect(() => {
    closeForm();
  }, [characterId]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors = validateAnniversaryDraft(title, date);
    setErrors(nextErrors);
    if (nextErrors.title || nextErrors.date) return;

    if (editingEventId) {
      updateEvent(characterId, editingEventId, { title: title.trim(), date });
    } else {
      addEvent(characterId, { title: title.trim(), date });
    }
    closeForm();
  };

  const startEdit = (eventId: string, eventTitle: string, eventDate: string) => {
    setTitle(eventTitle);
    setDate(eventDate);
    setEditingEventId(eventId);
    setErrors(emptyErrors);
    setIsFormOpen(true);
  };

  const handleRemove = async (eventId: string, name: string) => {
    const confirmed = await confirm({
      title: `${name} 기념일을 삭제할까요?`,
      description: "홈 화면의 기념일에서도 함께 사라집니다.",
      confirmLabel: "삭제",
      tone: "danger",
    });
    if (confirmed) removeEvent(characterId, eventId);
  };

  return (
    <section className="calendar-panel p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="muted-label">기념일</p>
          <h2 className="mt-1 text-base font-black">기념일 관리</h2>
        </div>
        <button
          type="button"
          className="secondary-button min-h-11 gap-1.5"
          onClick={() => (isFormOpen ? closeForm() : setIsFormOpen(true))}
        >
          {isFormOpen ? <X aria-hidden size={15} /> : <Plus aria-hidden size={15} />}
          {isFormOpen ? "닫기" : "추가"}
        </button>
      </div>

      {isFormOpen ? (
        <form onSubmit={handleSubmit} className="mt-3 grid gap-2">
          <label className="text-xs font-bold">
            기념일 이름
            <input
              className="field mt-1 min-h-11"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              autoComplete="off"
              placeholder="예: 언약일…"
            />
          </label>
          {errors.title ? <p className="text-xs text-[rgb(var(--color-danger))]" aria-live="polite">{errors.title}</p> : null}
          <label className="text-xs font-bold">
            날짜
            <AnniversaryDateField
              className="field mt-1 min-h-11"
              ariaLabel="기념일 날짜"
              value={date}
              onChange={setDate}
            />
          </label>
          {errors.date ? <p className="text-xs text-[rgb(var(--color-danger))]" aria-live="polite">{errors.date}</p> : null}
          <div className="flex gap-2">
            <button className="primary-button min-h-11" type="submit">
              {editingEventId ? "수정 저장" : "기념일 저장"}
            </button>
            <button className="secondary-button min-h-11" type="button" onClick={closeForm}>취소</button>
          </div>
        </form>
      ) : null}

      <div className="mt-3 space-y-2">
        {sortedEvents.length ? sortedEvents.map((event) => (
          <div key={event.id} className="flex min-h-14 items-center gap-3 rounded-[14px] bg-card-soft px-3 py-2">
            <span className="rounded-full bg-card px-2.5 py-1 text-xs font-black text-primary">{getDdayLabel(event.date)}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold">{event.title}</p>
              <p className="text-xs text-ink-muted">{event.date.split("-").join(".")}</p>
            </div>
            <div className="flex shrink-0 items-center">
              <button
                type="button"
                className="grid h-11 w-11 place-items-center rounded-full text-primary transition hover:bg-primary-soft active:scale-95"
                aria-label={`${event.title} 기념일 수정`}
                onClick={() => startEdit(event.id, event.title, event.date)}
              >
                <Pencil aria-hidden size={16} />
              </button>
              <button
                type="button"
                className="grid h-11 w-11 place-items-center rounded-full text-[rgb(var(--color-danger))] transition hover:bg-[rgb(var(--color-danger)/0.08)] active:scale-95"
                aria-label={`${event.title} 기념일 삭제`}
                onClick={() => handleRemove(event.id, event.title)}
              >
                <Trash2 aria-hidden size={16} />
              </button>
            </div>
          </div>
        )) : (
          <div className="rounded-[14px] border border-dashed border-[rgb(var(--color-line-soft))] bg-card-soft/50 p-4 text-center">
            <p className="text-sm font-bold text-ink-muted">등록된 기념일이 없습니다.</p>
            <button type="button" className="mt-2 min-h-11 text-xs font-black text-primary" onClick={() => setIsFormOpen(true)}>기념일 추가</button>
          </div>
        )}
      </div>
    </section>
  );
};
