import { exportBackup, type BackupPayload } from "../lib/exportBackup";
import { getAllCharacterImages } from "../lib/imageStorage";
import { documentCodecs, type DocumentType } from "./codecs";
import { canonicalStringify, getJsonByteLength } from "./codecs/common";
import { createLocalSnapshotPreview } from "./localSnapshot";
import { captureStoreDocuments } from "./storeSyncAdapter";
import type { LocalSnapshotPreview } from "./syncTypes";

export const localMigrationReceiptKey = "eoringo/local-migration-receipt-v1";
const localRetentionDays = 7;
const maxLocalMigrationBytes = 3 * 1024 * 1024;

export type MigrationDocument = {
  documentType: DocumentType;
  schemaVersion: number;
  payload: unknown;
  digest: string;
};

export type LocalMigrationRequest = {
  migrationId: string;
  documents: MigrationDocument[];
};

export type PreparedLocalMigration = {
  request: LocalMigrationRequest;
  preview: LocalSnapshotPreview;
  backup: BackupPayload;
};

export type LocalMigrationResponse = {
  migrationId: string;
  documentDigests: Partial<Record<DocumentType, string>>;
};

export type LocalMigrationReceipt = {
  userId: string;
  migrationId: string;
  verifiedAt: string;
  retainLocalUntil: string;
  imageCountPending: number;
};

export type LocalMigrationTransport = {
  migrate: (request: LocalMigrationRequest) => Promise<LocalMigrationResponse>;
  readBack: () => Promise<MigrationDocument[]>;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

type StorageLike = Pick<Storage, "setItem">;

export class LocalMigrationFailure extends Error {
  readonly code: "invalid-local-data" | "verification-failed";

  constructor(code: LocalMigrationFailure["code"]) {
    super(code);
    this.name = "LocalMigrationFailure";
    this.code = code;
  }
}

export const digestMigrationPayload = async (payload: unknown) => {
  const bytes = new TextEncoder().encode(canonicalStringify(payload));
  const digest = await crypto.subtle.digest("SHA-256", bytes);

  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
};

export const prepareLocalMigration = async (): Promise<PreparedLocalMigration> => {
  const writes = captureStoreDocuments();
  const images = await getAllCharacterImages();
  const preview = createLocalSnapshotPreview({
    documents: Object.fromEntries(
      writes.map((write) => [write.documentType, write.payload]),
    ),
    images,
  });

  if (preview.issues.length > 0 || preview.documents.length !== writes.length) {
    throw new LocalMigrationFailure("invalid-local-data");
  }

  const documents = await Promise.all(
    writes.map(async (write) => ({
      documentType: write.documentType,
      schemaVersion: write.schemaVersion,
      payload: write.payload,
      digest: await digestMigrationPayload(write.payload),
    })),
  );

  if (getJsonByteLength(documents) > maxLocalMigrationBytes) {
    throw new LocalMigrationFailure("invalid-local-data");
  }

  return {
    request: {
      migrationId: crypto.randomUUID(),
      documents,
    },
    preview,
    backup: await exportBackup(),
  };
};

export const downloadMigrationBackup = (backup: BackupPayload) => {
  const blob = new Blob([JSON.stringify(backup)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  const date = backup.exportedAt.slice(0, 10) || "backup";

  anchor.href = url;
  anchor.download = `eoringo-before-sync-${date}.json`;
  anchor.rel = "noopener";
  anchor.click();
  URL.revokeObjectURL(url);
};

export const readLocalMigrationReceipt = (
  userId: string,
  storage: Pick<Storage, "getItem"> = localStorage,
): LocalMigrationReceipt | null => {
  try {
    const value: unknown = JSON.parse(storage.getItem(localMigrationReceiptKey) ?? "null");

    if (
      !isRecord(value) ||
      value.userId !== userId ||
      typeof value.migrationId !== "string" ||
      typeof value.verifiedAt !== "string" ||
      typeof value.retainLocalUntil !== "string" ||
      typeof value.imageCountPending !== "number"
    ) {
      return null;
    }

    return value as LocalMigrationReceipt;
  } catch {
    return null;
  }
};

const toDigestMap = (documents: MigrationDocument[]) =>
  Object.fromEntries(documents.map((document) => [document.documentType, document.digest])) as Partial<
    Record<DocumentType, string>
  >;

export const verifyMigrationResult = (
  prepared: PreparedLocalMigration,
  response: LocalMigrationResponse,
  readBack: MigrationDocument[],
) => {
  if (response.migrationId !== prepared.request.migrationId) {
    throw new LocalMigrationFailure("verification-failed");
  }

  const expected = toDigestMap(prepared.request.documents);
  const actual = toDigestMap(readBack);
  const documentTypes = prepared.request.documents.map((document) => document.documentType);

  documentTypes.forEach((documentType) => {
    if (
      !expected[documentType] ||
      !/^[0-9a-f]{64}$/.test(expected[documentType]) ||
      response.documentDigests[documentType] !== expected[documentType] ||
      actual[documentType] !== expected[documentType]
    ) {
      throw new LocalMigrationFailure("verification-failed");
    }
  });
};

export const runLocalMigration = async (
  prepared: PreparedLocalMigration,
  transport: LocalMigrationTransport,
  options: {
    userId: string;
    storage?: StorageLike;
    now?: Date;
  },
) => {
  const storage = options.storage ?? localStorage;
  const now = options.now ?? new Date();
  const response = await transport.migrate(prepared.request);
  const readBack = await transport.readBack();
  verifyMigrationResult(prepared, response, readBack);

  const retainLocalUntil = new Date(now);
  retainLocalUntil.setUTCDate(retainLocalUntil.getUTCDate() + localRetentionDays);
  const receipt = {
    userId: options.userId,
    migrationId: prepared.request.migrationId,
    verifiedAt: now.toISOString(),
    retainLocalUntil: retainLocalUntil.toISOString(),
    imageCountPending: prepared.preview.images.length,
  };
  storage.setItem(localMigrationReceiptKey, JSON.stringify(receipt));

  return receipt;
};
