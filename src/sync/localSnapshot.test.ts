import { describe, expect, it } from "vitest";
import { DEFAULT_KOREAN_SERVER } from "../data/servers";
import { createLocalSnapshotPreview, hasMeaningfulLocalSnapshot } from "./localSnapshot";

describe("createLocalSnapshotPreview", () => {
  it("creates a deterministic, validated preview without mutating input", () => {
    const documents = {
      memo: { memosByCharacter: { character: "memo" } },
      allowance: { value: 12, lastAccrualKey: "2026-08-01" },
    };
    const original = structuredClone(documents);

    const preview = createLocalSnapshotPreview({
      documents,
      images: {
        second: new Blob(["22"], { type: "image/webp" }),
        first: new Blob(["1"], { type: "image/png" }),
      },
    });

    expect(documents).toEqual(original);
    expect(preview.documents.map((document) => document.documentType)).toEqual([
      "allowance",
      "memo",
    ]);
    expect(preview.images.map((image) => image.imageId)).toEqual(["first", "second"]);
    expect(preview.issues).toEqual([]);
    expect(preview.totalBytes).toBeGreaterThan(3);
  });

  it("reports an invalid domain without discarding valid domains", () => {
    const preview = createLocalSnapshotPreview({
      documents: {
        allowance: { value: 12, lastAccrualKey: "2026-08-01" },
        memo: { memosByCharacter: { character: "x".repeat(200_000) } },
      },
      images: {},
    });

    expect(preview.documents).toHaveLength(1);
    expect(preview.documents[0].documentType).toBe("allowance");
    expect(preview.issues).toEqual([
      expect.objectContaining({ documentType: "memo", message: expect.stringContaining("byte limit") }),
    ]);
  });

  it("distinguishes default local state from user-created data", () => {
    const empty = createLocalSnapshotPreview({
      documents: {
        characters: {
          characters: [{ id: "default-character", name: "나의 모험가", server: DEFAULT_KOREAN_SERVER, isMain: true }],
          activeCharacterId: "default-character",
        },
        tasks: {
          completedByCharacter: {},
          completedAtByCharacter: {},
          customTaskTemplatesByCharacter: {},
          disabledDefaultTaskIdsByCharacter: {},
          dailyResetKey: "today",
          weeklyResetKey: "week",
          resetKeysByRule: {},
        },
        dday: { eventsByCharacter: {} },
        memo: { memosByCharacter: {} },
        allowance: { value: 0, lastAccrualKey: "today" },
        history: { entriesByDate: {} },
      },
      images: {},
    });
    const meaningful = createLocalSnapshotPreview({
      documents: { memo: { memosByCharacter: { "default-character": "메모" } } },
      images: {},
    });

    expect(hasMeaningfulLocalSnapshot(empty)).toBe(false);
    expect(hasMeaningfulLocalSnapshot(meaningful)).toBe(true);
  });
});
