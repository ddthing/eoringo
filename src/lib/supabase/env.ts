export type RemoteSyncEnvironment =
  | {
      enabled: false;
      imageUploadsEnabled: false;
    }
  | {
      enabled: true;
      imageUploadsEnabled: boolean;
      supabaseUrl: string;
      publishableKey: string;
    };

type EnvironmentSource = Record<string, string | boolean | undefined>;

const forbiddenBrowserKeyFragments = [
  "SERVICE_ROLE",
  "SECRET_KEY",
  "DATABASE_URL",
  "DB_PASSWORD",
  "SUPABASE_DB",
];

const readBoolean = (value: string | boolean | undefined, name: string) => {
  if (value === true || value === "true") {
    return true;
  }

  if (value === false || value === "false" || value === undefined || value === "") {
    return false;
  }

  throw new Error(`${name} must be either true or false.`);
};

const assertNoPrivilegedBrowserValues = (source: EnvironmentSource) => {
  const exposedForbiddenKey = Object.entries(source).find(
    ([name, value]) =>
      Boolean(value) &&
      forbiddenBrowserKeyFragments.some((fragment) => name.toUpperCase().includes(fragment)),
  );

  if (exposedForbiddenKey) {
    throw new Error(`${exposedForbiddenKey[0]} must never be exposed to the browser.`);
  }
};

const isPublishableKey = (value: string) =>
  value.startsWith("sb_publishable_") || (value.startsWith("eyJ") && value.split(".").length === 3);

export const parseRemoteSyncEnvironment = (
  source: EnvironmentSource,
  options: { production: boolean },
): RemoteSyncEnvironment => {
  assertNoPrivilegedBrowserValues(source);

  const enabled = readBoolean(source.VITE_REMOTE_SYNC_ENABLED, "VITE_REMOTE_SYNC_ENABLED");
  const imageUploadsEnabled = readBoolean(
    source.VITE_IMAGE_UPLOADS_ENABLED,
    "VITE_IMAGE_UPLOADS_ENABLED",
  );

  if (!enabled) {
    return { enabled: false, imageUploadsEnabled: false };
  }

  const rawUrl = source.VITE_SUPABASE_URL;
  const publishableKey = source.VITE_SUPABASE_PUBLISHABLE_KEY;

  if (typeof rawUrl !== "string" || !rawUrl.trim()) {
    throw new Error("VITE_SUPABASE_URL is required when remote sync is enabled.");
  }

  if (typeof publishableKey !== "string" || !isPublishableKey(publishableKey)) {
    throw new Error("VITE_SUPABASE_PUBLISHABLE_KEY must be a publishable Supabase key.");
  }

  let supabaseUrl: URL;

  try {
    supabaseUrl = new URL(rawUrl);
  } catch {
    throw new Error("VITE_SUPABASE_URL must be a valid URL.");
  }

  const isLocalHost = ["localhost", "127.0.0.1"].includes(supabaseUrl.hostname);

  if (options.production && (supabaseUrl.protocol !== "https:" || isLocalHost)) {
    throw new Error("Production remote sync requires a non-local HTTPS Supabase URL.");
  }

  if (!options.production && !["http:", "https:"].includes(supabaseUrl.protocol)) {
    throw new Error("Local Supabase URLs must use HTTP or HTTPS.");
  }

  return {
    enabled: true,
    imageUploadsEnabled,
    supabaseUrl: supabaseUrl.toString().replace(/\/$/, ""),
    publishableKey,
  };
};

export const remoteSyncEnvironment = parseRemoteSyncEnvironment(import.meta.env, {
  production: import.meta.env.PROD,
});
