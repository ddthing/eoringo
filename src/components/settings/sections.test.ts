import { describe, expect, it } from "vitest";
import { getSettingsSectionId, settingsSectionIds } from "./sections";

describe("Settings sections", () => {
  it("keeps the requested section order", () => {
    expect(settingsSectionIds).toEqual([
      "characters",
      "theme",
      "notifications",
      "backup",
      "data",
      "about",
    ]);
  });

  it("recognizes known hashes and ignores unknown anchors", () => {
    expect(getSettingsSectionId("#characters")).toBe("characters");
    expect(getSettingsSectionId("#about")).toBe("about");
    expect(getSettingsSectionId("#unknown")).toBeNull();
    expect(getSettingsSectionId("")).toBeNull();
  });
});
