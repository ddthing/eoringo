export type NotificationSource = {
  characters: Array<{ id: string; name: string }>;
  completedByCharacter: Record<string, unknown>;
  customTaskTemplatesByCharacter: Record<string, unknown>;
  disabledDefaultTaskIdsByCharacter: Record<string, unknown>;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const compareKeys = (left: string, right: string) =>
  left < right ? -1 : left > right ? 1 : 0;

const canonicalize = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(canonicalize);
  }

  if (typeof value === "object" && value !== null) {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => compareKeys(left, right))
        .map(([key, child]) => [key, canonicalize(child)]),
    );
  }

  return value;
};

export const canonicalStringifyNotificationSource = (value: unknown) =>
  JSON.stringify(canonicalize(value));

export const digestNotificationSource = async (source: NotificationSource) => {
  const bytes = new TextEncoder().encode(canonicalStringifyNotificationSource(source));
  const digest = await crypto.subtle.digest("SHA-256", bytes);

  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
};

export const isValidNotificationSourceDigest = (value: unknown): value is string =>
  typeof value === "string" && /^[0-9a-f]{64}$/.test(value);

export const createNotificationSource = (
  characters: ReadonlyArray<{ id: string; name: string }>,
  taskSource: Pick<
    NotificationSource,
    | "completedByCharacter"
    | "customTaskTemplatesByCharacter"
    | "disabledDefaultTaskIdsByCharacter"
  >,
): NotificationSource => ({
  characters: characters.map(({ id, name }) => ({ id, name })),
  completedByCharacter: taskSource.completedByCharacter,
  customTaskTemplatesByCharacter: taskSource.customTaskTemplatesByCharacter,
  disabledDefaultTaskIdsByCharacter: taskSource.disabledDefaultTaskIdsByCharacter,
});

export const buildNotificationSourceFromDocuments = (
  documents: unknown[],
): NotificationSource | null => {
  const byType = new Map<string, unknown>();

  for (const document of documents) {
    if (!isRecord(document)) {
      return null;
    }

    const documentType = document.document_type;

    if (documentType !== "characters" && documentType !== "tasks") {
      return null;
    }

    if (byType.has(documentType)) {
      return null;
    }

    byType.set(documentType, document.payload);
  }

  const charactersPayload = byType.get("characters");
  const tasksPayload = byType.get("tasks");

  if (!isRecord(charactersPayload) || !isRecord(tasksPayload)) {
    return null;
  }

  if (!Array.isArray(charactersPayload.characters)) {
    return null;
  }

  const characters = charactersPayload.characters.map((character) => {
    if (!isRecord(character) || !isNonEmptyString(character.id) || !isNonEmptyString(character.name)) {
      return null;
    }

    return { id: character.id, name: character.name };
  });

  if (characters.some((character) => character === null)) {
    return null;
  }

  const completedByCharacter = tasksPayload.completedByCharacter;
  const customTaskTemplatesByCharacter = tasksPayload.customTaskTemplatesByCharacter;
  const disabledDefaultTaskIdsByCharacter = tasksPayload.disabledDefaultTaskIdsByCharacter;

  if (
    !isRecord(completedByCharacter) ||
    !isRecord(customTaskTemplatesByCharacter) ||
    !isRecord(disabledDefaultTaskIdsByCharacter)
  ) {
    return null;
  }

  return {
    characters: characters as Array<{ id: string; name: string }>,
    completedByCharacter,
    customTaskTemplatesByCharacter,
    disabledDefaultTaskIdsByCharacter,
  };
};
