import { useAllowanceStore } from "../stores/allowance/useAllowanceStore";
import { useDdayStore } from "../stores/dday/useDdayStore";
import { useHistoryStore } from "../stores/history/useHistoryStore";
import { useWeeklyMemoStore } from "../stores/memo/useWeeklyMemoStore";
import { useTaskStore } from "../stores/task/useTaskStore";
import { documentCodecs, type DocumentType } from "./codecs";
import type { DocumentWrite, RemoteDocument } from "./documentRepository";

const remotelyPersistedDocumentTypes = [
  "memo",
  "dday",
  "allowance",
  "tasks",
  "history",
] as const satisfies readonly DocumentType[];

export const captureStoreDocuments = (): DocumentWrite[] => {
  const memo = useWeeklyMemoStore.getState();
  const dday = useDdayStore.getState();
  const allowance = useAllowanceStore.getState();
  const tasks = useTaskStore.getState();
  const history = useHistoryStore.getState();
  const sources = {
    memo: { memosByCharacter: memo.memosByCharacter },
    dday: { eventsByCharacter: dday.eventsByCharacter },
    allowance: {
      value: allowance.value,
      lastAccrualKey: allowance.lastAccrualKey,
    },
    tasks: {
      completedByCharacter: tasks.completedByCharacter,
      completedAtByCharacter: tasks.completedAtByCharacter,
      customTaskTemplatesByCharacter: tasks.customTaskTemplatesByCharacter,
      disabledDefaultTaskIdsByCharacter: tasks.disabledDefaultTaskIdsByCharacter,
      dailyResetKey: tasks.dailyResetKey,
      weeklyResetKey: tasks.weeklyResetKey,
      resetKeysByRule: tasks.resetKeysByRule,
    },
    history: { entriesByDate: history.entriesByDate },
  };

  return remotelyPersistedDocumentTypes.map((documentType) => {
    const codec = documentCodecs[documentType];

    return {
      documentType,
      characterId: null,
      payload: codec.parse(sources[documentType]),
      schemaVersion: codec.schemaVersion,
    };
  });
};

export const hydrateStoreDocuments = (documents: RemoteDocument[]) => {
  const supported = documents.filter((document) =>
    remotelyPersistedDocumentTypes.includes(
      document.documentType as (typeof remotelyPersistedDocumentTypes)[number],
    ),
  );

  if (supported.some((document) => document.characterId !== null)) {
    throw new Error("Current store adapters accept only account-scoped documents.");
  }

  if (new Set(supported.map((document) => document.documentType)).size !== supported.length) {
    throw new Error("Duplicate remote documents cannot be hydrated.");
  }

  supported.forEach((document) => {
    switch (document.documentType) {
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
