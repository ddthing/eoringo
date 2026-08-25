export const SUPABASE_REQUEST_TIMEOUT_MS = 15_000;

const normalizeTimeout = (timeoutMs: number) =>
  Number.isFinite(timeoutMs)
    ? Math.max(1, Math.floor(timeoutMs))
    : SUPABASE_REQUEST_TIMEOUT_MS;

export const createTimeoutFetch = (
  fetchImpl: typeof fetch = globalThis.fetch,
  timeoutMs = SUPABASE_REQUEST_TIMEOUT_MS,
): typeof fetch =>
  async (input, init) => {
    const controller = new AbortController();
    const externalSignal = init?.signal;
    const abortFromCaller = () => controller.abort(externalSignal?.reason);

    if (externalSignal) {
      if (externalSignal.aborted) {
        abortFromCaller();
      } else {
        externalSignal.addEventListener("abort", abortFromCaller, {
          once: true,
        });
      }
    }

    const timer = setTimeout(() => {
      controller.abort(
        new DOMException("Supabase request timed out", "TimeoutError"),
      );
    }, normalizeTimeout(timeoutMs));

    try {
      return await fetchImpl(input, {
        ...init,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
      externalSignal?.removeEventListener("abort", abortFromCaller);
    }
  };
