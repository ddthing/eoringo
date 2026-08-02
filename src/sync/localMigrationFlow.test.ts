import { describe, expect, it, vi } from "vitest";
import {
  LocalMigrationFailure,
  runLocalMigration,
  verifyMigrationResult,
  type PreparedLocalMigration,
} from "./localMigration";

const digest = "a".repeat(64);
const migrationId = "00000000-0000-4000-8000-000000000001";
const document = {
  documentType: "memo" as const,
  schemaVersion: 1,
  payload: { memosByCharacter: { character: "memo" } },
  digest,
};
const prepared = {
  request: { migrationId, documents: [document] },
  preview: {
    documents: [],
    images: [],
    issues: [],
    totalBytes: 0,
  },
  backup: {
    app: "에오링고" as const,
    version: 7 as const,
    exportedAt: "2026-08-02T08:00:00.000Z",
    data: {},
    images: {},
    manifest: { storageKeyCount: 0, imageCount: 0 },
  },
} satisfies PreparedLocalMigration;

describe("explicit local migration", () => {
  it("requires both the server receipt and read-back digest to match", () => {
    expect(() =>
      verifyMigrationResult(
        prepared,
        { migrationId, documentDigests: { memo: digest } },
        [{ ...document, digest: "b".repeat(64) }],
      ),
    ).toThrow(LocalMigrationFailure);
  });

  it("records seven-day local retention only after verified read-back", async () => {
    const storage = { setItem: vi.fn() };
    const transport = {
      migrate: vi.fn().mockResolvedValue({
        migrationId,
        documentDigests: { memo: digest },
      }),
      readBack: vi.fn().mockResolvedValue([document]),
    };

    await expect(
      runLocalMigration(
        prepared,
        transport,
        storage,
        new Date("2026-08-02T08:00:00.000Z"),
      ),
    ).resolves.toMatchObject({
      migrationId,
      retainLocalUntil: "2026-08-09T08:00:00.000Z",
    });
    expect(storage.setItem).toHaveBeenCalledWith(
      "eoringo/local-migration-receipt-v1",
      expect.stringContaining(migrationId),
    );
  });

  it("does not write a receipt when migration verification fails", async () => {
    const storage = { setItem: vi.fn() };
    const transport = {
      migrate: vi.fn().mockResolvedValue({
        migrationId,
        documentDigests: { memo: "wrong" },
      }),
      readBack: vi.fn().mockResolvedValue([document]),
    };

    await expect(runLocalMigration(prepared, transport, storage)).rejects.toThrow(
      LocalMigrationFailure,
    );
    expect(storage.setItem).not.toHaveBeenCalled();
  });
});
