export type PushSubscriptionInput = {
  endpoint: string;
  expirationTime?: number | null;
  keys: {
    p256dh: string;
    auth: string;
  };
};

export type PushNotificationCharacterSummary = {
  characterName: string;
  taskTitles: string[];
  dailyTaskTitles: string[];
  summaryDate: string;
};

export type PushNotificationSummary = {
  summaryDate: string;
  characters: PushNotificationCharacterSummary[];
};

export type PushNotificationPayload = {
  title: string;
  body: string;
  url: string;
};

const base64UrlPattern = /^[A-Za-z0-9_-]+$/;
const dateKeyPattern = /^\d{4}-\d{2}-\d{2}$/;
const timezonePattern = /^[A-Za-z0-9_./+~-]{1,64}$/;
const notificationTimePattern = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const hasExactKeys = (value: Record<string, unknown>, expectedKeys: string[]) => {
  const actualKeys = Object.keys(value).sort();
  const sortedExpectedKeys = [...expectedKeys].sort();

  return (
    actualKeys.length === sortedExpectedKeys.length &&
    actualKeys.every((key, index) => key === sortedExpectedKeys[index])
  );
};

const isSafeText = (value: unknown, maxLength: number): value is string =>
  typeof value === "string" &&
  value.trim().length > 0 &&
  value.length <= maxLength &&
  !/[\u0000-\u001f\u007f]/.test(value);

const isDateKey = (value: unknown): value is string => {
  if (typeof value !== "string" || !dateKeyPattern.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  return date.toISOString().startsWith(`${value}T`);
};

export const isValidTimezone = (value: unknown): value is string => {
  if (typeof value !== "string" || !timezonePattern.test(value)) {
    return false;
  }

  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value }).format();
    return true;
  } catch {
    return false;
  }
};

export const isValidNotificationTime = (value: unknown): value is string =>
  typeof value === "string" && notificationTimePattern.test(value);

export const normalizePushSubscription = (
  value: unknown,
): PushSubscriptionInput | null => {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, ["endpoint", "expirationTime", "keys"]) ||
    typeof value.endpoint !== "string" ||
    !value.endpoint.startsWith("https://") ||
    value.endpoint.length > 2048 ||
    (value.expirationTime !== null &&
      typeof value.expirationTime !== "number" &&
      value.expirationTime !== undefined) ||
    !isRecord(value.keys) ||
    !hasExactKeys(value.keys, ["p256dh", "auth"])
  ) {
    return null;
  }

  const p256dh = value.keys.p256dh;
  const auth = value.keys.auth;

  if (
    typeof p256dh !== "string" ||
    typeof auth !== "string" ||
    !base64UrlPattern.test(p256dh) ||
    !base64UrlPattern.test(auth) ||
    p256dh.length < 20 ||
    p256dh.length > 256 ||
    auth.length < 8 ||
    auth.length > 256
  ) {
    return null;
  }

  return {
    endpoint: value.endpoint,
    expirationTime: typeof value.expirationTime === "number" ? value.expirationTime : null,
    keys: { p256dh, auth },
  };
};

const normalizeTitles = (value: unknown) => {
  if (!Array.isArray(value) || value.length > 100) {
    return null;
  }

  const titles = value.map((title) => (isSafeText(title, 160) ? title.trim() : null));

  if (titles.some((title) => title === null)) {
    return null;
  }

  return [...new Set(titles as string[])];
};

export const normalizePushSummary = (value: unknown): PushNotificationSummary | null => {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, ["summaryDate", "characters"]) ||
    !isDateKey(value.summaryDate) ||
    !Array.isArray(value.characters) ||
    value.characters.length > 50
  ) {
    return null;
  }

  const characters = value.characters.map((character) => {
    if (
      !isRecord(character) ||
      !hasExactKeys(character, ["characterName", "taskTitles", "dailyTaskTitles", "summaryDate"]) ||
      !isSafeText(character.characterName, 80) ||
      !isDateKey(character.summaryDate) ||
      character.summaryDate !== value.summaryDate
    ) {
      return null;
    }

    const taskTitles = normalizeTitles(character.taskTitles);
    const dailyTaskTitles = normalizeTitles(character.dailyTaskTitles);

    return taskTitles && dailyTaskTitles
      ? {
          characterName: character.characterName.trim(),
          taskTitles,
          dailyTaskTitles,
          summaryDate: character.summaryDate,
        }
      : null;
  });

  return characters.every((character) => character !== null)
    ? { summaryDate: value.summaryDate, characters: characters as PushNotificationCharacterSummary[] }
    : null;
};

export const getPendingPushCharacters = (
  summary: PushNotificationSummary,
  currentDateKey: string,
) =>
  summary.characters
    .map((character) => ({
      characterName: character.characterName,
      taskTitles:
        character.summaryDate === currentDateKey
          ? character.taskTitles
          : character.dailyTaskTitles,
    }))
    .filter((character) => character.taskTitles.length > 0);

export const buildPushNotificationPayload = (
  summary: PushNotificationSummary,
  currentDateKey: string,
): PushNotificationPayload | null => {
  const pendingCharacters = getPendingPushCharacters(summary, currentDateKey);

  if (pendingCharacters.length === 0) {
    return null;
  }

  return {
    title: "오늘 미완료 숙제가 있어요",
    body: pendingCharacters
      .map(({ characterName, taskTitles }) => `${characterName} ${taskTitles.length}개`)
      .join(" · "),
    url: "/tasks",
  };
};
