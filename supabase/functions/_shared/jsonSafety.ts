const maxJsonDepth = 24;
const maxJsonObjectKeys = 1000;
const maxJsonArrayItems = 1000;
const maxJsonStringLength = 16000;
const reservedJsonKeys = new Set(["__proto__", "constructor", "prototype"]);

export const isSafeJsonTree = (value: unknown, depth = 0): boolean => {
  if (depth > maxJsonDepth || value === null) {
    return false;
  }

  if (typeof value === "string") {
    return value.length <= maxJsonStringLength;
  }

  if (typeof value !== "object") {
    return typeof value === "number" || typeof value === "boolean";
  }

  if (Array.isArray(value)) {
    return (
      value.length <= maxJsonArrayItems &&
      value.every((item) => isSafeJsonTree(item, depth + 1))
    );
  }

  const entries = Object.entries(value);

  return (
    entries.length <= maxJsonObjectKeys &&
    entries.every(
      ([key, child]) =>
        key.length <= 128 &&
        !reservedJsonKeys.has(key) &&
        isSafeJsonTree(child, depth + 1),
    )
  );
};
