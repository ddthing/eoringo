import { z } from "zod";
import { documentCodecs, type DocumentType } from "./codecs";

export type DocumentIdentity = {
  documentType: DocumentType;
  characterId: string | null;
};

export type RemoteDocument = DocumentIdentity & {
  id: string;
  payload: unknown;
  schemaVersion: number;
  revision: number;
  updatedAt: string;
};

export type DocumentWrite = DocumentIdentity & {
  payload: unknown;
  schemaVersion: number;
};

export type DocumentUpdate = DocumentWrite & {
  id: string;
  expectedRevision: number;
};

export type DocumentUpdateResult =
  | { ok: true; document: RemoteDocument }
  | { ok: false; kind: "conflict"; current: RemoteDocument | null };

export type RawDocumentRow = {
  id: unknown;
  user_id: unknown;
  character_id: unknown;
  document_type: unknown;
  payload: unknown;
  schema_version: unknown;
  revision: unknown;
  updated_at: unknown;
  deleted_at: unknown;
};

export type RawDocumentMetadataRow = Omit<RawDocumentRow, "payload">;

export type DocumentDataSource = {
  getVerifiedUserId: () => Promise<string>;
  listMetadata: (userId: string) => Promise<RawDocumentMetadataRow[]>;
  find: (userId: string, identity: DocumentIdentity) => Promise<RawDocumentRow | null>;
  findMany: (userId: string, ids: string[]) => Promise<RawDocumentRow[]>;
  insert: (userId: string, write: DocumentWrite) => Promise<RawDocumentRow>;
  update: (
    userId: string,
    update: DocumentUpdate,
  ) => Promise<RawDocumentRow | null>;
};

const documentTypeSchema = z.enum([
  "characters",
  "tasks",
  "dday",
  "memo",
  "allowance",
  "history",
]);

const rowEnvelopeSchema = z
  .object({
    id: z.uuid(),
    user_id: z.uuid(),
    character_id: z.uuid().nullable(),
    document_type: documentTypeSchema,
    payload: z.unknown(),
    schema_version: z.number().int().min(1).max(1000),
    revision: z.number().int().nonnegative().safe(),
    updated_at: z.iso.datetime({ offset: true }),
    deleted_at: z.iso.datetime({ offset: true }).nullable(),
  })
  .strict();

const rowMetadataEnvelopeSchema = rowEnvelopeSchema.omit({ payload: true });

const assertWrite = (write: DocumentWrite): DocumentWrite => {
  const codec = documentCodecs[write.documentType];

  if (write.schemaVersion !== codec.schemaVersion) {
    throw new Error("Unsupported document schema version.");
  }

  return {
    ...write,
    payload: codec.parse(write.payload),
  };
};

const decodeRow = (row: RawDocumentRow, expectedUserId: string): RemoteDocument => {
  const envelope = rowEnvelopeSchema.parse(row);

  if (envelope.user_id !== expectedUserId || envelope.deleted_at !== null) {
    throw new Error("Document ownership or lifecycle verification failed.");
  }

  const codec = documentCodecs[envelope.document_type];

  if (envelope.schema_version !== codec.schemaVersion) {
    throw new Error("Unsupported document schema version.");
  }

  return {
    id: envelope.id,
    characterId: envelope.character_id,
    documentType: envelope.document_type,
    payload: codec.parse(envelope.payload),
    schemaVersion: envelope.schema_version,
    revision: envelope.revision,
    updatedAt: envelope.updated_at,
  };
};

const decodeMetadataRow = (
  row: RawDocumentMetadataRow,
  expectedUserId: string,
): RemoteDocumentMetadata => {
  const envelope = rowMetadataEnvelopeSchema.parse(row);

  if (envelope.user_id !== expectedUserId || envelope.deleted_at !== null) {
    throw new Error("Document ownership or lifecycle verification failed.");
  }

  return {
    id: envelope.id,
    characterId: envelope.character_id,
    documentType: envelope.document_type,
    schemaVersion: envelope.schema_version,
    revision: envelope.revision,
    updatedAt: envelope.updated_at,
  };
};

type RemoteDocumentMetadata = Omit<RemoteDocument, "payload">;

const identityKey = (document: DocumentIdentity) =>
  `${document.documentType}:${document.characterId ?? "account"}`;

export const createDocumentRepository = (source: DocumentDataSource) => ({
  async list(previousDocuments: RemoteDocument[] = []): Promise<RemoteDocument[]> {
    const userId = await source.getVerifiedUserId();
    const metadataRows = await source.listMetadata(userId);
    const previousByIdentity = new Map(
      previousDocuments.map((document) => [identityKey(document), document]),
    );

    const metadata = metadataRows.map((row) => decodeMetadataRow(row, userId));
    const changedMetadata = metadata.filter((document) => {
      const previous = previousByIdentity.get(identityKey(document));

      return !(
        previous &&
        previous.id === document.id &&
        previous.schemaVersion === document.schemaVersion &&
        previous.revision === document.revision &&
        previous.updatedAt === document.updatedAt
      );
    });
    const fullRows = changedMetadata.length
      ? await source.findMany(userId, changedMetadata.map((document) => document.id))
      : [];
    const changedIds = new Set(changedMetadata.map((document) => document.id));
    const fullDocuments = new Map(
      fullRows.map((row) => {
        const document = decodeRow(row, userId);
        return [document.id, document] as const;
      }),
    );
    const documents = metadata.map((document) => {
      const previous = previousByIdentity.get(identityKey(document));

      if (!changedIds.has(document.id)) {
        return previous ?? null;
      }

      return fullDocuments.get(document.id) ?? null;
    });

    return documents.filter((document): document is RemoteDocument => document !== null);
  },

  async find(identity: DocumentIdentity): Promise<RemoteDocument | null> {
    const userId = await source.getVerifiedUserId();
    const row = await source.find(userId, identity);

    return row ? decodeRow(row, userId) : null;
  },

  async insert(write: DocumentWrite): Promise<RemoteDocument> {
    const validated = assertWrite(write);
    const userId = await source.getVerifiedUserId();
    const row = await source.insert(userId, validated);

    return decodeRow(row, userId);
  },

  async update(update: DocumentUpdate): Promise<DocumentUpdateResult> {
    const validated = assertWrite(update);
    const userId = await source.getVerifiedUserId();
    const row = await source.update(userId, { ...update, ...validated });

    if (row) {
      return { ok: true, document: decodeRow(row, userId) };
    }

    const current = await source.find(userId, update);
    return {
      ok: false,
      kind: "conflict",
      current: current ? decodeRow(current, userId) : null,
    };
  },
});
