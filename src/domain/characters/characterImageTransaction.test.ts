import { describe, expect, it } from "vitest";
import {
  cancelCharacterImageTransaction,
  commitCharacterImageTransaction,
  createCharacterImageTransaction,
  stageCharacterImage,
} from "./characterImageTransaction";

describe("character image transaction", () => {
  it("keeps the committed image and removes only the temporary image on cancel", () => {
    const staged = stageCharacterImage(createCharacterImageTransaction("image-a"), "image-b");
    const cancelled = cancelCharacterImageTransaction(staged.transaction);

    expect(cancelled.cleanupImageIds).toEqual(["image-b"]);
    expect(cancelled.transaction).toEqual(createCharacterImageTransaction("image-a"));
  });

  it("cleans a replaced temporary image while preserving the latest one", () => {
    const first = stageCharacterImage(createCharacterImageTransaction("image-a"), "image-b");
    const second = stageCharacterImage(first.transaction, "image-c");

    expect(second.cleanupImageIds).toEqual(["image-b"]);
    expect(second.transaction).toMatchObject({
      initialImageId: "image-a",
      currentImageId: "image-c",
      temporaryImageIds: ["image-c"],
    });
  });

  it("does not delete a committed image when staged removal is cancelled", () => {
    const removed = stageCharacterImage(createCharacterImageTransaction("image-a"), undefined);
    const cancelled = cancelCharacterImageTransaction(removed.transaction);

    expect(removed.cleanupImageIds).toEqual([]);
    expect(cancelled.cleanupImageIds).toEqual([]);
    expect(cancelled.transaction.currentImageId).toBe("image-a");
  });

  it("deletes the previous committed image only after replacement is committed", () => {
    const staged = stageCharacterImage(createCharacterImageTransaction("image-a"), "image-b");
    const committed = commitCharacterImageTransaction(staged.transaction);

    expect(committed.cleanupImageIds).toEqual(["image-a"]);
    expect(committed.transaction).toEqual(createCharacterImageTransaction("image-b"));
  });

  it("removes a new character's temporary image on cancel", () => {
    const staged = stageCharacterImage(createCharacterImageTransaction(), "image-b");
    const cancelled = cancelCharacterImageTransaction(staged.transaction);

    expect(cancelled.cleanupImageIds).toEqual(["image-b"]);
    expect(cancelled.transaction.currentImageId).toBeUndefined();
  });
});
