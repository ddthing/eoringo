import { afterEach, describe, expect, it, vi } from "vitest";
import { useCharacterStore } from "../stores/character/useCharacterStore";

const mocks = vi.hoisted(() => ({
  getAllCharacterImages: vi.fn(),
  saveCharacterImageById: vi.fn(),
}));

vi.mock("../lib/imageStorage", () => ({
  getAllCharacterImages: mocks.getAllCharacterImages,
  saveCharacterImageById: mocks.saveCharacterImageById,
}));

import {
  createCharacterImageSync,
  type CharacterImageSyncTransport,
} from "./characterImageSync";

const originalCharacters = useCharacterStore.getState().characters;
const originalActiveCharacterId = useCharacterStore.getState().activeCharacterId;
const png64 = new Uint8Array([
  137, 80, 78, 71, 13, 10, 26, 10,
  0, 0, 0, 13, 73, 72, 68, 82,
  0, 0, 0, 64, 0, 0, 0, 64,
]);

const createTransport = (overrides: Partial<CharacterImageSyncTransport> = {}) => ({
  getUserId: vi.fn(async () => "00000000-0000-4000-8000-000000000001"),
  list: vi.fn(async () => []),
  download: vi.fn(async () => new Blob([png64], { type: "image/png" })),
  upload: vi.fn(async () => undefined),
  ...overrides,
});

afterEach(() => {
  useCharacterStore.setState({
    characters: originalCharacters,
    activeCharacterId: originalActiveCharacterId,
  });
  mocks.getAllCharacterImages.mockReset();
  mocks.saveCharacterImageById.mockReset();
});

describe("character image sync", () => {
  it("uploads only referenced local images through the transport", async () => {
    useCharacterStore.setState({
      characters: [{
        id: "character-a",
        name: "A",
        server: "Chocobo",
        isMain: true,
        profileImageId: "character-image-a",
      }],
      activeCharacterId: "character-a",
    });
    mocks.getAllCharacterImages.mockResolvedValue({
      "character-image-a": new Blob([png64], { type: "image/png" }),
      "character-image-unused": new Blob([png64], { type: "image/png" }),
    });
    const transport = createTransport();

    const result = await createCharacterImageSync(transport, { uploadsEnabled: true }).sync();

    expect(transport.upload).toHaveBeenCalledWith(
      expect.objectContaining({ imageId: "character-image-a", contentType: "image/png" }),
    );
    expect(transport.upload).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({ uploaded: 1, downloaded: 0, pending: 0, failed: [] });
  });

  it("downloads a referenced remote image into the local image store", async () => {
    useCharacterStore.setState({
      characters: [{
        id: "character-a",
        name: "A",
        server: "Chocobo",
        isMain: true,
        profileImageId: "character-image-a",
      }],
      activeCharacterId: "character-a",
    });
    mocks.getAllCharacterImages.mockResolvedValue({});
    const transport = createTransport({
      list: vi.fn(async () => [{ imageId: "character-image-a" }]),
    });

    const result = await createCharacterImageSync(transport, { uploadsEnabled: true }).sync();

    expect(transport.download).toHaveBeenCalledWith(
      "00000000-0000-4000-8000-000000000001/character-image-a",
    );
    expect(mocks.saveCharacterImageById).toHaveBeenCalledWith(
      "character-image-a",
      expect.any(Blob),
    );
    expect(result).toMatchObject({ uploaded: 0, downloaded: 1, pending: 0, failed: [] });
  });

  it("keeps local images pending when uploads are disabled", async () => {
    useCharacterStore.setState({
      characters: [{
        id: "character-a",
        name: "A",
        server: "Chocobo",
        isMain: true,
        profileImageId: "character-image-a",
      }],
      activeCharacterId: "character-a",
    });
    mocks.getAllCharacterImages.mockResolvedValue({
      "character-image-a": new Blob([png64], { type: "image/png" }),
    });
    const transport = createTransport();

    const result = await createCharacterImageSync(transport, { uploadsEnabled: false }).sync();

    expect(transport.upload).not.toHaveBeenCalled();
    expect(result).toMatchObject({ uploaded: 0, downloaded: 0, pending: 1, failed: [] });
  });

  it("never turns an unsafe image ID into a remote path", async () => {
    useCharacterStore.setState({
      characters: [{
        id: "character-a",
        name: "A",
        server: "Chocobo",
        isMain: true,
        profileImageId: "../other-user/image",
      }],
      activeCharacterId: "character-a",
    });
    mocks.getAllCharacterImages.mockResolvedValue({});
    const transport = createTransport();

    const result = await createCharacterImageSync(transport, { uploadsEnabled: true }).sync();

    expect(transport.download).not.toHaveBeenCalled();
    expect(transport.upload).not.toHaveBeenCalled();
    expect(result.failed).toEqual(["../other-user/image"]);
  });
});
