import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { DEFAULT_KOREAN_SERVER } from "../data/servers";
import { createId, storageKeys } from "../lib/storage";
import type { Character } from "../types";

const defaultCharacter: Character = {
  id: "default-character",
  name: "나의 모험가",
  server: DEFAULT_KOREAN_SERVER,
  isMain: true,
};

type PersistedCharacterState = Partial<{
  characters: Partial<Character>[];
  activeCharacterId: string;
}>;

type CharacterState = {
  characters: Character[];
  activeCharacterId: string;
  addCharacter: (character: Omit<Character, "id">) => void;
  updateCharacter: (id: string, patch: Partial<Omit<Character, "id">>) => void;
  removeCharacter: (id: string) => void;
  setActiveCharacter: (id: string) => void;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const normalizeCharacter = (character: Partial<Character>, index = 0): Character => ({
  id: typeof character.id === "string" ? character.id : createId("character"),
  name:
    typeof character.name === "string" && character.name.trim()
      ? character.name.trim()
      : index === 0
        ? defaultCharacter.name
        : "새 모험가",
  server:
    typeof character.server === "string" &&
    character.server &&
    character.server !== "서버 미설정"
      ? character.server
      : DEFAULT_KOREAN_SERVER,
  isMain: typeof character.isMain === "boolean" ? character.isMain : index === 0,
  profileImageId:
    typeof character.profileImageId === "string" ? character.profileImageId : undefined,
});

const normalizeCharacters = (characters: unknown = []) => {
  const list = Array.isArray(characters) ? characters.filter(isRecord) : [];
  const normalized = list.length > 0 ? list.map(normalizeCharacter) : [defaultCharacter];
  const hasMain = normalized.some((character) => character.isMain);

  return (hasMain ? normalized : normalized.map((character, index) => ({
    ...character,
    isMain: index === 0,
  }))).map((character, index, list) => ({
    ...character,
    isMain: character.isMain && list.findIndex((item) => item.isMain) === index,
  }));
};

export const useCharacterStore = create<CharacterState>()(
  persist(
    (set) => ({
      characters: [defaultCharacter],
      activeCharacterId: defaultCharacter.id,
      addCharacter: (character) =>
        set((state) => {
          const newCharacter: Character = {
            ...character,
            id: createId("character"),
            server: character.server || DEFAULT_KOREAN_SERVER,
            isMain: character.isMain || state.characters.length === 0,
          };

          return {
            characters: newCharacter.isMain
              ? state.characters.map((item) => ({ ...item, isMain: false })).concat(newCharacter)
              : [...state.characters, newCharacter],
            activeCharacterId: newCharacter.id,
          };
        }),
      updateCharacter: (id, patch) =>
        set((state) => {
          const shouldSetMain = patch.isMain === true;

          return {
            characters: state.characters.map((character) => {
              if (character.id !== id) {
                return shouldSetMain ? { ...character, isMain: false } : character;
              }

              return {
                ...character,
                ...patch,
                server: patch.server || character.server || DEFAULT_KOREAN_SERVER,
              };
            }),
          };
        }),
      removeCharacter: (id) =>
        set((state) => {
          const remaining = state.characters.filter((character) => character.id !== id);
          const normalizedCharacters = normalizeCharacters(remaining);

          return {
            characters: normalizedCharacters,
            activeCharacterId:
              state.activeCharacterId === id
                ? normalizedCharacters[0].id
                : state.activeCharacterId,
          };
        }),
      setActiveCharacter: (id) =>
        set((state) => ({
          activeCharacterId: state.characters.some((character) => character.id === id)
            ? id
            : state.characters[0]?.id ?? defaultCharacter.id,
        })),
    }),
    {
      name: storageKeys.characters,
      storage: createJSONStorage(() => localStorage),
      version: 2,
      migrate: (persistedState): PersistedCharacterState => {
        const state = isRecord(persistedState) ? persistedState : {};
        const characters = normalizeCharacters(state.characters);
        const activeCharacterId =
          typeof state.activeCharacterId === "string" &&
          characters.some((character) => character.id === state.activeCharacterId)
            ? state.activeCharacterId
            : characters[0].id;

        return { characters, activeCharacterId };
      },
      partialize: (state) => ({
        characters: state.characters,
        activeCharacterId: state.activeCharacterId,
      }),
    },
  ),
);
