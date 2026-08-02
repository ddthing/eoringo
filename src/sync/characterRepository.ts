import { z } from "zod";
import { characterSchema } from "./codecs/characters";

export type RemoteCharacter = {
  id: string;
  clientId: string;
  name: string;
  server: string;
  isMain: boolean;
  profileImagePath: string | null;
  sortOrder: number;
  updatedAt: string;
};

export type CharacterWrite = {
  clientId: string;
  name: string;
  server: string;
  isMain: boolean;
  profileImagePath: string | null;
  sortOrder: number;
};

export type RawCharacterRow = {
  id: unknown;
  user_id: unknown;
  client_id: unknown;
  name: unknown;
  server: unknown;
  is_main: unknown;
  profile_image_path: unknown;
  sort_order: unknown;
  updated_at: unknown;
};

export type CharacterDataSource = {
  getVerifiedUserId: () => Promise<string>;
  list: (userId: string) => Promise<RawCharacterRow[]>;
  replaceAll: (userId: string, characters: CharacterWrite[]) => Promise<RawCharacterRow[]>;
};

const rowSchema = z
  .object({
    id: z.uuid(),
    user_id: z.uuid(),
    client_id: z.string().min(1).max(128),
    name: z.string().trim().min(1).max(40),
    server: z.string().trim().min(1).max(80),
    is_main: z.boolean(),
    profile_image_path: z.string().max(512).nullable(),
    sort_order: z.number().int().min(0).max(10_000),
    updated_at: z.iso.datetime({ offset: true }),
  })
  .strict();

const decodeCharacter = (row: RawCharacterRow, expectedUserId: string): RemoteCharacter => {
  const parsed = rowSchema.parse(row);

  if (parsed.user_id !== expectedUserId) {
    throw new Error("Character ownership verification failed.");
  }

  return {
    id: parsed.id,
    clientId: parsed.client_id,
    name: parsed.name,
    server: parsed.server,
    isMain: parsed.is_main,
    profileImagePath: parsed.profile_image_path,
    sortOrder: parsed.sort_order,
    updatedAt: parsed.updated_at,
  };
};

const validateCharacters = (characters: CharacterWrite[]) => {
  if (characters.length === 0 || characters.length > 50) {
    throw new Error("An account must contain between 1 and 50 characters.");
  }

  if (characters.filter((character) => character.isMain).length !== 1) {
    throw new Error("Exactly one main character is required.");
  }

  if (new Set(characters.map((character) => character.clientId)).size !== characters.length) {
    throw new Error("Character client IDs must be unique.");
  }

  return characters.map((character) => {
    characterSchema.parse({
      id: character.clientId,
      name: character.name,
      server: character.server,
      isMain: character.isMain,
      ...(character.profileImagePath
        ? { profileImageId: character.profileImagePath }
        : {}),
    });

    return {
      ...character,
      sortOrder: z.number().int().min(0).max(10_000).parse(character.sortOrder),
      profileImagePath: z.string().max(512).nullable().parse(character.profileImagePath),
    };
  });
};

export const createCharacterRepository = (source: CharacterDataSource) => ({
  async list(): Promise<RemoteCharacter[]> {
    const userId = await source.getVerifiedUserId();
    const rows = await source.list(userId);

    return rows
      .map((row) => decodeCharacter(row, userId))
      .sort((left, right) => left.sortOrder - right.sortOrder);
  },

  async replaceAll(characters: CharacterWrite[]): Promise<RemoteCharacter[]> {
    const validated = validateCharacters(characters);
    const userId = await source.getVerifiedUserId();
    const rows = await source.replaceAll(userId, validated);
    const decoded = rows.map((row) => decodeCharacter(row, userId));

    if (decoded.length !== validated.length) {
      throw new Error("Character synchronization returned an incomplete result.");
    }

    return decoded.sort((left, right) => left.sortOrder - right.sortOrder);
  },
});
