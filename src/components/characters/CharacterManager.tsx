import { useState } from "react";
import { Edit3, Star, Trash2 } from "lucide-react";
import { DEFAULT_KOREAN_SERVER } from "../../data/servers";
import { deleteCharacterImage } from "../../lib/imageStorage";
import { useCharacterStore } from "../../stores/useCharacterStore";
import { useTaskStore } from "../../stores/useTaskStore";
import { useWeeklyMemoStore } from "../../stores/useWeeklyMemoStore";
import { useDdayStore } from "../../stores/useDdayStore";
import type { Character } from "../../types";
import { useConfirmDialog } from "../common/ConfirmDialog";
import { CharacterAvatar } from "./CharacterAvatar";
import { CharacterForm, type CharacterFormValues } from "./CharacterForm";
import { CharacterSwitcher } from "./CharacterSwitcher";

export const CharacterManager = () => {
  const characters = useCharacterStore((state) => state.characters);
  const addCharacter = useCharacterStore((state) => state.addCharacter);
  const removeCharacter = useCharacterStore((state) => state.removeCharacter);
  const updateCharacter = useCharacterStore((state) => state.updateCharacter);
  const setMainCharacter = useCharacterStore((state) => state.setMainCharacter);
  const removeTaskData = useTaskStore((state) => state.removeCharacterData);
  const removeMemoData = useWeeklyMemoStore((state) => state.removeCharacterData);
  const removeDdayData = useDdayStore((state) => state.removeCharacterData);
  const confirm = useConfirmDialog();
  const [isAdding, setIsAdding] = useState(false);
  const [editingCharacter, setEditingCharacter] = useState<Character | null>(null);

  const closeForm = () => {
    setIsAdding(false);
    setEditingCharacter(null);
  };

  const handleSave = (values: CharacterFormValues) => {
    if (editingCharacter) {
      updateCharacter(editingCharacter.id, values);
    } else {
      addCharacter({
        ...values,
        isMain: values.isMain || characters.length === 0,
      });
    }

    closeForm();
  };

  const handleRemoveCharacter = async (character: Character) => {
    const confirmed = await confirm({
      title: `${character.name} 캐릭터를 삭제할까요?`,
      description: "캐릭터와 연결된 사진, 캐릭터별 체크 상태가 함께 정리됩니다.",
      confirmLabel: "삭제",
      tone: "danger",
    });

    if (!confirmed) {
      return;
    }

    if (character.profileImageId) {
      await deleteCharacterImage(character.profileImageId);
    }

    removeTaskData(character.id);
    removeMemoData(character.id);
    removeDdayData(character.id);
    removeCharacter(character.id);
  };

  const formCharacter = editingCharacter;
  const formInitialValues = formCharacter
    ? {
        name: formCharacter.name,
        server: formCharacter.server || DEFAULT_KOREAN_SERVER,
        isMain: formCharacter.isMain,
        profileImageId: formCharacter.profileImageId,
      }
    : undefined;

  return (
    <section className="card space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="muted-label">characters</p>
          <h2 className="text-lg font-bold">내 캐릭터</h2>
          <p className="mt-1 text-sm text-ink-muted">
            캐릭터를 전환하거나 프로필과 대표 캐릭터를 관리합니다.
          </p>
        </div>
        <button
          type="button"
          className="secondary-button shrink-0"
          onClick={() => {
            if (isAdding) {
              closeForm();
              return;
            }
            setEditingCharacter(null);
            setIsAdding(true);
          }}
        >
          {isAdding ? "닫기" : "+ 캐릭터 추가"}
        </button>
      </div>

      <div className="rounded-[16px] border border-[rgb(var(--color-line-muted))] bg-card-soft/45 p-2.5">
        <CharacterSwitcher embedded compact />
      </div>

      {isAdding || editingCharacter ? (
        <CharacterForm
          key={editingCharacter?.id ?? "new-character"}
          initialValues={formInitialValues}
          submitLabel={editingCharacter ? "수정 저장" : "추가"}
          onSubmit={handleSave}
          onCancel={closeForm}
        />
      ) : null}

      <div className="grid gap-2">
        {characters.map((character) => (
          <div
            key={character.id}
            className="flex items-center justify-between gap-2 rounded-[18px] border border-[rgb(var(--color-line-muted))] bg-card/70 p-2"
          >
            <div className="flex min-w-0 items-center gap-2">
              <CharacterAvatar imageId={character.profileImageId} name={character.name} />
              <div className="min-w-0">
                <p className="truncate text-sm font-bold">{character.name}</p>
                <p className="text-xs text-ink-muted">{character.server}</p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                className="secondary-button h-11 w-11 px-0"
                onClick={() => {
                  setIsAdding(false);
                  setEditingCharacter(character);
                }}
                aria-label={`${character.name} 수정`}
              >
                <Edit3 aria-hidden size={13} />
              </button>
              <button
                type="button"
                className={[
                  "secondary-button h-11 w-11 px-0 disabled:opacity-100",
                  character.isMain ? "text-primary" : "text-ink-muted",
                ].join(" ")}
                onClick={() => setMainCharacter(character.id)}
                aria-label={character.isMain ? `${character.name} 대표 캐릭터` : `${character.name} 대표 설정`}
                title={character.isMain ? "대표 캐릭터" : "대표 캐릭터로 설정"}
                disabled={character.isMain}
              >
                <Star aria-hidden size={13} fill={character.isMain ? "currentColor" : "none"} />
              </button>
              <button
                type="button"
                className="secondary-button h-11 w-11 px-0 text-[rgb(var(--color-danger))]"
                onClick={() => handleRemoveCharacter(character)}
                aria-label={`${character.name} 삭제`}
              >
                <Trash2 aria-hidden size={13} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
