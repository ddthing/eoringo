import { useAllowanceStore } from "../stores/allowance/useAllowanceStore";
import { useCharacterStore } from "../stores/character/useCharacterStore";
import { useDdayStore } from "../stores/dday/useDdayStore";
import { useHistoryStore } from "../stores/history/useHistoryStore";
import { useWeeklyMemoStore } from "../stores/memo/useWeeklyMemoStore";
import { useTaskStore } from "../stores/task/useTaskStore";
import { storageKeys } from "../lib/storage";
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

export type StoreSyncRequest = {
  imageSyncRequired: boolean;
};

type StoreSyncBridgeOptions = {
  queue: MutationQueueWriter;
  requestSync: (request: StoreSyncRequest) => void;
  deferStart?: boolean;
  now?: () => Date;
  createMutationId?: () => string;
  captureDocument?: (documentType: RemotelyPersistedDocumentType) => DocumentWrite;
  captureDocuments?: () => DocumentWrite[];
  hydrateDocuments?: (documents: RemoteDocument[]) => void;
};

const identityKey = (document: { documentType: string; characterId: string | null }) =>
  `${document.documentType}:${document.characterId ?? "account"}`;

const storageKeyByDocumentType = {
  characters: storageKeys.characters,
  memo: storageKeys.weeklyMemo,
  dday: storageKeys.dday,
  allowance: storageKeys.allowances,
  tasks: storageKeys.tasks,
  history: storageKeys.history,
} as const satisfies Record<RemotelyPersistedDocumentType, string>;

export const createStoreSyncBridge = ({
  queue,
  requestSync,
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

  const enqueueDocument = (
    documentType: RemotelyPersistedDocumentType,
    force = false,
  ) => {
    const write = captureDocument(documentType);
    const key = identityKey(write);
    const serialized = canonicalStringify(write.payload);

    if (!force && baseline.get(key) === serialized) {
      return false;
    }

    baseline.set(key, serialized);
    const remote = remoteIndex.get(key);
    const timestamp = now().toISOString();
    queue.upsertLatest({
      mutationId: createMutationId(),
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
    return true;
  };

  const captureChanges = () => {
    scheduled = false;

    if (suppressWrites) {
      return;
    }

    const documentTypes = [...dirtyDocumentTypes];
    dirtyDocumentTypes.clear();
    const queued = documentTypes.some((documentType) => enqueueDocument(documentType));

    if (queued) {
      requestSync({
        imageSyncRequired: documentTypes.includes("characters"),
      });
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
    capturePersistedChangesSince(snapshot: ReadonlyMap<string, string | null>) {
      (Object.entries(storageKeyByDocumentType) as Array<[
        RemotelyPersistedDocumentType,
        string,
      ]>).forEach(([documentType, storageKey]) => {
        if (
          !snapshot.has(storageKey) ||
          snapshot.get(storageKey) === localStorage.getItem(storageKey)
        ) {
          return;
        }

        enqueueDocument(documentType, true);
      });
    },

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
