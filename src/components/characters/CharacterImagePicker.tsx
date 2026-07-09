import { type ChangeEvent, useRef, useState } from "react";
import { ImagePlus, Trash2 } from "lucide-react";
import { useConfirmDialog } from "../common/ConfirmDialog";
import { deleteCharacterImage, saveCharacterImage } from "../../lib/imageStorage";
import { CharacterAvatar } from "./CharacterAvatar";
import { CharacterImageEditor } from "./CharacterImageEditor";

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
  const confirm = useConfirmDialog();
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [editingFile, setEditingFile] = useState<File | null>(null);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setErrorMessage("");

    if (!file.type.startsWith("image/")) {
      setErrorMessage("이미지 파일만 업로드할 수 있습니다.");
      event.target.value = "";
      return;
    }

    setEditingFile(file);
    event.target.value = "";
  };

  const handleSaveEditedImage = async (imageBlob: Blob) => {
    setIsSaving(true);
    setErrorMessage("");

    try {
      const nextImageId = await saveCharacterImage(imageBlob);

      if (imageId) {
        await deleteCharacterImage(imageId);
      }

      onChange(nextImageId);
      setEditingFile(null);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "이미지를 저장할 수 없습니다.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemove = async () => {
    const confirmed = await confirm({
      title: "캐릭터 사진을 삭제할까요?",
      description: "현재 캐릭터에 연결된 프로필 사진만 삭제됩니다.",
      confirmLabel: "삭제",
      tone: "danger",
    });

    if (!confirmed) {
      return;
    }

    if (imageId) {
      await deleteCharacterImage(imageId);
    }

    onChange(undefined);
  };

  return (
    <>
      <div className="flex items-center gap-2.5 rounded-[18px] border border-dashed border-[rgb(var(--color-line-soft))] bg-card/70 p-2">
        <CharacterAvatar imageId={imageId} name={characterName || "나의 모험가"} size="lg" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-ink">캐릭터 사진</p>
          <p className="mt-0.5 text-[11px] text-ink-muted">
            정사각형으로 위치를 맞춰 저장합니다.
          </p>
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
                disabled={isSaving}
              >
                <Trash2 aria-hidden size={14} />
                삭제
              </button>
            ) : null}
          </div>
          {errorMessage ? (
            <p className="mt-1.5 text-[11px] font-bold text-[rgb(var(--color-danger))]">
              {errorMessage}
            </p>
          ) : null}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleChange}
        />
      </div>
      {editingFile ? (
        <CharacterImageEditor
          file={editingFile}
          isSaving={isSaving}
          onCancel={() => setEditingFile(null)}
          onSave={handleSaveEditedImage}
        />
      ) : null}
    </>
  );
};
