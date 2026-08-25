import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const globalsCss = readFileSync(new URL("./globals.css", import.meta.url), "utf8");

describe("responsive dashboard layout", () => {
  it("uses one column by default and opts into the split canvas on desktop", () => {
    const baseRuleIndex = globalsCss.lastIndexOf(
      ".home-dashboard-columns {\n  display: grid;\n  grid-template-columns: minmax(0, 1fr);",
    );
    const desktopGridIndex = globalsCss.lastIndexOf(
      "grid-template-columns: minmax(0, 7fr) minmax(0, 5fr);",
    );
    const desktopOverrideIndex = globalsCss.lastIndexOf(
      "@media (min-width: 64rem) {",
      desktopGridIndex,
    );

    expect(baseRuleIndex).toBeGreaterThan(-1);
    expect(desktopOverrideIndex).toBeGreaterThan(baseRuleIndex);
    expect(desktopGridIndex).toBeGreaterThan(desktopOverrideIndex);
  });

  it("keeps the desktop navigation cascade in one media block", () => {
    expect(globalsCss.match(/@media \(min-width: 64rem\) \{/g)).toHaveLength(1);
    expect(globalsCss).not.toContain("height: 56px;");
    expect(globalsCss).not.toContain("position: static;");
  });
});
