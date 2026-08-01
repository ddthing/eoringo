import { z } from "zod";
import {
  boundedRecord,
  createDomainCodec,
  dateKeySchema,
  idSchema,
  isoTimestampSchema,
} from "./common";

const progressSchema = z
  .object({
    total: z.number().int().min(0).max(5000),
    completed: z.number().int().min(0).max(5000),
    percent: z.number().int().min(0).max(100),
  })
  .strict();

const historyTaskSchema = z
  .object({
    id: idSchema,
    title: z.string().trim().min(1).max(120),
    category: z.enum(["daily", "weekly", "custom"]),
    group: z.enum([
      "roulette",
      "delivery",
      "combat",
      "pvp",
      "housing",
      "lifestyle",
      "event",
      "custom",
    ]),
    resetType: z.enum(["daily", "weekly", "eighteenHours", "manual"]),
    resetRuleId: z
      .enum([
        "daily-midnight",
        "daily-0500",
        "daily-1700",
        "weekly-tue-1700",
        "weekly-fri-1700",
        "weekly-sat-2100",
        "interval-18h",
        "manual",
      ])
      .optional(),
    maxCount: z.number().int().min(1).max(1_000_000),
    count: z.number().int().min(0).max(1_000_000),
    completed: z.boolean(),
  })
  .strict();

const historyDdaySchema = z
  .object({
    id: idSchema,
    title: z.string().trim().min(1).max(120),
    date: dateKeySchema,
    characterId: idSchema.optional(),
  })
  .strict();

const characterHistorySchema = z
  .object({
    character: z
      .object({
        id: idSchema,
        name: z.string().trim().min(1).max(40),
        server: z.string().max(80),
        isMain: z.boolean(),
      })
      .strict(),
    tasks: z.array(historyTaskSchema).max(1000),
    memo: z.string().max(16_000),
    progress: z
      .object({
        daily: progressSchema,
        weekly: progressSchema,
        other: progressSchema,
        total: progressSchema,
      })
      .strict(),
    ddayEvents: z.array(historyDdaySchema).max(200),
  })
  .strict();

const historyDaySchema = z
  .object({
    date: dateKeySchema,
    capturedAt: isoTimestampSchema,
    characters: boundedRecord(characterHistorySchema, 50),
  })
  .strict();

const historyPayloadSchema = z
  .object({
    entriesByDate: boundedRecord(historyDaySchema, 400),
  })
  .strict();

export type HistoryPayload = z.infer<typeof historyPayloadSchema>;

export const historyCodec = createDomainCodec(historyPayloadSchema, {
  schemaVersion: 1,
  maxBytes: 2 * 1024 * 1024,
});
