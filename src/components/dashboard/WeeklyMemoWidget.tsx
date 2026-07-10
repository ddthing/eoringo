import { FormEvent, useState } from "react";
import { Check, Pencil, X } from "lucide-react";
import { useWeeklyMemoStore } from "../../stores/useWeeklyMemoStore";
import { useCharacterStore } from "../../stores/useCharacterStore";

export const WeeklyMemoWidget = () => {
  const activeCharacterId = useCharacterStore((state) => state.activeCharacterId);
  const memo = useWeeklyMemoStore((state) => state.memosByCharacter[activeCharacterId] ?? "");
  const setMemo = useWeeklyMemoStore((state) => state.setMemo);
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(memo);
  const memoLines = memo
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 5);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMemo(activeCharacterId, draft.trim());
    setIsEditing(false);
  };

  const openEditor = () => {
    setDraft(memo);
    setIsEditing(true);
  };

  return (
    <section className="home-panel p-4 sm:p-5">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="muted-label">이번 주</p>
          <h2 className="text-base font-black text-ink">이번 주 메모</h2>
        </div>
        {isEditing ? (
          <button
            type="button"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-[rgb(var(--color-line-muted))] bg-card-soft/80 text-ink-muted"
            onClick={() => setIsEditing(false)}
            aria-label="메모 편집 닫기"
            title="닫기"
          >
            <X aria-hidden size={15} />
          </button>
        ) : (
          <button
            type="button"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-[rgb(var(--color-line-muted))] bg-card-soft/80 text-primary"
            onClick={openEditor}
            aria-label="메모 편집"
            title="편집"
          >
            <Pencil aria-hidden size={15} />
          </button>
        )}
      </div>

      {isEditing ? (
        <form onSubmit={handleSubmit} className="space-y-2">
          <textarea
            className="field min-h-28 resize-none leading-relaxed"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="이번 주 목표를 적어보세요."
          />
          <button type="submit" className="primary-button gap-1.5">
            <Check aria-hidden size={15} />
            저장
          </button>
        </form>
      ) : memoLines.length > 0 ? (
        <div className="space-y-1.5">
          {memoLines.map((line, index) => (
            <p key={`${line}-${index}`} className="text-sm font-bold leading-relaxed text-ink">
              - {line}
            </p>
          ))}
        </div>
      ) : (
        <p className="rounded-[12px] border border-dashed border-[rgb(var(--color-line-soft))] bg-card-soft/56 p-3 text-sm font-bold text-ink-muted">
          이번 주 목표를 적어보세요.
        </p>
      )}
    </section>
  );
};
