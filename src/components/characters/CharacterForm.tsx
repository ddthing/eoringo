import { type FormEvent, useState } from "react";
import { DEFAULT_KOREAN_SERVER, KOREAN_FF14_SERVERS } from "../../data/servers";
import { CharacterImagePicker } from "./CharacterImagePicker";

export type CharacterFormValues = {
  name: string;
  server: string;
  isMain: boolean;
  profileImageId?: string;
};

export const emptyCharacterFormValues: CharacterFormValues = {
  name: "",
  server: DEFAULT_KOREAN_SERVER,
  isMain: false,
};

type CharacterFormProps = {
  initialValues?: CharacterFormValues;
  showMainOption?: boolean;
  submitLabel?: string;
  onSubmit: (values: CharacterFormValues) => void;
  onCancel: () => void;
};

export const CharacterForm = ({
  initialValues = emptyCharacterFormValues,
  showMainOption = true,
  submitLabel = "저장",
  onSubmit,
  onCancel,
}: CharacterFormProps) => {
  const [draft, setDraft] = useState<CharacterFormValues>(() => initialValues);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!draft.name.trim()) {
      return;
    }

    onSubmit({
      ...draft,
      name: draft.name.trim(),
      server: draft.server || DEFAULT_KOREAN_SERVER,
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="grid gap-2 rounded-[20px] border border-[rgb(var(--color-line-soft))] bg-card-soft/70 p-3"
    >
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
      {showMainOption ? (
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
      ) : null}
      <div className="flex gap-2">
        <button type="submit" className="primary-button">
          {submitLabel}
        </button>
        <button type="button" className="secondary-button" onClick={onCancel}>
          취소
        </button>
      </div>
    </form>
  );
};
