export type CharacterScopedData<T> = Record<string, T>;

export const getCharacterData = <T>(
  data: CharacterScopedData<T>,
  characterId: string,
  fallback: T,
) => data[characterId] ?? fallback;
