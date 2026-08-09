export * from "../../supabase/functions/_shared/imageValidation";

import {
  inspectCharacterImage,
  type ImageInspection,
} from "../../supabase/functions/_shared/imageValidation";

export type ValidatedCharacterImage = {
  blob: Blob;
  inspection: ImageInspection;
};

export const validateCharacterImageBlob = async (
  blob: Blob,
): Promise<ValidatedCharacterImage> => {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const inspection = inspectCharacterImage(bytes, blob.type || undefined);

  if (!inspection) {
    throw new Error("Character image content is invalid or exceeds the allowed size.");
  }

  return {
    blob:
      blob.type === inspection.contentType
        ? blob
        : new Blob([bytes], { type: inspection.contentType }),
    inspection,
  };
};

export const blobToBase64 = async (blob: Blob) => {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = "";

  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  }

  return btoa(binary);
};
