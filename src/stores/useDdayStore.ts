import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { createId, storageKeys } from "../lib/storage";
import type { DdayEvent } from "../types";

type DdayState = {
  events: DdayEvent[];
  addEvent: (event: Omit<DdayEvent, "id">) => void;
  removeEvent: (id: string) => void;
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
      partialize: (state) => ({ events: state.events }),
    },
  ),
);
