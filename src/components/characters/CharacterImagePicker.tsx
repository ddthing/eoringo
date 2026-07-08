import { ChangeEvent, useRef, useState } from "react";
import { ImagePlus, Trash2 } from "lucide-react";
import { deleteCharacterImage, saveCharacterImage } from "../../lib/imageStorage";
import { CharacterAvatar } from "./CharacterAvatar";

type CharacterImagePickerProps = {
  imageId?: string;
  characterName: string;
  onChange: (imageId?: string) => void;
};

export const CharacterImagePicker = ({
  imageId,
  characterName,
  onChange,
}: CharacterImagePickerProps) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setIsSaving(true);

    try {
      const nextImageId = await saveCharacterImage(file);

      if (imageId) {
        await deleteCharacterImage(imageId);
      }

      onChange(nextImageId);
    } finally {
      setIsSaving(false);
      event.target.value = "";
    }
  };

  const handleRemove = async () => {
    if (imageId) {
      await deleteCharacterImage(imageId);
    }

    onChange(undefined);
  };

  return (
    <div className="flex items-center gap-2.5 rounded-[18px] border border-dashed border-[rgb(var(--color-line-soft))] bg-card/70 p-2">
      <CharacterAvatar imageId={imageId} name={characterName || "나의 모험가"} size="lg" />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-bold text-ink">캐릭터 사진</p>
        <p className="mt-0.5 text-[11px] text-ink-muted">작은 스티커처럼 넣어보세요.</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <button
            type="button"
            className="secondary-button flex items-center gap-1.5"
            onClick={() => inputRef.current?.click()}
            disabled={isSaving}
          >
            <ImagePlus aria-hidden size={14} />
            {isSaving ? "저장 중" : "사진 선택"}
          </button>
          {imageId ? (
            <button
              type="button"
              className="secondary-button flex items-center gap-1.5 text-[rgb(var(--color-danger))]"
              onClick={handleRemove}
            >
              <Trash2 aria-hidden size={14} />
              삭제
            </button>
          ) : null}
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleChange}
      />
    </div>
  );
};
