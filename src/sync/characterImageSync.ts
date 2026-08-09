import type { SupabaseClient } from "@supabase/supabase-js";
import { getAllCharacterImages, saveCharacterImageById } from "../lib/imageStorage";
import { useCharacterStore } from "../stores/character/useCharacterStore";
import {
  buildCharacterImagePath,
  characterImageBucket,
  isSafeCharacterImageId,
  isUserId,
  validateCharacterImageBlob,
  blobToBase64,
  type CharacterImageType,
} from "./imageValidation";

export type RemoteCharacterImage = {
  imageId: string;
};

export type CharacterImageSyncResult = {
  uploaded: number;
  downloaded: number;
  pending: number;
  failed: string[];
};

export type CharacterImageSyncTransport = {
  getUserId: () => Promise<string>;
  list: () => Promise<RemoteCharacterImage[]>;
  download: (path: string) => Promise<Blob>;
  upload: (request: {
    imageId: string;
    contentType: CharacterImageType;
    data: string;
  }) => Promise<void>;
};

const uniqueReferencedImageIds = () =>
  Array.from(
    new Set(
      useCharacterStore
        .getState()
        .characters.map((character) => character.profileImageId)
        .filter((imageId): imageId is string => Boolean(imageId)),
    ),
  );

const normalizeRemoteImages = (images: RemoteCharacterImage[]) =>
  new Set(images.map((image) => image.imageId).filter(isSafeCharacterImageId));

export const createCharacterImageSync = (
  transport: CharacterImageSyncTransport,
  options: { uploadsEnabled: boolean },
) => ({
  async sync(): Promise<CharacterImageSyncResult> {
    const userId = await transport.getUserId();

    if (!isUserId(userId)) {
      throw new Error("Authenticated user identity is invalid.");
    }

    const [remoteImages, localImages] = await Promise.all([
      transport.list(),
      getAllCharacterImages(),
    ]);
    const remoteImageIds = normalizeRemoteImages(remoteImages);
    const result: CharacterImageSyncResult = {
      uploaded: 0,
      downloaded: 0,
      pending: 0,
      failed: [],
    };

    for (const imageId of uniqueReferencedImageIds()) {
      if (!isSafeCharacterImageId(imageId)) {
        result.failed.push(imageId);
        continue;
      }

      const localImage = localImages[imageId];
      const hasRemoteImage = remoteImageIds.has(imageId);

      if (hasRemoteImage) {
        if (localImage) {
          continue;
        }

        try {
          const downloaded = await transport.download(buildCharacterImagePath(userId, imageId));
          const validated = await validateCharacterImageBlob(downloaded);
          await saveCharacterImageById(imageId, validated.blob);
          result.downloaded += 1;
        } catch {
          result.failed.push(imageId);
        }
        continue;
      }

      if (!localImage || !options.uploadsEnabled) {
        if (!localImage) {
          result.failed.push(imageId);
        } else {
          result.pending += 1;
        }
        continue;
      }

      try {
        const validated = await validateCharacterImageBlob(localImage);
        await transport.upload({
          imageId,
          contentType: validated.inspection.contentType,
          data: await blobToBase64(validated.blob),
        });
        result.uploaded += 1;
      } catch {
        result.failed.push(imageId);
      }
    }

    return result;
  },
});

const responseShape = (value: unknown): value is { imageId: string; contentType: CharacterImageType } => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return (
    isSafeCharacterImageId(candidate.imageId) &&
    typeof candidate.path === "string" &&
    (candidate.contentType === "image/webp" ||
      candidate.contentType === "image/jpeg" ||
      candidate.contentType === "image/png") &&
    typeof candidate.bytes === "number" &&
    Number.isSafeInteger(candidate.bytes) &&
    candidate.bytes > 0
  );
};

export const createSupabaseCharacterImageSyncTransport = (supabase: SupabaseClient) => {
  const getUserId = async () => {
    const { data, error } = await supabase.auth.getUser();

    if (error || !data.user || data.user.is_anonymous === true || !isUserId(data.user.id)) {
      throw new Error("A permanent authenticated user is required for image sync.");
    }

    return data.user.id;
  };

  return {
    getUserId,
    async list() {
      const userId = await getUserId();
      const { data, error } = await supabase.storage.from(characterImageBucket).list(userId, {
        limit: 51,
        offset: 0,
        sortBy: { column: "name", order: "asc" },
      });

      if (error) {
        throw new Error("Remote character images could not be listed.");
      }

      return (data ?? [])
        .map((file) => {
          const imageId = file.name.startsWith(`${userId}/`)
            ? file.name.slice(userId.length + 1)
            : file.name;

          return isSafeCharacterImageId(imageId) ? { imageId } : null;
        })
        .filter((image): image is RemoteCharacterImage => image !== null);
    },
    async download(path: string) {
      const { data, error } = await supabase.storage.from(characterImageBucket).download(path);

      if (error || !data) {
        throw new Error("Remote character image could not be downloaded.");
      }

      return data;
    },
    async upload(request: { imageId: string; contentType: CharacterImageType; data: string }) {
      const { data, error } = await supabase.functions.invoke("sync-character-images", {
        body: {
          operation: "upload",
          imageId: request.imageId,
          contentType: request.contentType,
          data: request.data,
        },
      });

      if (error || !responseShape(data) || data.imageId !== request.imageId) {
        throw new Error("Character image upload was rejected.");
      }
    },
  } satisfies CharacterImageSyncTransport;
};
