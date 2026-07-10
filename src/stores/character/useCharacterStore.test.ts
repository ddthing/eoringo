import { describe, expect, it } from "vitest";
import { normalizeCharacters, useCharacterStore } from "../useCharacterStore";

describe("character normalization", () => {
  it("always keeps exactly one main character", () => {
    const characters = normalizeCharacters([
      { id: "a", name: "A", server: "톤베리", isMain: true },
      { id: "b", name: "B", server: "톤베리", isMain: true },
    ]);

    expect(characters.filter((character) => character.isMain)).toHaveLength(1);
    expect(characters[0].isMain).toBe(true);
  });

  it("creates a main character when legacy data has none", () => {
    const characters = normalizeCharacters([
      { id: "a", name: "A", server: "톤베리", isMain: false },
      { id: "b", name: "B", server: "톤베리", isMain: false },
    ]);

    expect(characters.filter((character) => character.isMain)).toHaveLength(1);
  });

  it("updates the main and active character together", () => {
    useCharacterStore.setState({
      characters: [
        { id: "a", name: "A", server: "톤베리", isMain: true },
        { id: "b", name: "B", server: "톤베리", isMain: false },
      ],
      activeCharacterId: "a",
    });

    useCharacterStore.getState().setMainCharacter("b");

    expect(useCharacterStore.getState().activeCharacterId).toBe("b");
    expect(useCharacterStore.getState().characters.filter((character) => character.isMain)).toEqual([
      expect.objectContaining({ id: "b" }),
    ]);
  });
});
