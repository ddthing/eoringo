import { useAllowanceStore } from "../stores/allowance/useAllowanceStore";
import { useCharacterStore } from "../stores/character/useCharacterStore";
import { useDdayStore } from "../stores/dday/useDdayStore";
import { useHistoryStore } from "../stores/history/useHistoryStore";
import { useWeeklyMemoStore } from "../stores/memo/useWeeklyMemoStore";
import { useTaskStore } from "../stores/task/useTaskStore";
import { documentCodecs, type DocumentType } from "./codecs";
import type { DocumentWrite, RemoteDocument } from "./documentRepository";

export const remotelyPersistedDocumentTypes = [
  "memo",
  "dday",
  "allowance",
  "tasks",
  "history",
] as const satisfies readonly DocumentType[];

export type RemotelyPersistedDocumentType = (typeof remotelyPersistedDocumentTypes)[number];

export const captureStoreDocument = (documentType: RemotelyPersistedDocumentType): DocumentWrite => {
  const codec = documentCodecs[documentType];
  const payload = (() => {
    switch (documentType) {
      case "memo":
        return { memosByCharacter: useWeeklyMemoStore.getState().memosByCharacter };
      case "dday":
        return { eventsByCharacter: useDdayStore.getState().eventsByCharacter };
      case "allowance": {
        const { value, lastAccrualKey } = useAllowanceStore.getState();
        return { value, lastAccrualKey };
      }
      case "tasks": {
        const tasks = useTaskStore.getState();
        return {
          completedByCharacter: tasks.completedByCharacter,
          completedAtByCharacter: tasks.completedAtByCharacter,
          customTaskTemplatesByCharacter: tasks.customTaskTemplatesByCharacter,
          disabledDefaultTaskIdsByCharacter: tasks.disabledDefaultTaskIdsByCharacter,
          dailyResetKey: tasks.dailyResetKey,
          weeklyResetKey: tasks.weeklyResetKey,
          resetKeysByRule: tasks.resetKeysByRule,
        };
      }
      case "history":
        return { entriesByDate: useHistoryStore.getState().entriesByDate };
    }
  })();

  return {
    documentType,
    characterId: null,
    payload: codec.parse(payload),
    schemaVersion: codec.schemaVersion,
  };
};

export const captureStoreDocuments = (): DocumentWrite[] =>
  remotelyPersistedDocumentTypes.map(captureStoreDocument);

export const hydrateStoreDocuments = (documents: RemoteDocument[]) => {
  const supported = documents.filter((document) =>
    document.documentType === "characters" ||
    remotelyPersistedDocumentTypes.includes(document.documentType as RemotelyPersistedDocumentType),
  );

  if (supported.some((document) => document.characterId !== null)) {
    throw new Error("Current store adapters accept only account-scoped documents.");
  }

  if (new Set(supported.map((document) => document.documentType)).size !== supported.length) {
    throw new Error("Duplicate remote documents cannot be hydrated.");
  }

  supported.forEach((document) => {
    switch (document.documentType) {
      case "characters":
        useCharacterStore.setState(documentCodecs.characters.parse(document.payload));
        break;
      case "memo":
        useWeeklyMemoStore.setState(documentCodecs.memo.parse(document.payload));
        break;
      case "dday":
        useDdayStore.setState(documentCodecs.dday.parse(document.payload));
        break;
      case "allowance":
        useAllowanceStore.setState(documentCodecs.allowance.parse(document.payload));
        break;
      case "tasks":
        useTaskStore.setState(documentCodecs.tasks.parse(document.payload));
        break;
      case "history":
        useHistoryStore.setState(documentCodecs.history.parse(document.payload));
        break;
    }
  });
};
