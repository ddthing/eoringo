import { useAllowanceStore } from "../stores/allowance/useAllowanceStore";
import { useCharacterStore } from "../stores/character/useCharacterStore";
import { useDdayStore } from "../stores/dday/useDdayStore";
import { useHistoryStore } from "../stores/history/useHistoryStore";
import { useWeeklyMemoStore } from "../stores/memo/useWeeklyMemoStore";
import {
  normalizePersistedTaskState,
  useTaskStore,
} from "../stores/task/useTaskStore";
import { normalizeCharacters } from "../stores/character/useCharacterStore";
import { getCurrentLeveAccrualKey } from "../domain/allowances/leveAllowances";
import { documentCodecs, type DocumentType } from "./codecs";
import type { DocumentWrite, RemoteDocument } from "./documentRepository";

export const remotelyPersistedDocumentTypes = [
  "characters",
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
      case "characters": {
        const characters = useCharacterStore.getState();
        return {
          characters: characters.characters,
          activeCharacterId: characters.activeCharacterId,
        };
      }
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

const emptyDocumentPayload = (documentType: RemotelyPersistedDocumentType) => {
  switch (documentType) {
    case "characters": {
      const characters = normalizeCharacters([]);
      return {
        characters,
        activeCharacterId: characters[0].id,
      };
    }
    case "memo":
      return { memosByCharacter: {} };
    case "dday":
      return { eventsByCharacter: {} };
    case "allowance":
      return { value: 0, lastAccrualKey: getCurrentLeveAccrualKey() };
    case "tasks":
      return normalizePersistedTaskState({});
    case "history":
      return { entriesByDate: {} };
  }
};

const applyDocumentPayload = (
  documentType: RemotelyPersistedDocumentType,
  payload: unknown,
) => {
  switch (documentType) {
    case "characters":
      useCharacterStore.setState(documentCodecs.characters.parse(payload));
      break;
    case "memo":
      useWeeklyMemoStore.setState(documentCodecs.memo.parse(payload));
      break;
    case "dday":
      useDdayStore.setState(documentCodecs.dday.parse(payload));
      break;
    case "allowance":
      useAllowanceStore.setState(documentCodecs.allowance.parse(payload));
      break;
    case "tasks":
      useTaskStore.setState(documentCodecs.tasks.parse(payload));
      break;
    case "history":
      useHistoryStore.setState(documentCodecs.history.parse(payload));
      break;
  }
};

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

  const remoteByType = new Map(supported.map((document) => [document.documentType, document]));
  const validatedPayloads = remotelyPersistedDocumentTypes.map((documentType) => {
    const document = remoteByType.get(documentType);

    if (document && document.schemaVersion !== documentCodecs[documentType].schemaVersion) {
      throw new Error("Unsupported remote document schema version.");
    }

    return [
      documentType,
      documentCodecs[documentType].parse(
        document?.payload ?? emptyDocumentPayload(documentType),
      ),
    ] as const;
  });

  validatedPayloads.forEach(([documentType, payload]) => {
    applyDocumentPayload(documentType, payload);
  });
};
