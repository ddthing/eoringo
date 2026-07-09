import { FormEvent, useState } from "react";
import { Edit3, Star, Trash2, X } from "lucide-react";
import { DEFAULT_KOREAN_SERVER, KOREAN_FF14_SERVERS } from "../../data/servers";
import { deleteCharacterImage } from "../../lib/imageStorage";
import { useCharacterStore } from "../../stores/useCharacterStore";
import type { Character } from "../../types";
import { useConfirmDialog } from "../common/ConfirmDialog";
import { CharacterAvatar } from "./CharacterAvatar";
import { CharacterImagePicker } from "./CharacterImagePicker";

type CharacterSwitcherProps = {
  compact?: boolean;
  showManager?: boolean;
};

type CharacterDraft = {
  name: string;
  server: string;
  isMain: boolean;
  profileImageId?: string;
};

const emptyDraft: CharacterDraft = {
  name: "",
  server: DEFAULT_KOREAN_SERVER,
  isMain: false,
};

export const CharacterSwitcher = ({
  compact = false,
  showManager = false,
}: CharacterSwitcherProps) => {
  const characters = useCharacterStore((state) => state.characters);
  const activeCharacterId = useCharacterStore((state) => state.activeCharacterId);
  const addCharacter = useCharacterStore((state) => state.addCharacter);
  const removeCharacter = useCharacterStore((state) => state.removeCharacter);
  const setActiveCharacter = useCharacterStore((state) => state.setActiveCharacter);
  const updateCharacter = useCharacterStore((state) => state.updateCharacter);
  const confirm = useConfirmDialog();
  const [draft, setDraft] = useState<CharacterDraft>(emptyDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const activeCharacter =
    characters.find((character) => character.id === activeCharacterId) ?? characters[0];

  const resetForm = () => {
    setDraft(emptyDraft);
    setEditingId(null);
  };

  const startEdit = (character: Character) => {
    setDraft({
      name: character.name,
      server: character.server || DEFAULT_KOREAN_SERVER,
      isMain: character.isMain,
      profileImageId: character.profileImageId,
    });
    setEditingId(character.id);
    setIsFormOpen(true);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!draft.name.trim()) {
      return;
    }

    if (editingId) {
      updateCharacter(editingId, {
        name: draft.name.trim(),
        server: draft.server || DEFAULT_KOREAN_SERVER,
        isMain: draft.isMain,
        profileImageId: draft.profileImageId,
      });
    } else {
      addCharacter({
        name: draft.name.trim(),
        server: draft.server || DEFAULT_KOREAN_SERVER,
        isMain: draft.isMain || characters.length === 0,
        profileImageId: draft.profileImageId,
      });
    }

    resetForm();
    setIsFormOpen(false);
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

    removeCharacter(character.id);
  };

  return (
    <section className={compact ? "memo-card p-2.5" : "memo-card p-3"}>
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <CharacterAvatar
            imageId={activeCharacter?.profileImageId}
            name={activeCharacter?.name ?? "나의 모험가"}
            size="sm"
          />
          <div className="min-w-0">
            <p className="muted-label">현재</p>
            <h2 className="truncate text-sm font-bold">{activeCharacter?.name ?? "나의 모험가"}</h2>
            <p className="text-xs text-ink-muted">
              {activeCharacter?.server ?? DEFAULT_KOREAN_SERVER}
            </p>
          </div>
        </div>
        {showManager ? (
          <button
            type="button"
            className="secondary-button"
            onClick={() => {
              if (isFormOpen) {
                resetForm();
              }
              setIsFormOpen((value) => !value);
            }}
          >
            {isFormOpen ? "닫기" : "+ 캐릭터 추가"}
          </button>
        ) : null}
      </div>
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {characters.map((character) => (
          <button
            key={character.id}
            type="button"
            onClick={() => setActiveCharacter(character.id)}
            className={[
              "flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-1 text-xs font-bold transition",
              character.id === activeCharacterId
                ? "border-[rgb(var(--color-line-soft))] bg-primary-soft text-primary"
                : "border-[rgb(var(--color-line-muted))] bg-card/70 text-ink-muted",
            ].join(" ")}
          >
            <CharacterAvatar imageId={character.profileImageId} name={character.name} size="sm" />
            {character.isMain ? <Star aria-hidden size={12} fill="currentColor" /> : null}
            <span>{character.name}</span>
          </button>
        ))}
      </div>
      {showManager ? (
        <div className="mt-3 space-y-3">
          {isFormOpen ? (
            <form onSubmit={handleSubmit} className="grid gap-2 rounded-[20px] border border-[rgb(var(--color-line-soft))] bg-card-soft/70 p-3">
              <CharacterImagePicker
                imageId={draft.profileImageId}
                characterName={draft.name}
                onChange={(profileImageId) =>
                  setDraft((value) => ({ ...value, profileImageId }))
                }
              />
              <input
                className="field"
                name="character-name"
                aria-label="캐릭터 이름"
                autoComplete="off"
                value={draft.name}
                onChange={(event) =>
                  setDraft((value) => ({ ...value, name: event.target.value }))
                }
                placeholder="닉네임"
              />
              <select
                className="field"
                name="character-server"
                aria-label="서버"
                value={draft.server}
                onChange={(event) =>
                  setDraft((value) => ({ ...value, server: event.target.value }))
                }
              >
                {KOREAN_FF14_SERVERS.map((server) => (
                  <option key={server} value={server}>
                    {server}
                  </option>
                ))}
              </select>
              <label className="flex items-center gap-2 text-xs font-medium text-ink-muted">
                <input
                  type="checkbox"
                  checked={draft.isMain}
                  onChange={(event) =>
                    setDraft((value) => ({ ...value, isMain: event.target.checked }))
                  }
                />
                대표 캐릭터로 설정
              </label>
              <div className="flex gap-2">
                <button type="submit" className="primary-button">
                  저장
                </button>
                <button type="button" className="secondary-button" onClick={resetForm}>
                  취소
                </button>
              </div>
            </form>
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
                    <p className="text-xs text-ink-muted">
                      {character.server}
                      {character.isMain ? " · 대표" : ""}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    className="secondary-button px-2"
                    onClick={() => startEdit(character)}
                    aria-label={`${character.name} 수정`}
                  >
                    <Edit3 aria-hidden size={13} />
                  </button>
                  <button
                    type="button"
                    className="secondary-button px-2 text-primary"
                    onClick={() => updateCharacter(character.id, { isMain: true })}
                    aria-label={`${character.name} 대표 설정`}
                  >
                    <Star aria-hidden size={13} />
                  </button>
                  <button
                    type="button"
                    className="secondary-button px-2 text-[rgb(var(--color-danger))]"
                    onClick={() => handleRemoveCharacter(character)}
                    aria-label={`${character.name} 삭제`}
                  >
                    <Trash2 aria-hidden size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
};
