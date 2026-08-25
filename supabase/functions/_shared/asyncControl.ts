export type ConcurrentTaskResult<T, R> =
  | { item: T; status: "fulfilled"; value: R }
  | { item: T; status: "rejected"; reason: unknown };

const normalizeTimeoutMs = (value: number) =>
  Number.isFinite(value) ? Math.max(1, Math.floor(value)) : 1;

export const withTimeout = async <T>(
  operation: () => Promise<T>,
  timeoutMs: number,
  label: string,
): Promise<T> => {
  const timeout = normalizeTimeoutMs(timeoutMs);
  let timer: ReturnType<typeof setTimeout> | undefined;

  try {
    const timeoutPromise = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error(`${label}_timeout`)), timeout);
    });

    return await Promise.race([
      Promise.resolve().then(operation),
      timeoutPromise,
    ]);
  } finally {
    if (timer !== undefined) {
      clearTimeout(timer);
    }
  }
};

export const fetchWithTimeout = async (
  input: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> => {
  const controller = new AbortController();
  const timeout = normalizeTimeoutMs(timeoutMs);
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
};

export const runWithCursorPagination = async <T>(
  pageSize: number,
  fetchPage: (cursor: string | null) => Promise<readonly T[]>,
  getNextCursor: (page: readonly T[]) => string | null,
  processPage: (page: readonly T[]) => Promise<void>,
): Promise<number> => {
  const normalizedPageSize = Math.floor(pageSize);

  if (!Number.isFinite(normalizedPageSize) || normalizedPageSize < 1) {
    throw new Error("pagination_page_size_invalid");
  }

  let cursor: string | null = null;
  let scanned = 0;
  const seenCursors = new Set<string>();

  while (true) {
    const page = await fetchPage(cursor);
    const nextCursor =
      page.length >= normalizedPageSize ? getNextCursor(page) : null;

    if (page.length >= normalizedPageSize) {
      if (!nextCursor || seenCursors.has(nextCursor)) {
        throw new Error("pagination_cursor_invalid");
      }

      seenCursors.add(nextCursor);
    }

    scanned += page.length;
    await processPage(page);

    if (page.length < normalizedPageSize) {
      return scanned;
    }

    cursor = nextCursor;
  }
};

export const runWithConcurrency = async <T, R>(
  items: readonly T[],
  maxConcurrency: number,
  worker: (item: T) => Promise<R>,
): Promise<Array<ConcurrentTaskResult<T, R>>> => {
  if (items.length === 0) {
    return [];
  }

  const concurrency = Math.min(
    items.length,
    Math.max(1, Math.floor(maxConcurrency)),
  );
  const results = new Array<ConcurrentTaskResult<T, R>>(items.length);
  let nextIndex = 0;

  const runWorker = async () => {
    while (true) {
      const index = nextIndex;
      nextIndex += 1;

      if (index >= items.length) {
        return;
      }

      const item = items[index]!;

      try {
        results[index] = {
          item,
          status: "fulfilled",
          value: await worker(item),
        };
      } catch (reason) {
        results[index] = { item, status: "rejected", reason };
      }
    }
  };

  await Promise.all(Array.from({ length: concurrency }, runWorker));

  return results;
};
