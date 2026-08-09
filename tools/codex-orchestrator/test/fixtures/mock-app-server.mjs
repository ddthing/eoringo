import { appendFileSync } from "node:fs";
import { createInterface } from "node:readline";

let initialized = false;
let nextThread = 1;
let nextTurn = 1;
let rateRead = 0;

const send = (message) => process.stdout.write(`${JSON.stringify(message)}\n`);
const trace = (message) => {
  if (process.env.MOCK_TRACE_FILE) appendFileSync(process.env.MOCK_TRACE_FILE, `${JSON.stringify(message)}\n`, "utf8");
};

const model = (id, efforts) => ({
  id,
  model: id,
  displayName: id,
  hidden: false,
  supportedReasoningEfforts: efforts.map((reasoningEffort) => ({ reasoningEffort, description: reasoningEffort })),
  defaultReasoningEffort: efforts[0],
});

const planResult = {
  summary: "Mock two-task plan",
  tasks: [
    { id: "inspect", goal: "Inspect safely", dependencies: [], readFiles: ["README.md"], writableFiles: ["docs/inspect.md"], completionCriteria: ["inspection recorded"], difficulty: "easy" },
    { id: "test", goal: "Test safely", dependencies: [], readFiles: ["package.json"], writableFiles: ["docs/test.md"], completionCriteria: ["tests recorded"], difficulty: "hard" },
  ],
};

const workerResult = (taskId) => ({
  taskId,
  status: "completed",
  summary: `Mock completed ${taskId}`,
  changedFiles: [],
  tests: [{ command: "mock-test", result: "passed", passed: true }],
  criteriaMet: true,
  risks: [],
  commit: null,
  patch: null,
  failureReason: null,
});

const reviewResult = {
  approved: true,
  summary: "Mock review approved",
  taskReviews: [
    { taskId: "inspect", status: "approved", instructions: null, risks: [] },
    { taskId: "test", status: "approved", instructions: null, risks: [] },
  ],
  applyOrder: ["inspect", "test"],
};

const resultForPrompt = (prompt) => {
  if (prompt.includes("sole planner")) return planResult;
  if (prompt.includes("Review the worker results")) return reviewResult;
  const taskLine = prompt.split("\n").find((line) => line.startsWith("Task: "));
  if (taskLine) return workerResult(JSON.parse(taskLine.slice(6)).id);
  return { answer: "mock" };
};

createInterface({ input: process.stdin }).on("line", (line) => {
  const message = JSON.parse(line);
  trace(message);
  if (message.method === "initialize") {
    initialized = true;
    send({ id: message.id, result: { userAgent: "mock-codex/1.0", codexHome: "/mock", platformFamily: "unix", platformOs: "mock" } });
    return;
  }
  if (message.method === "initialized") return;
  if (!initialized) {
    send({ id: message.id, error: { code: -32000, message: "Not initialized" } });
    return;
  }
  if (message.method === "account/read") {
    const type = process.env.MOCK_ACCOUNT_TYPE || "chatgpt";
    const account = type === "none" ? null : type === "apiKey" ? { type: "apiKey" } : { type: "chatgpt", email: "mock@example.test", planType: process.env.MOCK_PLAN_TYPE || "pro" };
    send({ id: message.id, result: { account, requiresOpenaiAuth: false } });
    return;
  }
  if (message.method === "model/list") {
    const models = [model("gpt-5.6-sol", ["low", "high", "max"]), model("gpt-5.6-luna", ["low", "high"]), model("gpt-5.6-terra", ["medium"])];
    const filtered = process.env.MOCK_MISSING_MODEL ? models.filter((entry) => entry.model !== process.env.MOCK_MISSING_MODEL) : models;
    send({ id: message.id, result: { data: filtered, nextCursor: null } });
    return;
  }
  if (message.method === "account/rateLimits/read") {
    rateRead += 1;
    send({ id: message.id, result: { rateLimits: { limitId: "codex", primary: { usedPercent: 10 + rateRead, windowDurationMins: 300, resetsAt: 2_000_000_000 } } } });
    return;
  }
  if (message.method === "thread/start") {
    const id = `thread-${nextThread++}`;
    const returnedModel = process.env.MOCK_THREAD_MODEL || message.params.model;
    send({ id: message.id, result: {
      thread: { id, model: returnedModel },
      ...(process.env.MOCK_OMIT_RESULT_MODEL === "1" ? {} : { model: returnedModel }),
      modelProvider: "openai",
    } });
    return;
  }
  if (message.method === "turn/start") {
    const turnId = `turn-${nextTurn++}`;
    const threadId = message.params.threadId;
    const prompt = message.params.input[0].text;
    const text = JSON.stringify(resultForPrompt(prompt));
    send({ id: message.id, result: { turn: { id: turnId, status: "inProgress", items: [], error: null } } });
    queueMicrotask(() => {
      if (process.env.MOCK_REROUTE === "1") send({ method: "model/rerouted", params: { threadId, turnId, fromModel: message.params.model, toModel: "gpt-5.6-terra", reason: "mock" } });
      send({ method: "item/completed", params: { threadId, turnId, item: { type: "agentMessage", id: `item-${turnId}`, text, phase: "final_answer" } } });
      send({ method: "turn/completed", params: { threadId, turn: { id: turnId, status: "completed", items: [{ type: "agentMessage", id: `item-${turnId}`, text }], error: null } } });
    });
    return;
  }
  send({ id: message.id, error: { code: -32601, message: `Unknown method ${message.method}` } });
});
