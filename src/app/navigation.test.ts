import { describe, expect, it } from "vitest";
import {
  bottomNavItems,
  charactersSettingsTarget,
  legacyCharactersPath,
} from "./navigation";

describe("navigation structure", () => {
  it("keeps the four requested primary destinations in order", () => {
    expect(bottomNavItems.map(({ label }) => label)).toEqual([
      "오늘",
      "숙제",
      "일정",
      "설정",
    ]);
    expect(bottomNavItems.map(({ to }) => String(to))).not.toContain(legacyCharactersPath);
  });

  it("keeps the legacy character URL mapped to the Settings character anchor", () => {
    expect(legacyCharactersPath).toBe("/characters");
    expect(charactersSettingsTarget).toBe("/settings#characters");
  });
});
