import { documentCodecs, type DocumentType } from "./codecs";
import { getJsonByteLength } from "./codecs/common";
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
