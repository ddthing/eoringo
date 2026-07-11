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
    <section className="home-panel p-4 min-[420px]:p-[18px] md:p-5">
      <div className="mb-3.5 flex items-start justify-between gap-3">
        <div>
          <p className="muted-label">이번 주</p>
          <h2 className="home-heading mt-1 text-base font-black tracking-[-0.02em] text-ink">이번 주 메모</h2>
        </div>
        {isEditing ? (
          <button
            type="button"
            className="home-icon-button text-ink-muted"
            onClick={() => setIsEditing(false)}
            aria-label="메모 편집 닫기"
            title="닫기"
          >
            <X aria-hidden size={15} />
          </button>
        ) : (
          <button
            type="button"
            className="home-icon-button text-primary"
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
            name="weekly-memo"
            aria-label="이번 주 메모"
            autoComplete="off"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="이번 주 목표를 적어보세요…"
          />
          <button type="submit" className="primary-button home-touch-target gap-1.5">
            <Check aria-hidden size={15} />
            저장
          </button>
        </form>
      ) : memoLines.length > 0 ? (
        <div className="space-y-1.5 rounded-[14px] bg-card-soft/45 px-3 py-2.5">
          {memoLines.map((line, index) => (
            <p key={`${line}-${index}`} className="text-sm font-bold leading-relaxed text-ink">
              - {line}
            </p>
          ))}
        </div>
      ) : (
        <div className="home-empty-state min-h-20">
          <Pencil aria-hidden size={16} />
          <p>이번 주 목표를 적어보세요.</p>
        </div>
      )}
    </section>
  );
};
