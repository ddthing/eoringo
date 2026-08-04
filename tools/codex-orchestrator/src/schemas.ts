import { OrchestratorError } from "./errors.js";
import type { Difficulty, PlanTask, SolPlan, SolReview, WorkerResult } from "./types.js";

const stringArraySchema = { type: "array", items: { type: "string" } } as const;

export const solPlanJsonSchema: Record<string, unknown> = {
  type: "object",
  properties: {
    summary: { type: "string" },
    tasks: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          goal: { type: "string" },
          dependencies: stringArraySchema,
          readFiles: stringArraySchema,
          writableFiles: stringArraySchema,
          completionCriteria: stringArraySchema,
          difficulty: { type: "string", enum: ["easy", "medium", "hard"] },
        },
        required: ["id", "goal", "dependencies", "readFiles", "writableFiles", "completionCriteria", "difficulty"],
        additionalProperties: false,
      },
    },
  },
  required: ["summary", "tasks"],
  additionalProperties: false,
};

export const workerResultJsonSchema: Record<string, unknown> = {
  type: "object",
  properties: {
    taskId: { type: "string" },
    status: { type: "string", enum: ["completed", "failed"] },
    summary: { type: "string" },
    changedFiles: stringArraySchema,
    tests: {
      type: "array",
      items: {
        type: "object",
        properties: {
          command: { type: "string" },
          result: { type: "string" },
          passed: { type: "boolean" },
        },
        required: ["command", "result", "passed"],
        additionalProperties: false,
      },
    },
    criteriaMet: { type: "boolean" },
    risks: stringArraySchema,
    commit: { type: ["string", "null"] },
    patch: { type: ["string", "null"] },
    failureReason: { type: ["string", "null"] },
  },
  required: ["taskId", "status", "summary", "changedFiles", "tests", "criteriaMet", "risks", "commit", "patch", "failureReason"],
  additionalProperties: false,
};

export const solReviewJsonSchema: Record<string, unknown> = {
  type: "object",
  properties: {
    approved: { type: "boolean" },
    summary: { type: "string" },
    taskReviews: {
      type: "array",
      items: {
        type: "object",
        properties: {
          taskId: { type: "string" },
          status: { type: "string", enum: ["approved", "retry", "failed"] },
          instructions: { type: ["string", "null"] },
          risks: stringArraySchema,
        },
        required: ["taskId", "status", "instructions", "risks"],
        additionalProperties: false,
      },
    },
    applyOrder: stringArraySchema,
  },
  required: ["approved", "summary", "taskReviews", "applyOrder"],
  additionalProperties: false,
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);
const isStrings = (value: unknown): value is string[] => Array.isArray(value) && value.every((x) => typeof x === "string");
const requiredString = (value: unknown, field: string): string => {
  if (typeof value !== "string" || !value.trim()) throw new OrchestratorError("SCHEMA_VALIDATION", `${field}는 비어 있지 않은 문자열이어야 합니다.`);
  return value;
};
const nullableString = (value: unknown, field: string): string | null => {
  if (value === null) return null;
  return requiredString(value, field);
};

const parseJson = (text: string, label: string): unknown => {
  try {
    return JSON.parse(text);
  } catch {
    throw new OrchestratorError("INVALID_STRUCTURED_OUTPUT", `${label} 결과가 유효한 JSON이 아닙니다.`);
  }
};

const parseTask = (value: unknown): PlanTask => {
  if (!isRecord(value)) throw new OrchestratorError("SCHEMA_VALIDATION", "계획 태스크가 객체가 아닙니다.");
  const difficulty = value.difficulty;
  if (!["easy", "medium", "hard"].includes(String(difficulty))) throw new OrchestratorError("SCHEMA_VALIDATION", "difficulty 값이 잘못됐습니다.");
  for (const field of ["dependencies", "readFiles", "writableFiles", "completionCriteria"] as const) {
    if (!isStrings(value[field])) throw new OrchestratorError("SCHEMA_VALIDATION", `${field}는 문자열 배열이어야 합니다.`);
  }
  return {
    id: requiredString(value.id, "task.id"),
    goal: requiredString(value.goal, "task.goal"),
    dependencies: value.dependencies as string[],
    readFiles: value.readFiles as string[],
    writableFiles: value.writableFiles as string[],
    completionCriteria: value.completionCriteria as string[],
    difficulty: difficulty as Difficulty,
  };
};

export const parseSolPlan = (text: string): SolPlan => {
  const value = parseJson(text, "Sol 계획");
  if (!isRecord(value) || !Array.isArray(value.tasks)) throw new OrchestratorError("SCHEMA_VALIDATION", "Sol 계획 형식이 잘못됐습니다.");
  return { summary: requiredString(value.summary, "summary"), tasks: value.tasks.map(parseTask) };
};

export const parseWorkerResult = (text: string): WorkerResult => {
  const value = parseJson(text, "Luna 워커");
  if (!isRecord(value) || !isStrings(value.changedFiles) || !isStrings(value.risks) || !Array.isArray(value.tests)) {
    throw new OrchestratorError("SCHEMA_VALIDATION", "Luna 결과 형식이 잘못됐습니다.");
  }
  const status = value.status;
  if (status !== "completed" && status !== "failed") throw new OrchestratorError("SCHEMA_VALIDATION", "워커 status가 잘못됐습니다.");
  const tests = value.tests.map((test, index) => {
    if (!isRecord(test) || typeof test.passed !== "boolean") throw new OrchestratorError("SCHEMA_VALIDATION", `tests[${index}] 형식이 잘못됐습니다.`);
    return { command: requiredString(test.command, `tests[${index}].command`), result: requiredString(test.result, `tests[${index}].result`), passed: test.passed };
  });
  if (typeof value.criteriaMet !== "boolean") throw new OrchestratorError("SCHEMA_VALIDATION", "criteriaMet은 boolean이어야 합니다.");
  return {
    taskId: requiredString(value.taskId, "taskId"),
    status,
    summary: requiredString(value.summary, "summary"),
    changedFiles: value.changedFiles,
    tests,
    criteriaMet: value.criteriaMet,
    risks: value.risks,
    commit: nullableString(value.commit, "commit"),
    patch: nullableString(value.patch, "patch"),
    failureReason: nullableString(value.failureReason, "failureReason"),
  };
};

export const parseSolReview = (text: string): SolReview => {
  const value = parseJson(text, "Sol 검수");
  if (!isRecord(value) || typeof value.approved !== "boolean" || !Array.isArray(value.taskReviews) || !isStrings(value.applyOrder)) {
    throw new OrchestratorError("SCHEMA_VALIDATION", "Sol 검수 형식이 잘못됐습니다.");
  }
  const taskReviews = value.taskReviews.map((review, index) => {
    if (!isRecord(review) || !isStrings(review.risks) || !["approved", "retry", "failed"].includes(String(review.status))) {
      throw new OrchestratorError("SCHEMA_VALIDATION", `taskReviews[${index}] 형식이 잘못됐습니다.`);
    }
    return {
      taskId: requiredString(review.taskId, `taskReviews[${index}].taskId`),
      status: review.status as "approved" | "retry" | "failed",
      instructions: nullableString(review.instructions, `taskReviews[${index}].instructions`),
      risks: review.risks,
    };
  });
  return { approved: value.approved, summary: requiredString(value.summary, "summary"), taskReviews, applyOrder: value.applyOrder };
};
