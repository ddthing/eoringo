import { z } from "zod";
import { boundedRecord, createDomainCodec, idSchema, isoTimestampSchema } from "./common";

const resetRuleIds = [
  "daily-midnight",
  "daily-0500",
  "daily-1700",
  "weekly-tue-1700",
  "weekly-fri-1700",
  "weekly-sat-2100",
  "interval-18h",
  "manual",
] as const;

const taskTemplateSchema = z
  .object({
    id: idSchema,
    title: z.string().trim().min(1).max(120),
    description: z.string().max(500).optional(),
    category: z.enum(["daily", "weekly", "custom"]),
    resetType: z.enum(["daily", "weekly", "eighteenHours", "manual"]),
    resetRuleId: z.enum(resetRuleIds),
    availabilityRuleId: z.enum(resetRuleIds).optional(),
    retentionDays: z.number().int().min(1).max(3650).optional(),
    maxCount: z.number().int().min(1).max(1_000_000),
    enabledByDefault: z.boolean(),
    characterScoped: z.boolean(),
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
    priority: z.number().int().min(0).max(1_000_000),
    icon: z.string().max(80).optional(),
    note: z.string().max(1000).optional(),
    isDefault: z.literal(false),
  })
  .strict();

const taskCountSchema = z.union([z.boolean(), z.number().int().min(0).max(1_000_000)]);
const taskCountsSchema = boundedRecord(taskCountSchema, 1000);
const completedByCharacterSchema = boundedRecord(taskCountsSchema, 50);
const completedAtSchema = boundedRecord(isoTimestampSchema, 1000);
const completedAtByCharacterSchema = boundedRecord(completedAtSchema, 50);
const customTasksByCharacterSchema = boundedRecord(z.array(taskTemplateSchema).max(500), 50);
const disabledByCharacterSchema = boundedRecord(z.array(idSchema).max(1000), 50);

const tasksPayloadSchema = z
  .object({
    completedByCharacter: completedByCharacterSchema,
    completedAtByCharacter: completedAtByCharacterSchema,
    customTaskTemplatesByCharacter: customTasksByCharacterSchema,
    disabledDefaultTaskIdsByCharacter: disabledByCharacterSchema,
    dailyResetKey: z.string().max(80),
    weeklyResetKey: z.string().max(80),
    resetKeysByRule: z.partialRecord(z.enum(resetRuleIds), z.string().max(80)),
  })
  .strict();

export type TasksPayload = z.infer<typeof tasksPayloadSchema>;

export const tasksCodec = createDomainCodec(tasksPayloadSchema, {
  schemaVersion: 1,
  maxBytes: 512 * 1024,
});
