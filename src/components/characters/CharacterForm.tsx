import { type FormEvent, useEffect, useRef, useState } from "react";
import { DEFAULT_KOREAN_SERVER, KOREAN_FF14_SERVERS } from "../../data/servers";
import {
  cancelCharacterImageTransaction,
  commitCharacterImageTransaction,
  createCharacterImageTransaction,
  stageCharacterImage,
} from "../../domain/characters/characterImageTransaction";
import { deleteCharacterImage } from "../../lib/imageStorage";
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
  onSubmit: (values: CharacterFormValues) => void | Promise<void>;
  onCancel: () => void;
};

const cleanupImages = async (imageIds: string[]) => {
  await Promise.allSettled(imageIds.map((imageId) => deleteCharacterImage(imageId)));
};

export const CharacterForm = ({
  initialValues = emptyCharacterFormValues,
  showMainOption = true,
  submitLabel = "저장",
  onSubmit,
  onCancel,
}: CharacterFormProps) => {
  const [draft, setDraft] = useState<CharacterFormValues>(() => initialValues);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const imageTransactionRef = useRef(
    createCharacterImageTransaction(initialValues.profileImageId),
  );

  useEffect(
    () => () => {
      void cleanupImages(imageTransactionRef.current.temporaryImageIds);
    },
    [],
  );

  const handleImageChange = (profileImageId?: string) => {
    const update = stageCharacterImage(imageTransactionRef.current, profileImageId);
    imageTransactionRef.current = update.transaction;
    setDraft((value) => ({ ...value, profileImageId }));
    void cleanupImages(update.cleanupImageIds);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!draft.name.trim() || isFinalizing) {
      return;
    }

    setIsFinalizing(true);
    const previousTransaction = imageTransactionRef.current;
    const committed = commitCharacterImageTransaction(previousTransaction);
    imageTransactionRef.current = committed.transaction;

    try {
      await onSubmit({
        ...draft,
        name: draft.name.trim(),
        server: draft.server || DEFAULT_KOREAN_SERVER,
      });
      await cleanupImages(committed.cleanupImageIds);
    } catch (error) {
      imageTransactionRef.current = previousTransaction;
      throw error;
    } finally {
      setIsFinalizing(false);
    }
  };

  const handleCancel = async () => {
    if (isFinalizing) return;

    setIsFinalizing(true);
    const cancelled = cancelCharacterImageTransaction(imageTransactionRef.current);
    imageTransactionRef.current = cancelled.transaction;
    await cleanupImages(cancelled.cleanupImageIds);
    onCancel();
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="grid gap-2 rounded-[20px] border border-[rgb(var(--color-line-soft))] bg-card-soft/70 p-3"
    >
      <CharacterImagePicker
        imageId={draft.profileImageId}
        characterName={draft.name}
        onChange={handleImageChange}
        disabled={isFinalizing}
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
            className="h-4 w-4 accent-primary"
            checked={draft.isMain}
            onChange={(event) =>
              setDraft((value) => ({ ...value, isMain: event.target.checked }))
            }
          />
          대표 캐릭터로 설정
        </label>
      ) : null}
      <div className="flex gap-2">
        <button type="submit" className="primary-button" disabled={isFinalizing}>
          {submitLabel}
        </button>
        <button
          type="button"
          className="secondary-button"
          onClick={handleCancel}
          disabled={isFinalizing}
        >
          취소
        </button>
      </div>
    </form>
  );
};
