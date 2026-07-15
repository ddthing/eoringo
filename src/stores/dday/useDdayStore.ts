import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { createId, storageKeys } from "../../lib/storage";
import type { DdayEvent } from "../../types";
import { getMigrationCharacterId } from "../character/getMigrationCharacterId";

type DdayState = {
  eventsByCharacter: Record<string, DdayEvent[]>;
  addEvent: (characterId: string, event: Omit<DdayEvent, "id" | "characterId">) => void;
  updateEvent: (
    characterId: string,
    id: string,
    patch: Pick<DdayEvent, "title" | "date">,
  ) => void;
  removeEvent: (characterId: string, id: string) => void;
  removeCharacterData: (characterId: string) => void;
};

const dateKeyPattern = /^\d{4}-\d{2}-\d{2}$/;
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const normalizeEvents = (events: unknown, characterId: string): DdayEvent[] =>
  (Array.isArray(events) ? events : [])
    .filter(isRecord)
    .map((event) => ({
      id: typeof event.id === "string" ? event.id : createId("dday"),
      title: typeof event.title === "string" && event.title.trim() ? event.title.trim() : "이름 없는 기념일",
      date: typeof event.date === "string" ? event.date : "",
      characterId,
    }))
    .filter((event) => dateKeyPattern.test(event.date))
    .sort((a, b) => a.date.localeCompare(b.date));

export const updateDdayEvents = (
  events: DdayEvent[],
  id: string,
  patch: Pick<DdayEvent, "title" | "date">,
) => {
  if (!events.some((event) => event.id === id)) {
    return events;
  }

  return events
    .map((event) => (event.id === id ? { ...event, ...patch } : event))
    .sort((a, b) => a.date.localeCompare(b.date));
};

export const normalizeDdayState = (persistedState: unknown) => {
  const state = isRecord(persistedState) ? persistedState : {};
  const eventsByCharacter: Record<string, DdayEvent[]> = {};

  if (isRecord(state.eventsByCharacter)) {
    Object.entries(state.eventsByCharacter).forEach(([characterId, events]) => {
      eventsByCharacter[characterId] = normalizeEvents(events, characterId);
    });
  }

  if (Array.isArray(state.events)) {
    state.events.filter(isRecord).forEach((event) => {
      const characterId =
        typeof event.characterId === "string" ? event.characterId : getMigrationCharacterId();
      eventsByCharacter[characterId] = normalizeEvents(
        [...(eventsByCharacter[characterId] ?? []), event],
        characterId,
      );
    });
  }

  return { eventsByCharacter };
};

export const useDdayStore = create<DdayState>()(
  persist(
    (set) => ({
      eventsByCharacter: {},
      addEvent: (characterId, event) =>
        set((state) => ({
          eventsByCharacter: {
            ...state.eventsByCharacter,
            [characterId]: [
              ...(state.eventsByCharacter[characterId] ?? []),
              { ...event, characterId, id: createId("dday") },
            ].sort((a, b) => a.date.localeCompare(b.date)),
          },
        })),
      updateEvent: (characterId, id, patch) =>
        set((state) => {
          const currentEvents = state.eventsByCharacter[characterId] ?? [];
          const nextEvents = updateDdayEvents(currentEvents, id, patch);

          if (nextEvents === currentEvents) {
            return state;
          }

          return {
            eventsByCharacter: {
              ...state.eventsByCharacter,
              [characterId]: nextEvents,
            },
          };
        }),
      removeEvent: (characterId, id) =>
        set((state) => ({
          eventsByCharacter: {
            ...state.eventsByCharacter,
            [characterId]: (state.eventsByCharacter[characterId] ?? []).filter((event) => event.id !== id),
          },
        })),
      removeCharacterData: (characterId) =>
        set((state) => {
          const eventsByCharacter = { ...state.eventsByCharacter };
          delete eventsByCharacter[characterId];
          return { eventsByCharacter };
        }),
    }),
    {
      name: storageKeys.dday,
      storage: createJSONStorage(() => localStorage),
      version: 2,
      migrate: normalizeDdayState,
      partialize: (state) => ({ eventsByCharacter: state.eventsByCharacter }),
    },
  ),
);
