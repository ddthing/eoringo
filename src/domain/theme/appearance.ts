export type AppearanceMode = "system" | "light" | "dark";
export type ResolvedAppearance = "light" | "dark";

export const defaultAppearanceMode: AppearanceMode = "system";

export const isAppearanceMode = (value: unknown): value is AppearanceMode =>
  value === "system" || value === "light" || value === "dark";

export const resolveAppearance = (
  appearanceMode: AppearanceMode,
  systemPrefersDark: boolean,
): ResolvedAppearance =>
  appearanceMode === "system"
    ? systemPrefersDark
      ? "dark"
      : "light"
    : appearanceMode;

export const getThemeDocumentState = (appearance: ResolvedAppearance) =>
  appearance === "dark"
    ? { colorScheme: "dark", themeColor: "#15181d" }
    : { colorScheme: "light", themeColor: "#f4f6f8" };
