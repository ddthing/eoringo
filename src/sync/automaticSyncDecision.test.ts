import { describe, expect, it } from "vitest";
import { decideAutomaticSync } from "./automaticSyncDecision";

describe("automatic sync decision", () => {
  it.each([
    ["hydrate-remote", { remoteDocumentCount: 6, hasMeaningfulLocalData: false, isGuestLink: false }],
    ["migrate-local", { remoteDocumentCount: 0, hasMeaningfulLocalData: true, isGuestLink: true }],
    ["enable-empty", { remoteDocumentCount: 0, hasMeaningfulLocalData: false, isGuestLink: false }],
    ["manual-choice", { remoteDocumentCount: 6, hasMeaningfulLocalData: true, isGuestLink: true }],
    ["manual-choice", { remoteDocumentCount: 0, hasMeaningfulLocalData: true, isGuestLink: false }],
  ] as const)("returns %s for the safe data boundary", (expected, input) => {
    expect(decideAutomaticSync(input)).toBe(expected);
  });
});
