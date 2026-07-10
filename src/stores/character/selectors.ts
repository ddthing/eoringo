import type { Character } from "../../types";

type CharacterSlice = {
  characters: Character[];
  activeCharacterId: string;
};

export const selectActiveCharacter = (state: CharacterSlice) =>
  state.characters.find((character) => character.id === state.activeCharacterId) ??
  state.characters[0];

export const selectMainCharacter = (state: CharacterSlice) =>
  state.characters.find((character) => character.isMain) ?? state.characters[0];
