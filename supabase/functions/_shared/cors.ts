const localOrigins = ["http://127.0.0.1:5173", "http://localhost:5173"] as const;
export const defaultProductionOrigin = "https://eoringo.pages.dev";

export const resolveAllowedOrigins = (configured: string, allowLocalOrigins: boolean) => {
  const origins = configured
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  return new Set([
    ...(origins.length > 0 ? origins : [defaultProductionOrigin]),
    ...(allowLocalOrigins ? localOrigins : []),
  ]);
};

export const isAllowedOrigin = (origin: string | null, allowedOrigins: Set<string>) =>
  Boolean(origin && allowedOrigins.has(origin));
