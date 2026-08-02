import { create } from "zustand";
import type { DocumentType } from "../../sync/codecs";

export type SyncStatus =
  | "disabled"
  | "saved"
  | "syncing"
  | "offline"
  | "conflict"
  | "error";

type SyncState = {
  status: SyncStatus;
  pendingCount: number;
  conflictDocumentType: DocumentType | null;
  lastSyncedAt: string | null;
  setSyncState: (patch: Partial<Omit<SyncState, "setSyncState">>) => void;
  reset: () => void;
};

const initialState = {
  status: "disabled" as const,
  pendingCount: 0,
  conflictDocumentType: null,
  lastSyncedAt: null,
};

export const useSyncStore = create<SyncState>((set) => ({
  ...initialState,
  setSyncState: (patch) => set(patch),
  reset: () => set(initialState),
}));
