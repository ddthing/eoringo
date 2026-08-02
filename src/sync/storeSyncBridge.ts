import { useAllowanceStore } from "../stores/allowance/useAllowanceStore";
import { useDdayStore } from "../stores/dday/useDdayStore";
import { useHistoryStore } from "../stores/history/useHistoryStore";
import { useWeeklyMemoStore } from "../stores/memo/useWeeklyMemoStore";
import { useTaskStore } from "../stores/task/useTaskStore";
import { canonicalStringify } from "./codecs/common";
import type { RemoteDocument } from "./documentRepository";
import type { SyncMutation } from "./mutationQueue";
import { captureStoreDocuments, hydrateStoreDocuments } from "./storeSyncAdapter";

type MutationQueueWriter = {
  upsertLatest: (mutation: SyncMutation) => SyncMutation[];
};

type StoreSyncBridgeOptions = {
  queue: MutationQueueWriter;
  requestSync: () => void;
  now?: () => Date;
  createMutationId?: () => string;
};

const identityKey = (document: { documentType: string; characterId: string | null }) =>
  `${document.documentType}:${document.characterId ?? "account"}`;

export const createStoreSyncBridge = ({
  queue,
  requestSync,
  now = () => new Date(),
  createMutationId = () => crypto.randomUUID(),
}: StoreSyncBridgeOptions) => {
  let suppressWrites = false;
  let scheduled = false;
  let remoteIndex = new Map<string, RemoteDocument>();
  let baseline = new Map(
    captureStoreDocuments().map((document) => [
      identityKey(document),
      canonicalStringify(document.payload),
    ]),
  );

  const captureChanges = () => {
    scheduled = false;

    if (suppressWrites) {
      return;
    }

    let queued = false;

    captureStoreDocuments().forEach((write) => {
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

  const scheduleCapture = () => {
    if (!scheduled && !suppressWrites) {
      scheduled = true;
      queueMicrotask(captureChanges);
    }
  };

  const unsubscribers = [
    useWeeklyMemoStore.subscribe(scheduleCapture),
    useDdayStore.subscribe(scheduleCapture),
    useAllowanceStore.subscribe(scheduleCapture),
    useTaskStore.subscribe(scheduleCapture),
    useHistoryStore.subscribe(scheduleCapture),
  ];

  return {
    hydrate(documents: RemoteDocument[]) {
      suppressWrites = true;
      remoteIndex = new Map(documents.map((document) => [identityKey(document), document]));

      try {
        hydrateStoreDocuments(documents);
        baseline = new Map(
          captureStoreDocuments().map((document) => [
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
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    },
  };
};
