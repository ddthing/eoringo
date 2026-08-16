import { describe, expect, it, vi } from "vitest";
import type { SerializedPushSubscription } from "../../domain/notifications/pushSubscription";
import { syncBackgroundPushSubscription } from "./backgroundPushRuntimeSync";

type SyncOptions = Parameters<typeof syncBackgroundPushSubscription>[0];

const subscription = {} as PushSubscription;
const serializedSubscription: SerializedPushSubscription = {
  endpoint: "https://push.example.test/subscription",
  expirationTime: null,
  keys: {
    p256dh: "p256dh-key-value-1234567890",
    auth: "auth-key-value",
  },
};

const characters = [
  {
    id: "character-1",
    name: "모험가 A",
    server: "초코보",
    isMain: true,
  },
];

const taskSource = {
  completedByCharacter: {},
  customTaskTemplatesByCharacter: {},
  disabledDefaultTaskIdsByCharacter: {},
};

const buildOptions = (overrides: Partial<SyncOptions> = {}) => {
  let auth = { mode: "permanent" as const, userId: "user-1" };
  let notificationState = {
    backgroundPushEnabled: true,
    dailyIncompleteTime: "21:00",
  };

  const options: SyncOptions = {
    getAuth: () => auth,
    getNotificationState: () => notificationState,
    getExistingSubscription: async () => subscription,
    serializeSubscription: () => serializedSubscription,
    getCharacters: () => characters,
    getTaskSource: () => taskSource,
    isMounted: () => true,
    setBackgroundPushEnabled: (enabled: boolean) => {
      notificationState = { ...notificationState, backgroundPushEnabled: enabled };
    },
    upsert: vi.fn(async () => undefined),
    getNow: () => new Date("2026-08-15T12:00:00.000Z"),
    ...overrides,
  };

  return {
    options,
    setAuth: (nextAuth: typeof auth) => {
      auth = nextAuth;
    },
    setNotificationState: (nextState: typeof notificationState) => {
      notificationState = nextState;
    },
  };
};

describe("background push runtime sync", () => {
  it("does not upsert after notifications are disabled during subscription lookup", async () => {
    let resolveSubscription!: (value: PushSubscription) => void;
    const subscriptionLookup = new Promise<PushSubscription>((resolve) => {
      resolveSubscription = resolve;
    });
    const { options, setNotificationState } = buildOptions({
      getExistingSubscription: () => subscriptionLookup,
    });

    const syncPromise = syncBackgroundPushSubscription(options);
    setNotificationState({
      backgroundPushEnabled: false,
      dailyIncompleteTime: "21:00",
    });
    resolveSubscription(subscription);

    await syncPromise;

    expect(options.upsert).not.toHaveBeenCalled();
  });

  it("does not upsert a previous account after the account changes during lookup", async () => {
    let resolveSubscription!: (value: PushSubscription) => void;
    const subscriptionLookup = new Promise<PushSubscription>((resolve) => {
      resolveSubscription = resolve;
    });
    const { options, setAuth } = buildOptions({
      getExistingSubscription: () => subscriptionLookup,
    });

    const syncPromise = syncBackgroundPushSubscription(options);
    setAuth({ mode: "permanent", userId: "user-2" });
    resolveSubscription(subscription);

    await syncPromise;

    expect(options.upsert).not.toHaveBeenCalled();
  });

  it("propagates an upsert failure so the scheduler can retry", async () => {
    const error = new Error("offline");
    const { options } = buildOptions({
      upsert: vi.fn().mockRejectedValue(error),
    });

    await expect(syncBackgroundPushSubscription(options)).rejects.toBe(error);
  });

  it("includes a digest of the source data in the server snapshot", async () => {
    const { options } = buildOptions();

    await syncBackgroundPushSubscription(options);

    expect(options.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        summary: expect.objectContaining({
          sourceDigest: expect.stringMatching(/^[0-9a-f]{64}$/),
        }),
      }),
    );
  });
});
