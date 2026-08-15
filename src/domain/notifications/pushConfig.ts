const base64UrlPattern = /^[A-Za-z0-9_-]+$/;

export const parseWebPushPublicKey = (value: unknown): string | null =>
  typeof value === "string" &&
  value.length >= 80 &&
  value.length <= 128 &&
  base64UrlPattern.test(value)
    ? value
    : null;

export const webPushPublicKey = parseWebPushPublicKey(
  import.meta.env.VITE_WEB_PUSH_PUBLIC_KEY,
);
