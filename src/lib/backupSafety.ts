export const maxBackupFileBytes = 64 * 1024 * 1024;
const reservedKeys = new Set(["__proto__", "constructor", "prototype"]);

// Bound depth and total work; null remains valid in legacy persisted state.
export const isSafeBackupData = (value: unknown): boolean => {
  const pending = [{ value, depth: 0 }];
  let visited = 0;
  while (pending.length) {
    const entry = pending.pop()!;
    if (++visited > 100_000 || entry.depth > 32) return false;
    if (entry.value === null) continue;
    if (typeof entry.value === "string") {
      if (entry.value.length > 1_000_000) return false;
    } else if (typeof entry.value === "number") {
      if (!Number.isFinite(entry.value)) return false;
    } else if (typeof entry.value === "object") {
      const children = Object.entries(entry.value);
      if (children.length > 10_000) return false;
      for (const [key, child] of children) {
        if (reservedKeys.has(key) || key.length > 256) return false;
        pending.push({ value: child, depth: entry.depth + 1 });
      }
    } else if (typeof entry.value !== "boolean") return false;
  }
  return true;
};

export const readBackupFile = async (file: Pick<File, "size" | "text">): Promise<unknown> => {
  if (file.size <= 0 || file.size > maxBackupFileBytes) {
    throw new Error("64MB 이하의 백업 파일을 선택해주세요.");
  }
  try {
    return JSON.parse(await file.text());
  } catch {
    throw new Error("백업 파일을 읽을 수 없습니다. JSON 파일인지 확인해주세요.");
  }
};
