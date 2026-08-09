import { describe, expect, it } from "vitest";
import { isSafeJsonTree } from "./jsonSafety";

describe("remote JSON safety bounds", () => {
  it("rejects prototype keys, oversized strings, and deeply nested values", () => {
    expect(isSafeJsonTree(JSON.parse('{"nested":{"__proto__":"unsafe"}}'))).toBe(false);
    expect(isSafeJsonTree({ nested: "x".repeat(16001) })).toBe(false);

    let nested: unknown = "leaf";
    for (let index = 0; index < 26; index += 1) {
      nested = { nested };
    }

    expect(isSafeJsonTree(nested)).toBe(false);
  });

  it("accepts bounded application payload primitives", () => {
    expect(
      isSafeJsonTree({
        characters: [{ id: "character-a", isMain: true }],
        activeCharacterId: "character-a",
      }),
    ).toBe(true);
  });
});
