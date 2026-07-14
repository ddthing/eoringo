import { describe, expect, it } from "vitest";
import {
  getThemeDocumentState,
  isAppearanceMode,
  resolveAppearance,
} from "./appearance";

describe("appearance helpers", () => {
  it("recognizes supported appearance preferences", () => {
    expect(isAppearanceMode("system")).toBe(true);
    expect(isAppearanceMode("light")).toBe(true);
    expect(isAppearanceMode("dark")).toBe(true);
    expect(isAppearanceMode("sepia")).toBe(false);
  });

  it("resolves system and manual preferences", () => {
    expect(resolveAppearance("system", true)).toBe("dark");
    expect(resolveAppearance("system", false)).toBe("light");
    expect(resolveAppearance("light", true)).toBe("light");
    expect(resolveAppearance("dark", false)).toBe("dark");
  });

  it("provides root document values for both modes", () => {
    expect(getThemeDocumentState("light")).toEqual({
      colorScheme: "light",
      themeColor: "#f4f6f8",
    });
    expect(getThemeDocumentState("dark")).toEqual({
      colorScheme: "dark",
      themeColor: "#15181d",
    });
  });
});
