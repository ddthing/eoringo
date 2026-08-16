import { describe, expect, it } from "vitest";
import {
  buildNotificationSourceFromDocuments,
  createNotificationSource,
  digestNotificationSource,
} from "./notificationSource";

const source = createNotificationSource(
  [
    { id: "character-1", name: "모험가" },
    { id: "character-2", name: "부캐" },
  ],
  {
    completedByCharacter: {
      "character-1": { "daily-a": 1 },
      "character-2": {},
    },
    customTaskTemplatesByCharacter: {
      "character-1": [],
      "character-2": [],
    },
    disabledDefaultTaskIdsByCharacter: {
      "character-1": ["daily-b"],
      "character-2": [],
    },
  },
);

describe("notification source digest", () => {
  it("is stable when object keys arrive in a different order", async () => {
    const digest = await digestNotificationSource(source);
    const reorderedDigest = await digestNotificationSource({
      ...source,
      completedByCharacter: {
        "character-2": {},
        "character-1": { "daily-a": 1 },
      },
      customTaskTemplatesByCharacter: {
        "character-2": [],
        "character-1": [],
      },
      disabledDefaultTaskIdsByCharacter: {
        "character-2": [],
        "character-1": ["daily-b"],
      },
    });

    expect(digest).toMatch(/^[0-9a-f]{64}$/);
    expect(reorderedDigest).toBe(digest);
  });

  it("reconstructs the same source projection from remote documents", async () => {
    const remoteSource = buildNotificationSourceFromDocuments([
      {
        document_type: "characters",
        payload: {
          characters: [
            { id: "character-1", name: "모험가", server: "초코보" },
            { id: "character-2", name: "부캐", server: "초코보" },
          ],
          activeCharacterId: "character-1",
        },
      },
      {
        document_type: "tasks",
        payload: {
          completedByCharacter: {
            "character-1": { "daily-a": 1 },
            "character-2": {},
          },
          completedAtByCharacter: {},
          customTaskTemplatesByCharacter: {
            "character-1": [],
            "character-2": [],
          },
          disabledDefaultTaskIdsByCharacter: {
            "character-1": ["daily-b"],
            "character-2": [],
          },
          dailyResetKey: "2026-08-15",
          weeklyResetKey: "2026-W33",
          resetKeysByRule: {},
        },
      },
    ]);

    expect(remoteSource).not.toBeNull();
    await expect(digestNotificationSource(remoteSource!)).resolves.toBe(
      await digestNotificationSource(source),
    );
  });

  it("rejects incomplete or duplicate remote documents", () => {
    expect(buildNotificationSourceFromDocuments([])).toBeNull();
    expect(
      buildNotificationSourceFromDocuments([
        { document_type: "characters", payload: {} },
        { document_type: "characters", payload: {} },
      ]),
    ).toBeNull();
  });
});
