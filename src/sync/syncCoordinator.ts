import { canonicalStringify } from "./codecs/common";
import type {
  DocumentIdentity,
  DocumentUpdateResult,
  DocumentWrite,
  RemoteDocument,
} from "./documentRepository";
import { RemoteDataFailure } from "./supabaseDocumentDataSource";
import type { SyncMutation } from "./mutationQueue";
import type { DocumentType } from "./codecs";
import type { SyncStatus } from "../stores/sync/useSyncStore";

export type SyncTrigger =
  | "startup"
  | "write"
  | "focus"
  | "online"
  | "token-refresh"
  | "manual";

type SyncRepository = {
  list: () => Promise<RemoteDocument[]>;
  find: (identity: DocumentIdentity) => Promise<RemoteDocument | null>;
  insert: (write: DocumentWrite) => Promise<RemoteDocument>;
  update: (update: {
    id: string;
    documentType: DocumentType;
    characterId: string | null;
    payload: unknown;
    schemaVersion: number;
    expectedRevision: number;
  }) => Promise<DocumentUpdateResult>;
};

type MutationQueue = {
  read: () => SyncMutation[];
  remove: (mutationId: string) => SyncMutation[];
  recordTransientFailure: (mutationId: string, now: Date) => SyncMutation[];
};

type SyncStatePatch = {
  status?: SyncStatus;
  pendingCount?: number;
  conflictDocumentType?: DocumentType | null;
  lastSyncedAt?: string | null;
};

type SyncCoordinatorOptions = {
  repository: SyncRepository;
  queue: MutationQueue;
  hydrate: (documents: RemoteDocument[]) => Promise<void> | void;
  setState: (patch: SyncStatePatch) => void;
  isOnline?: () => boolean;
  now?: () => Date;
};

const isSameDocument = (left: RemoteDocument, right: SyncMutation) =>
  left.documentType === right.documentType &&
  left.characterId === right.characterId &&
  left.schemaVersion === right.schemaVersion &&
  canonicalStringify(left.payload) === canonicalStringify(right.payload);

const isTransient = (error: unknown) =>
  error instanceof TypeError ||
  (error instanceof RemoteDataFailure &&
    (error.code === "network" || error.code === "unknown"));

export const createSyncCoordinator = ({
  repository,
  queue,
  hydrate,
  setState,
  isOnline = () => navigator.onLine,
  now = () => new Date(),
}: SyncCoordinatorOptions) => {
  let active = true;
  let inFlight: Promise<void> | null = null;
  let rerunRequested = false;

  const setQueueState = (status: SyncStatus, conflictDocumentType: DocumentType | null = null) => {
    setState({
      status,
      pendingCount: queue.read().length,
      conflictDocumentType,
    });
  };

  const handleInsert = async (mutation: SyncMutation) => {
    try {
      await repository.insert(mutation);
      queue.remove(mutation.mutationId);
      return "continue" as const;
    } catch (error) {
      if (error instanceof RemoteDataFailure && error.code === "conflict") {
        const current = await repository.find(mutation);

        if (current && isSameDocument(current, mutation)) {
          queue.remove(mutation.mutationId);
          return "continue" as const;
        }

        setQueueState("conflict", mutation.documentType);
        return "stop" as const;
      }

      throw error;
    }
  };

  const handleUpdate = async (mutation: SyncMutation) => {
    if (mutation.documentId === null || mutation.expectedRevision === null) {
      throw new Error("Validated update identity is missing.");
    }

    const result = await repository.update({
      id: mutation.documentId,
      documentType: mutation.documentType,
      characterId: mutation.characterId,
      payload: mutation.payload,
      schemaVersion: mutation.schemaVersion,
      expectedRevision: mutation.expectedRevision,
    });

    if (!result.ok) {
      setQueueState("conflict", mutation.documentType);
      return "stop" as const;
    }

    queue.remove(mutation.mutationId);
    return "continue" as const;
  };

  const runOnce = async () => {
    if (!active) {
      return;
    }

    if (!isOnline()) {
      setQueueState("offline");
      return;
    }

    setQueueState("syncing");
    const currentTime = now();
    const dueMutations = queue
      .read()
      .filter((mutation) => Date.parse(mutation.nextAttemptAt) <= currentTime.getTime());

    for (const mutation of dueMutations) {
      try {
        const outcome =
          mutation.operation === "insert"
            ? await handleInsert(mutation)
            : await handleUpdate(mutation);

        if (outcome === "stop") {
          return;
        }
      } catch (error) {
        if (isTransient(error)) {
          queue.recordTransientFailure(mutation.mutationId, currentTime);
        }

        setQueueState(isOnline() ? "error" : "offline");
        return;
      }
    }

    const documents = await repository.list();

    if (!active) {
      return;
    }

    await hydrate(documents);

    if (active) {
      setState({
        status: "saved",
        pendingCount: queue.read().length,
        conflictDocumentType: null,
        lastSyncedAt: now().toISOString(),
      });
    }
  };

  const sync = (_trigger: SyncTrigger = "manual"): Promise<void> => {
    if (inFlight) {
      rerunRequested = true;
      return inFlight;
    }

    inFlight = (async () => {
      do {
        rerunRequested = false;
        await runOnce();
      } while (active && rerunRequested);
    })().finally(() => {
      inFlight = null;
    });

    return inFlight;
  };

  return {
    sync,
    stop() {
      active = false;
      rerunRequested = false;
    },
  };
};
