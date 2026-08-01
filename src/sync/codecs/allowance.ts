import { z } from "zod";
import { createDomainCodec } from "./common";

const allowancePayloadSchema = z
  .object({
    value: z.number().int().min(0).max(100),
    lastAccrualKey: z.string().max(80),
  })
  .strict();

export type AllowancePayload = z.infer<typeof allowancePayloadSchema>;

export const allowanceCodec = createDomainCodec(allowancePayloadSchema, {
  schemaVersion: 1,
  maxBytes: 4 * 1024,
});
