export const DEFAULT_SITE_ORIGIN = "https://eoringo.pages.dev";

const stripTrailingSlashes = (value: string) => value.replace(/\/+$/, "");

const configuredSiteOrigin = stripTrailingSlashes(
  import.meta.env.VITE_PUBLIC_SITE_ORIGIN?.trim() || DEFAULT_SITE_ORIGIN,
);

export const getRuntimeSiteOrigin = () =>
  typeof window === "undefined"
    ? configuredSiteOrigin
    : stripTrailingSlashes(window.location.origin);
