import { z } from "zod";
import { boundedRecord, createDomainCodec, dateKeySchema, idSchema } from "./common";

const ddayEventSchema = z
  .object({
    id: idSchema,
    title: z.string().trim().min(1).max(120),
    date: dateKeySchema,
    characterId: idSchema.optional(),
  })
  .strict();

const ddayPayloadSchema = z
  .object({
    eventsByCharacter: boundedRecord(z.array(ddayEventSchema).max(200), 50),
  })
  .strict();

export type DdayPayload = z.infer<typeof ddayPayloadSchema>;

export const ddayCodec = createDomainCodec(ddayPayloadSchema, {
  schemaVersion: 1,
  maxBytes: 128 * 1024,
});
