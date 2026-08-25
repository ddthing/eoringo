import { describe, expect, it } from "vitest";
import { allowanceCodec } from "./allowance";
import { charactersCodec } from "./characters";
import { canonicalStringify } from "./common";
import { ddayCodec } from "./dday";
import { historyCodec } from "./history";
import { memoCodec } from "./memo";
import { tasksCodec } from "./tasks";

const characterId = "character-1";

const validCharacters = {
  characters: [{ id: characterId, name: "Alice", server: "Chocobo", isMain: true }],
  activeCharacterId: characterId,
};

const validTasks = {
  completedByCharacter: { [characterId]: { task: 1 } },
  completedAtByCharacter: { [characterId]: { task: "2026-08-01T00:00:00.000Z" } },
  customTaskTemplatesByCharacter: { [characterId]: [] },
  disabledDefaultTaskIdsByCharacter: { [characterId]: [] },
  dailyResetKey: "2026-08-01",
  weeklyResetKey: "2026-W31",
  resetKeysByRule: { "daily-midnight": "2026-08-01" },
};

const validDday = {
  eventsByCharacter: {
    [characterId]: [{ id: "event-1", title: "Event", date: "2026-08-02", characterId }],
  },
};

const validMemo = { memosByCharacter: { [characterId]: "memo" } };
const validAllowance = { value: 42, lastAccrualKey: "2026-08-01T00:00:00.000Z" };
const validHistory = { entriesByDate: {} };

describe("remote domain codecs", () => {
  it.each([
    ["characters", charactersCodec, validCharacters],
    ["tasks", tasksCodec, validTasks],
    ["dday", ddayCodec, validDday],
    ["memo", memoCodec, validMemo],
    ["allowance", allowanceCodec, validAllowance],
    ["history", historyCodec, validHistory],
  ] as const)("accepts the current %s persisted shape", (_name, codec, value) => {
    expect(codec.parse(value)).toEqual(value);
  });

  it("serializes object keys deterministically", () => {
    expect(canonicalStringify({ z: 1, a: { d: 2, b: 3 } })).toBe(
      '{"a":{"b":3,"d":2},"z":1}',
    );
  });

  it("rejects unknown fields", () => {
    expect(() => allowanceCodec.parse({ ...validAllowance, admin: true })).toThrow();
  });

  it("rejects malformed dates and non-finite values", () => {
    expect(() => ddayCodec.parse({
      eventsByCharacter: {
        [characterId]: [{ id: "event-1", title: "Event", date: "tomorrow" }],
      },
    })).toThrow();
    expect(() => ddayCodec.parse({
      eventsByCharacter: {
        [characterId]: [{ id: "event-1", title: "Event", date: "2026-02-29" }],
      },
    })).toThrow();
    expect(() => allowanceCodec.parse({ value: Number.POSITIVE_INFINITY, lastAccrualKey: "x" })).toThrow();
  });

  it("rejects payloads above the domain byte limit", () => {
    expect(() => memoCodec.parse({ memosByCharacter: { [characterId]: "x".repeat(200_000) } })).toThrow(
      "byte limit",
    );
  });

  it("rejects prototype-pollution-shaped record keys", () => {
    const memosByCharacter = Object.fromEntries([["__proto__", "unsafe"]]);
    expect(() => memoCodec.parse({ memosByCharacter })).toThrow("not allowed");
  });

  it("requires exactly one main character and a valid active character", () => {
    expect(() => charactersCodec.parse({
      characters: [{ id: characterId, name: "Alice", server: "Chocobo", isMain: false }],
      activeCharacterId: "missing",
    })).toThrow();
  });
});
