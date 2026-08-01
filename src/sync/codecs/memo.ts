import { z } from "zod";
import { boundedRecord, createDomainCodec } from "./common";

const memoPayloadSchema = z
  .object({
    memosByCharacter: boundedRecord(z.string().max(16_000), 50),
  })
  .strict();

export type MemoPayload = z.infer<typeof memoPayloadSchema>;

export const memoCodec = createDomainCodec(memoPayloadSchema, {
  schemaVersion: 1,
  maxBytes: 128 * 1024,
});
