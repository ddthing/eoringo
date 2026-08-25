import { z } from "zod";
import { isValidDateKey } from "../../domain/dateKey";

export type DomainCodec<T> = {
  schemaVersion: number;
  maxBytes: number;
  parse: (value: unknown) => T;
  serialize: (value: T) => string;
};

const forbiddenRecordKeys = new Set(["__proto__", "constructor", "prototype"]);

export const idSchema = z
  .string()
  .trim()
  .min(1)
  .max(128)
  .refine((value) => !forbiddenRecordKeys.has(value), "Reserved object keys are not allowed.");
export const shortTextSchema = z.string().max(256);
export const isoTimestampSchema = z.iso.datetime({ offset: true });
export const dateKeySchema = z.string().refine(isValidDateKey, "유효한 날짜가 아닙니다.");

export const boundedRecord = <T extends z.ZodType>(valueSchema: T, maxEntries: number) =>
  z
    .record(idSchema, valueSchema)
    .superRefine((value, context) => {
      const keys = Object.keys(value);

      if (keys.length > maxEntries) {
        context.addIssue({
          code: "custom",
          message: `Record may contain at most ${maxEntries} entries.`,
        });
      }

      keys.forEach((key) => {
        if (forbiddenRecordKeys.has(key)) {
          context.addIssue({
            code: "custom",
            message: `Record key ${key} is not allowed.`,
          });
        }
      });
    });

const canonicalize = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(canonicalize);
  }

  if (typeof value === "object" && value !== null) {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, child]) => [key, canonicalize(child)]),
    );
  }

  return value;
};

export const canonicalStringify = (value: unknown) => JSON.stringify(canonicalize(value));

export const getJsonByteLength = (value: unknown) =>
  new TextEncoder().encode(canonicalStringify(value)).byteLength;

const assertNoForbiddenKeys = (value: unknown, seen = new WeakSet<object>()) => {
  if (typeof value !== "object" || value === null || seen.has(value)) {
    return;
  }

  seen.add(value);

  Object.keys(value).forEach((key) => {
    if (forbiddenRecordKeys.has(key)) {
      throw new Error(`Record key ${key} is not allowed.`);
    }

    assertNoForbiddenKeys((value as Record<string, unknown>)[key], seen);
  });
};

export const createDomainCodec = <T>(
  schema: z.ZodType<T>,
  options: { schemaVersion: number; maxBytes: number },
): DomainCodec<T> => ({
  ...options,
  parse: (value) => {
    assertNoForbiddenKeys(value);

    if (getJsonByteLength(value) > options.maxBytes) {
      throw new Error(`Document exceeds the ${options.maxBytes} byte limit.`);
    }

    return schema.parse(value);
  },
  serialize: (value) => canonicalStringify(schema.parse(value)),
});
