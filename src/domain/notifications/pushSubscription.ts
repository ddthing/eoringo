export type SerializedPushSubscription = {
  endpoint: string;
  expirationTime: number | null;
  keys: {
    p256dh: string;
    auth: string;
  };
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const base64UrlPattern = /^[A-Za-z0-9_-]+$/;

export const normalizePushSubscription = (
  value: unknown,
): SerializedPushSubscription | null => {
  if (!isRecord(value) || typeof value.endpoint !== "string") {
    return null;
  }

  if (
    !value.endpoint.startsWith("https://") ||
    value.endpoint.length > 2048 ||
    (value.expirationTime !== null &&
      typeof value.expirationTime !== "number" &&
      value.expirationTime !== undefined)
  ) {
    return null;
  }

  if (!isRecord(value.keys)) {
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

export const serializePushSubscription = (
  subscription: PushSubscription,
): SerializedPushSubscription | null => normalizePushSubscription(subscription.toJSON());

export const decodeApplicationServerKey = (value: string): Uint8Array<ArrayBuffer> => {
  if (!base64UrlPattern.test(value)) {
    throw new Error("Invalid VAPID public key.");
  }

  const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((value.length + 3) % 4);
  const binary = atob(padded);

  const decoded = new Uint8Array(new ArrayBuffer(binary.length));

  for (let index = 0; index < binary.length; index += 1) {
    decoded[index] = binary.charCodeAt(index);
  }

  return decoded;
};

const getServiceWorkerRegistration = async () => {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
    throw new Error("Service workers are not supported.");
  }

  await navigator.serviceWorker.register("/push-sw.js", { scope: "/" });
  return navigator.serviceWorker.ready;
};

export const isBackgroundPushSupported = () =>
  typeof navigator !== "undefined" &&
  "serviceWorker" in navigator &&
  typeof window !== "undefined" &&
  "PushManager" in window;

export const getExistingPushSubscription = async () => {
  const registration = await getServiceWorkerRegistration();
  return registration.pushManager.getSubscription();
};

export const subscribeToPushNotifications = async (publicKey: string) => {
  const registration = await getServiceWorkerRegistration();
  const current = await registration.pushManager.getSubscription();

  return current ?? registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: decodeApplicationServerKey(publicKey),
  });
};

export const unsubscribeFromPushNotifications = async () => {
  if (!isBackgroundPushSupported()) {
    return false;
  }

  const subscription = await getExistingPushSubscription();
  return subscription ? subscription.unsubscribe() : true;
};
