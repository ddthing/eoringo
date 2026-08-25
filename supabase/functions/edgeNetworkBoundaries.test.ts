import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const edgeFunctionFiles = [
  "manage-push-subscription/index.ts",
  "migrate-local-data/index.ts",
  "send-daily-task-notifications/index.ts",
  "sync-character-images/index.ts",
] as const;

describe("Edge Function outbound network boundaries", () => {
  it("routes outbound fetch calls through the abortable timeout helper", () => {
    for (const relativePath of edgeFunctionFiles) {
      const source = readFileSync(new URL(`./${relativePath}`, import.meta.url), "utf8");

      expect(source, relativePath).toContain("fetchWithTimeout");
      expect(source, relativePath).not.toMatch(/\bfetch\s*\(/);
    }
  });
});
