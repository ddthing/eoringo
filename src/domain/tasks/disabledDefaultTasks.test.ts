import { describe, expect, it } from "vitest";
import {
  getDisabledDefaultTaskIdsForCharacter,
  migrateLegacyDisabledDefaultTaskIds,
} from "./disabledDefaultTasks";

describe("disabled default task helpers", () => {
  it("keeps character scoped disabled task ids separate by character", () => {
    const disabledByCharacter = {
      characterA: ["daily-expert"],
      characterB: [],
    };

    expect(
      getDisabledDefaultTaskIdsForCharacter(disabledByCharacter, [], "characterA"),
    ).toContain("daily-expert");
    expect(
      getDisabledDefaultTaskIdsForCharacter(disabledByCharacter, [], "characterB"),
    ).not.toContain("daily-expert");
    expect(
      getDisabledDefaultTaskIdsForCharacter(disabledByCharacter, [], "characterA"),
    ).toContain("daily-expert");
  });

  it("migrates legacy disabled task ids into the active character scope", () => {
    expect(
      migrateLegacyDisabledDefaultTaskIds(["daily-expert"], "active-character"),
    ).toMatchObject({
      disabledDefaultTaskIdsByCharacter: {
        "active-character": ["daily-expert"],
      },
      disabledGlobalDefaultTaskIds: [],
    });
  });
});
