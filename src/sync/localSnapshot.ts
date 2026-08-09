import { documentCodecs, type DocumentType } from "./codecs";
import { getJsonByteLength } from "./codecs/common";
import { DEFAULT_KOREAN_SERVER } from "../data/servers";
import type { LocalSnapshotPreview } from "./syncTypes";

export type LocalSnapshotInput = {
  documents: Partial<Record<DocumentType, unknown>>;
  images: Record<string, Blob>;
};

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Document validation failed.";

export const createLocalSnapshotPreview = ({
  documents,
  images,
}: LocalSnapshotInput): LocalSnapshotPreview => {
  const preview: LocalSnapshotPreview = {
    documents: [],
    images: [],
    issues: [],
    totalBytes: 0,
  };

  (Object.entries(documentCodecs) as [DocumentType, (typeof documentCodecs)[DocumentType]][])
    .forEach(([documentType, codec]) => {
      const source = documents[documentType];

      if (source === undefined) {
        return;
      }

      try {
        const payload = codec.parse(source);
        const bytes = getJsonByteLength(payload);
        preview.documents.push({
          documentType,
          schemaVersion: codec.schemaVersion,
          payload,
          bytes,
        });
        preview.totalBytes += bytes;
      } catch (error) {
        preview.issues.push({ documentType, message: getErrorMessage(error) });
      }
    });

  Object.entries(images).forEach(([imageId, image]) => {
    preview.images.push({
      imageId,
      type: image.type || "application/octet-stream",
      bytes: image.size,
    });
    preview.totalBytes += image.size;
  });

  preview.documents.sort((left, right) => left.documentType.localeCompare(right.documentType));
  preview.images.sort((left, right) => left.imageId.localeCompare(right.imageId));
  preview.issues.sort((left, right) => left.documentType.localeCompare(right.documentType));

  return preview;
};

const hasEntries = (value: unknown) =>
  typeof value === "object" && value !== null && Object.keys(value).length > 0;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const hasMeaningfulCharacters = (payload: unknown) => {
  if (!isRecord(payload) || !("characters" in payload)) {
    return false;
  }

  const characters = payload.characters;

  if (!Array.isArray(characters) || characters.length !== 1) {
    return true;
  }

  const [character] = characters;

  if (!isRecord(character)) {
    return true;
  }

  return (
    character.id !== "default-character" ||
    character.name !== "나의 모험가" ||
    character.server !== DEFAULT_KOREAN_SERVER ||
    character.isMain !== true ||
    typeof character.profileImageId === "string"
  );
};

export const hasMeaningfulLocalSnapshot = (preview: LocalSnapshotPreview) =>
  preview.images.length > 0 ||
  preview.documents.some(({ documentType, payload }) => {
    switch (documentType) {
      case "characters":
        return hasMeaningfulCharacters(payload);
      case "tasks":
        return isRecord(payload) && (
          hasEntries(payload.completedByCharacter) ||
          hasEntries(payload.completedAtByCharacter) ||
          hasEntries(payload.customTaskTemplatesByCharacter) ||
          hasEntries(payload.disabledDefaultTaskIdsByCharacter)
        );
      case "dday":
        return isRecord(payload) &&
          Object.values(payload.eventsByCharacter ?? {}).some(
            (events) => Array.isArray(events) && events.length > 0,
          );
      case "memo":
        return isRecord(payload) &&
          Object.values(payload.memosByCharacter ?? {}).some(
            (memo) => typeof memo === "string" && memo.trim().length > 0,
          );
      case "allowance":
        return isRecord(payload) && payload.value !== 0;
      case "history":
        return isRecord(payload) && hasEntries(payload.entriesByDate);
    }
  });
