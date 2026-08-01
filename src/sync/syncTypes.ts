import type { DocumentType } from "./codecs";

export type LocalImageMetadata = {
  imageId: string;
  type: string;
  bytes: number;
};

export type SyncDocumentSnapshot = {
  documentType: DocumentType;
  schemaVersion: number;
  payload: unknown;
  bytes: number;
};

export type LocalSnapshotIssue = {
  documentType: DocumentType;
  message: string;
};

export type LocalSnapshotPreview = {
  documents: SyncDocumentSnapshot[];
  images: LocalImageMetadata[];
  issues: LocalSnapshotIssue[];
  totalBytes: number;
};
