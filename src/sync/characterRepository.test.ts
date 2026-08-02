import { describe, expect, it, vi } from "vitest";
import {
  createCharacterRepository,
  type CharacterDataSource,
  type CharacterWrite,
  type RawCharacterRow,
} from "./characterRepository";

const userId = "00000000-0000-4000-8000-000000000001";
const characterId = "00000000-0000-4000-8000-000000000002";
const character: CharacterWrite = {
  clientId: "local-character",
  name: "Test",
  server: "Chocobo",
  isMain: true,
  profileImagePath: null,
  sortOrder: 0,
};

const row: RawCharacterRow = {
  id: characterId,
  user_id: userId,
  client_id: character.clientId,
  name: character.name,
  server: character.server,
  is_main: true,
  profile_image_path: null,
  sort_order: 0,
  updated_at: "2026-08-02T08:00:00.000Z",
};

const makeSource = (overrides: Partial<CharacterDataSource> = {}): CharacterDataSource => ({
  getVerifiedUserId: vi.fn().mockResolvedValue(userId),
  list: vi.fn().mockResolvedValue([row]),
  replaceAll: vi.fn().mockResolvedValue([row]),
  ...overrides,
});

describe("character repository", () => {
  it("derives ownership and validates returned rows", async () => {
    const source = makeSource();

    await expect(createCharacterRepository(source).list()).resolves.toMatchObject([
      { id: characterId, clientId: "local-character", isMain: true },
    ]);
    expect(source.list).toHaveBeenCalledWith(userId);
  });

  it("rejects invalid sets before invoking the remote source", async () => {
    const source = makeSource();

    await expect(
      createCharacterRepository(source).replaceAll([
        { ...character, isMain: false },
      ]),
    ).rejects.toThrow("Exactly one main character");
    expect(source.getVerifiedUserId).not.toHaveBeenCalled();
  });

  it("rejects cross-user rows even if the remote source returns them", async () => {
    const source = makeSource({
      list: vi.fn().mockResolvedValue([
        { ...row, user_id: "00000000-0000-4000-8000-000000000099" },
      ]),
    });

    await expect(createCharacterRepository(source).list()).rejects.toThrow(
      "ownership verification failed",
    );
  });
});
