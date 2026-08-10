import { useAllowanceStore } from "../stores/allowance/useAllowanceStore";
import { useCharacterStore } from "../stores/character/useCharacterStore";
import { useDdayStore } from "../stores/dday/useDdayStore";
import { useHistoryStore } from "../stores/history/useHistoryStore";
import { useWeeklyMemoStore } from "../stores/memo/useWeeklyMemoStore";
import { useTaskStore } from "../stores/task/useTaskStore";
import { canonicalStringify } from "./codecs/common";
import type { DocumentWrite, RemoteDocument } from "./documentRepository";
import type { SyncMutation } from "./mutationQueue";
import {
  captureStoreDocument,
  captureStoreDocuments,
  hydrateStoreDocuments,
  type RemotelyPersistedDocumentType,
} from "./storeSyncAdapter";

type MutationQueueWriter = {
  upsertLatest: (mutation: SyncMutation) => SyncMutation[];
};

type StoreSyncBridgeOptions = {
  queue: MutationQueueWriter;
  requestSync: () => void;
  ownerUserId?: string;
  deferStart?: boolean;
  now?: () => Date;
  createMutationId?: () => string;
  captureDocument?: (documentType: RemotelyPersistedDocumentType) => DocumentWrite;
  captureDocuments?: () => DocumentWrite[];
  hydrateDocuments?: (documents: RemoteDocument[]) => void;
};

const identityKey = (document: { documentType: string; characterId: string | null }) =>
  `${document.documentType}:${document.characterId ?? "account"}`;

export const createStoreSyncBridge = ({
  queue,
  requestSync,
  ownerUserId,
  deferStart = false,
  now = () => new Date(),
  createMutationId = () => crypto.randomUUID(),
  captureDocument = captureStoreDocument,
  captureDocuments = captureStoreDocuments,
  hydrateDocuments = hydrateStoreDocuments,
}: StoreSyncBridgeOptions) => {
  let suppressWrites = false;
  let scheduled = false;
  const dirtyDocumentTypes = new Set<RemotelyPersistedDocumentType>();
  let remoteIndex = new Map<string, RemoteDocument>();
  let baseline = new Map(
    captureDocuments().map((document) => [
      identityKey(document),
      canonicalStringify(document.payload),
    ]),
  );

  const captureChanges = () => {
    scheduled = false;

    if (suppressWrites) {
      return;
    }

    const documentTypes = [...dirtyDocumentTypes];
    dirtyDocumentTypes.clear();
    let queued = false;

    documentTypes.forEach((documentType) => {
      const write = captureDocument(documentType);
      const key = identityKey(write);
      const serialized = canonicalStringify(write.payload);

      if (baseline.get(key) === serialized) {
        return;
      }

      baseline.set(key, serialized);
      const remote = remoteIndex.get(key);
      const timestamp = now().toISOString();
      queue.upsertLatest({
        mutationId: createMutationId(),
        ...(ownerUserId ? { ownerUserId } : {}),
        operation: remote ? "update" : "insert",
        documentId: remote?.id ?? null,
        documentType: write.documentType,
        characterId: write.characterId,
        payload: write.payload,
        schemaVersion: write.schemaVersion,
        expectedRevision: remote?.revision ?? null,
        retryCount: 0,
        createdAt: timestamp,
        nextAttemptAt: timestamp,
      });
      queued = true;
    });

    if (queued) {
      requestSync();
    }
  };

  const scheduleCapture = (documentType: RemotelyPersistedDocumentType) => {
    if (suppressWrites) return;

    dirtyDocumentTypes.add(documentType);

    if (scheduled) return;

    scheduled = true;
    queueMicrotask(captureChanges);
  };

  let started = false;
  let unsubscribers: Array<() => void> = [];

  const start = () => {
    if (started) return;

    started = true;
    unsubscribers = [
      useCharacterStore.subscribe(() => scheduleCapture("characters")),
      useWeeklyMemoStore.subscribe(() => scheduleCapture("memo")),
      useDdayStore.subscribe(() => scheduleCapture("dday")),
      useAllowanceStore.subscribe(() => scheduleCapture("allowance")),
      useTaskStore.subscribe(() => scheduleCapture("tasks")),
      useHistoryStore.subscribe(() => scheduleCapture("history")),
    ];
  };

  if (!deferStart) {
    start();
  }

  return {
    start,

    hydrate(documents: RemoteDocument[]) {
      suppressWrites = true;
      remoteIndex = new Map(documents.map((document) => [identityKey(document), document]));

      try {
        hydrateDocuments(documents);
        dirtyDocumentTypes.clear();
        baseline = new Map(
          captureDocuments().map((document) => [
            identityKey(document),
            canonicalStringify(document.payload),
          ]),
        );
      } finally {
        suppressWrites = false;
      }
    },

    stop() {
      suppressWrites = true;
      dirtyDocumentTypes.clear();
      unsubscribers.forEach((unsubscribe) => unsubscribe());
      unsubscribers = [];
      started = false;
    },
  };
};
