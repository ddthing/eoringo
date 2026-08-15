type BackgroundPushSyncControllerOptions = {
  sync: () => Promise<void> | void;
  delayMs?: number;
  retryDelayMs?: number;
  setTimeoutFn?: typeof globalThis.setTimeout;
  clearTimeoutFn?: typeof globalThis.clearTimeout;
};

export const createBackgroundPushSyncController = ({
  sync,
  delayMs = 250,
  retryDelayMs = 60_000,
  setTimeoutFn = globalThis.setTimeout,
  clearTimeoutFn = globalThis.clearTimeout,
}: BackgroundPushSyncControllerOptions) => {
  let disposed = false;
  let pending = false;
  let timerId: ReturnType<typeof globalThis.setTimeout> | undefined;
  let inFlight: Promise<void> | null = null;
  let cancellationVersion = 0;

  const scheduleTimer = (waitMs = delayMs) => {
    if (disposed || !pending || timerId !== undefined || inFlight) {
      return;
    }

    timerId = setTimeoutFn(() => {
      timerId = undefined;

      if (disposed || !pending) {
        return;
      }

      if (inFlight) {
        return;
      }

      pending = false;
      const syncCancellationVersion = cancellationVersion;
      inFlight = Promise.resolve()
        .then(sync)
        .then(
          () => {
            inFlight = null;
            scheduleTimer();
          },
          () => {
            inFlight = null;

            if (disposed || cancellationVersion !== syncCancellationVersion) {
              scheduleTimer();
              return;
            }

            pending = true;
            scheduleTimer(retryDelayMs);
          },
        )
        .finally(() => {
          inFlight = null;
        });
    }, waitMs);
  };

  return {
    schedule() {
      if (disposed) {
        return;
      }

      pending = true;

      if (inFlight) {
        return;
      }

      if (timerId !== undefined) {
        clearTimeoutFn(timerId);
        timerId = undefined;
      }

      scheduleTimer();
    },

    cancel() {
      cancellationVersion += 1;
      pending = false;

      if (timerId !== undefined) {
        clearTimeoutFn(timerId);
        timerId = undefined;
      }
    },

    dispose() {
      cancellationVersion += 1;
      disposed = true;
      pending = false;

      if (timerId !== undefined) {
        clearTimeoutFn(timerId);
        timerId = undefined;
      }
    },
  };
};
