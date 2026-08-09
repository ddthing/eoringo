import { useSyncExternalStore } from "react";

type MinuteClockOptions = {
  getNow?: () => Date;
  setTimeoutFn?: typeof globalThis.setTimeout;
  clearTimeoutFn?: typeof globalThis.clearTimeout;
};

const getMillisecondsUntilNextMinute = (date: Date) =>
  60_000 - (date.getSeconds() * 1_000 + date.getMilliseconds());

export const createMinuteClock = ({
  getNow = () => new Date(),
  setTimeoutFn = globalThis.setTimeout,
  clearTimeoutFn = globalThis.clearTimeout,
}: MinuteClockOptions = {}) => {
  const listeners = new Set<() => void>();
  let snapshot = getNow();
  let timerId: ReturnType<typeof globalThis.setTimeout> | undefined;

  const schedule = () => {
    if (listeners.size === 0 || timerId !== undefined) return;

    timerId = setTimeoutFn(() => {
      timerId = undefined;
      snapshot = getNow();
      listeners.forEach((listener) => listener());
      schedule();
    }, getMillisecondsUntilNextMinute(getNow()));
  };

  return {
    getSnapshot: () => snapshot,
    subscribe(listener: () => void) {
      listeners.add(listener);

      if (listeners.size === 1) {
        snapshot = getNow();
        schedule();
      }

      return () => {
        listeners.delete(listener);

        if (listeners.size === 0 && timerId !== undefined) {
          clearTimeoutFn(timerId);
          timerId = undefined;
        }
      };
    },
  };
};

const minuteClock = createMinuteClock();

export const subscribeToMinuteClock = (listener: () => void) =>
  minuteClock.subscribe(listener);

export const useMinuteNow = () =>
  useSyncExternalStore(subscribeToMinuteClock, minuteClock.getSnapshot, minuteClock.getSnapshot);
