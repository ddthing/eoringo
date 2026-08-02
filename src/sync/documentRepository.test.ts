import { describe, expect, it, vi } from "vitest";
import {
  createDocumentRepository,
  type DocumentDataSource,
  type RawDocumentRow,
} from "./documentRepository";

const userId = "00000000-0000-4000-8000-000000000001";
const documentId = "00000000-0000-4000-8000-000000000002";
const updatedAt = "2026-08-02T08:00:00.000Z";
const payload = { memosByCharacter: { character: "memo" } };

const makeRow = (overrides: Partial<RawDocumentRow> = {}): RawDocumentRow => ({
  id: documentId,
  user_id: userId,
  character_id: null,
  document_type: "memo",
  payload,
  schema_version: 1,
  revision: 0,
  updated_at: updatedAt,
  deleted_at: null,
  ...overrides,
});

const makeSource = (overrides: Partial<DocumentDataSource> = {}): DocumentDataSource => ({
  getVerifiedUserId: vi.fn().mockResolvedValue(userId),
  list: vi.fn().mockResolvedValue([]),
  find: vi.fn().mockResolvedValue(null),
  insert: vi.fn().mockResolvedValue(makeRow()),
  update: vi.fn().mockResolvedValue(makeRow({ revision: 1 })),
  ...overrides,
});

describe("document repository", () => {
  it("derives ownership from the verified session and decodes server data", async () => {
    const source = makeSource({ list: vi.fn().mockResolvedValue([makeRow()]) });

    await expect(createDocumentRepository(source).list()).resolves.toEqual([
      {
        id: documentId,
        characterId: null,
        documentType: "memo",
        payload,
        schemaVersion: 1,
        revision: 0,
        updatedAt,
      },
    ]);
    expect(source.list).toHaveBeenCalledWith(userId);
  });

  it("validates writes before invoking the data source", async () => {
    const source = makeSource();

    await expect(
      createDocumentRepository(source).insert({
        characterId: null,
        documentType: "memo",
        payload: { memosByCharacter: { character: "x".repeat(16_001) } },
        schemaVersion: 1,
      }),
    ).rejects.toThrow();
    expect(source.getVerifiedUserId).not.toHaveBeenCalled();
    expect(source.insert).not.toHaveBeenCalled();
  });

  it("rejects a row whose owner does not match the verified user", async () => {
    const source = makeSource({
      list: vi.fn().mockResolvedValue([
        makeRow({ user_id: "00000000-0000-4000-8000-000000000099" }),
      ]),
    });

    await expect(createDocumentRepository(source).list()).rejects.toThrow(
      "ownership or lifecycle verification failed",
    );
  });

  it("returns the current document when an expected revision is stale", async () => {
    const current = makeRow({ revision: 4 });
    const source = makeSource({
      update: vi.fn().mockResolvedValue(null),
      find: vi.fn().mockResolvedValue(current),
    });

    await expect(
      createDocumentRepository(source).update({
        id: documentId,
        characterId: null,
        documentType: "memo",
        payload,
        schemaVersion: 1,
        expectedRevision: 3,
      }),
    ).resolves.toMatchObject({
      ok: false,
      kind: "conflict",
      current: { revision: 4 },
    });
    expect(source.update).toHaveBeenCalledWith(
      userId,
      expect.objectContaining({ expectedRevision: 3 }),
    );
  });

  it("rejects malformed server payloads instead of hydrating them", async () => {
    const source = makeSource({
      list: vi.fn().mockResolvedValue([makeRow({ payload: { unexpected: true } })]),
    });

    await expect(createDocumentRepository(source).list()).rejects.toThrow();
  });
});
