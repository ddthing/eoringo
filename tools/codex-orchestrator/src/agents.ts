import { OrchestratorError } from "./errors.js";
import { AppServerClient } from "./app-server/client.js";
import {
  parseSolPlan,
  parseSolReview,
  parseWorkerResult,
  solPlanJsonSchema,
  solReviewJsonSchema,
  workerResultJsonSchema,
} from "./schemas.js";
import type { PlanTask, SolPlan, SolReview, WorkerResult } from "./types.js";

const readOnlySandbox = { type: "readOnly", access: { type: "fullAccess" } };

export class SolAgent {
  readonly client: AppServerClient;
  readonly model: string;
  readonly effort: string;
  readonly cwd: string;
  #threadId: string | null = null;

  constructor(client: AppServerClient, model: string, effort: string, cwd: string) {
    this.client = client;
    this.model = model;
    this.effort = effort;
    this.cwd = cwd;
  }

  async start(): Promise<void> {
    const response = await this.client.startThread({
      model: this.model,
      cwd: this.cwd,
      approvalPolicy: "never",
      sandbox: "readOnly",
      serviceName: "eoringo_codex_orchestrator_sol",
    });
    this.#threadId = (response.thread as Record<string, unknown>).id as string;
  }

  async plan(goal: string): Promise<SolPlan> {
    const threadId = this.#requireThread();
    const prompt = [
      "You are the sole planner for a local Codex multi-agent orchestration run.",
      "Decompose the goal into small, independently verifiable tasks.",
      "Every write path must be repo-relative and as narrow as possible.",
      "Add dependencies when a task must see another task's changes.",
      "Tasks with overlapping writableFiles must not be independent.",
      "Do not modify files. Return only JSON matching the supplied schema.",
      `Goal: ${goal}`,
    ].join("\n");
    const result = await this.client.runTurn({
      threadId,
      input: prompt,
      effort: this.effort,
      model: this.model,
      cwd: this.cwd,
      outputSchema: solPlanJsonSchema,
      sandboxPolicy: readOnlySandbox,
    });
    return parseSolPlan(result.text);
  }

  async review(plan: SolPlan, results: WorkerResult[]): Promise<SolReview> {
    const threadId = this.#requireThread();
    const prompt = [
      "Review the worker results against every completion criterion.",
      "Approve only results supported by passing tests and allowed-file changes.",
      "Use retry only for a concrete fixable failure and provide new specific instructions.",
      "Never suggest another model or bypass a failed security check.",
      "Return only JSON matching the supplied schema.",
      `Plan: ${JSON.stringify(plan)}`,
      `Worker results: ${JSON.stringify(results)}`,
    ].join("\n");
    const result = await this.client.runTurn({
      threadId,
      input: prompt,
      effort: this.effort,
      model: this.model,
      cwd: this.cwd,
      outputSchema: solReviewJsonSchema,
      sandboxPolicy: readOnlySandbox,
    });
    return parseSolReview(result.text);
  }

  #requireThread(): string {
    if (!this.#threadId) throw new OrchestratorError("SOL_THREAD_NOT_STARTED", "Sol 스레드가 시작되지 않았습니다.");
    return this.#threadId;
  }
}

export class LunaWorker {
  readonly client: AppServerClient;
  readonly model: string;

  constructor(client: AppServerClient, model: string) {
    this.client = client;
    this.model = model;
  }

  async run(task: PlanTask, cwd: string, effort: string, feedback: string | null): Promise<WorkerResult> {
    const response = await this.client.startThread({
      model: this.model,
      cwd,
      approvalPolicy: "never",
      sandbox: "workspaceWrite",
      serviceName: "eoringo_codex_orchestrator_luna",
    });
    const threadId = (response.thread as Record<string, unknown>).id as string;
    const prompt = [
      "Execute exactly one assigned coding task in this isolated workspace.",
      "Do not delegate or work outside the allowed files.",
      "Inspect only the listed read files plus direct dependencies needed to understand them.",
      "Run the minimum tests needed to prove every completion criterion.",
      "Do not commit; the orchestrator captures the patch and commit after validating changed paths.",
      "Return only JSON matching the supplied schema.",
      `Task: ${JSON.stringify(task)}`,
      `Retry feedback: ${feedback ?? "none"}`,
    ].join("\n");
    const result = await this.client.runTurn({
      threadId,
      input: prompt,
      effort,
      model: this.model,
      cwd,
      outputSchema: workerResultJsonSchema,
      sandboxPolicy: {
        type: "workspaceWrite",
        writableRoots: [cwd],
        readOnlyAccess: { type: "fullAccess" },
        networkAccess: false,
      },
    });
    const parsed = parseWorkerResult(result.text);
    if (parsed.taskId !== task.id) throw new OrchestratorError("WORKER_TASK_MISMATCH", `워커가 ${task.id} 대신 ${parsed.taskId} 결과를 반환했습니다.`);
    return parsed;
  }
}
