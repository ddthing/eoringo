import { z } from "zod";
import { createDomainCodec, idSchema, shortTextSchema } from "./common";

export const characterSchema = z
  .object({
    id: idSchema,
    name: z.string().trim().min(1).max(40),
    server: z.string().trim().min(1).max(80),
    isMain: z.boolean(),
    profileImageId: shortTextSchema.optional(),
  })
  .strict();

const charactersPayloadSchema = z
  .object({
    characters: z.array(characterSchema).max(50),
    activeCharacterId: idSchema,
  })
  .strict()
  .superRefine((value, context) => {
    const ids = value.characters.map((character) => character.id);

    if (new Set(ids).size !== ids.length) {
      context.addIssue({ code: "custom", message: "Character IDs must be unique." });
    }

    if (!ids.includes(value.activeCharacterId)) {
      context.addIssue({ code: "custom", message: "Active character must exist." });
    }

    if (value.characters.filter((character) => character.isMain).length !== 1) {
      context.addIssue({ code: "custom", message: "Exactly one main character is required." });
    }
  });

export type CharactersPayload = z.infer<typeof charactersPayloadSchema>;

export const charactersCodec = createDomainCodec(charactersPayloadSchema, {
  schemaVersion: 1,
  maxBytes: 64 * 1024,
});
