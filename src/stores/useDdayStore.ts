import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { createId, storageKeys } from "../lib/storage";
import type { DdayEvent } from "../types";

type PersistedDdayState = Partial<{
  events: Partial<DdayEvent>[];
}>;

type DdayState = {
  events: DdayEvent[];
  addEvent: (event: Omit<DdayEvent, "id">) => void;
  removeEvent: (id: string) => void;
};

const dateKeyPattern = /^\d{4}-\d{2}-\d{2}$/;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const normalizeEvents = (events: unknown): DdayEvent[] => {
  if (!Array.isArray(events)) {
    return [];
  }

  return events
    .filter(isRecord)
    .map((event) => ({
      id: typeof event.id === "string" ? event.id : createId("dday"),
      title:
        typeof event.title === "string" && event.title.trim()
          ? event.title.trim()
          : "이름 없는 기념일",
      date: typeof event.date === "string" ? event.date : "",
      characterId: typeof event.characterId === "string" ? event.characterId : undefined,
    }))
    .filter((event) => dateKeyPattern.test(event.date))
    .sort((a, b) => a.date.localeCompare(b.date));
};

export const useDdayStore = create<DdayState>()(
  persist(
    (set) => ({
      events: [],
      addEvent: (event) =>
        set((state) => ({
          events: [...state.events, { ...event, id: createId("dday") }].sort((a, b) =>
            a.date.localeCompare(b.date),
          ),
        })),
      removeEvent: (id) =>
        set((state) => ({
          events: state.events.filter((event) => event.id !== id),
        })),
    }),
    {
      name: storageKeys.dday,
      storage: createJSONStorage(() => localStorage),
      version: 1,
      migrate: (persistedState): PersistedDdayState => {
        const state = isRecord(persistedState) ? persistedState : {};

        return {
          events: normalizeEvents(state.events),
        };
      },
      partialize: (state) => ({ events: state.events }),
    },
  ),
);
