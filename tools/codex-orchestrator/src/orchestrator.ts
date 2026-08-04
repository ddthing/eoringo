import { createHash, randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { AppServerClient } from "./app-server/client.js";
import { SolAgent, LunaWorker } from "./agents.js";
import { OrchestratorError, errorMessage } from "./errors.js";
import { StructuredLogger } from "./logger.js";
import { resolveLaunchConfiguration, runPreflight } from "./preflight.js";
import { pathsConflict, RetryLedger, scheduleDag, validateDag } from "./scheduler.js";
import type { PlanTask, RunOptions, RunReport, SolReview, TaskAttempt, WorkerResult } from "./types.js";
import { WorkspaceManager } from "./workspace.js";

const failureResult = (task: PlanTask, error: unknown): WorkerResult => ({
  taskId: task.id,
  status: "failed",
  summary: "워커 실행이 실패했습니다.",
  changedFiles: [],
  tests: [],
  criteriaMet: false,
  risks: [],
  commit: null,
  patch: null,
  failureReason: errorMessage(error),
});

const reviewForLog = (review: SolReview) => ({
  approved: review.approved,
  summaryLength: review.summary.length,
  taskReviews: review.taskReviews.map((item) => ({
    taskId: item.taskId,
    status: item.status,
    instructionSha256: item.instructions ? createHash("sha256").update(item.instructions).digest("hex") : null,
    riskCount: item.risks.length,
  })),
  applyOrder: review.applyOrder,
});

export class CodexOrchestrator {
  async run(options: RunOptions): Promise<RunReport> {
    const cwd = resolve(options.cwd);
    const runId = `${new Date().toISOString().replace(/[:.]/g, "-")}-${randomUUID().slice(0, 8)}`;
    const logger = new StructuredLogger(cwd, runId);
    const launch = resolveLaunchConfiguration(cwd);
    const client = new AppServerClient({ ...launch.appServer, requestTimeoutMs: 600_000 });
    let rateLimitsAfter: unknown = null;
    try {
      await logger.log("run.started", {
        runId,
        goalSha256: createHash("sha256").update(options.goal).digest("hex"),
        goalLength: options.goal.length,
        cwd,
        workers: options.workers,
        apply: options.apply,
      });
      const preflight = await runPreflight(client, launch.codexCommand);
      await logger.log("preflight.completed", {
        codexVersion: preflight.codexVersion,
        account: { type: preflight.account.account?.type, planType: preflight.account.account?.planType },
        models: preflight.models.map((model) => ({ model: model.model, efforts: model.supportedReasoningEfforts })),
        rateLimits: preflight.rateLimits,
      });

      const workspace = await WorkspaceManager.create(cwd, runId);
      await logger.log("workspace.recorded", { dirtyPaths: workspace.initialDirtyPaths, baseCommit: workspace.baseCommit });
      const sol = new SolAgent(client, preflight.sol.model, preflight.solEffort, cwd);
      await sol.start();
      const plan = await sol.plan(options.goal);
      validateDag(plan.tasks);
      await logger.log("plan.completed", {
        summaryLength: plan.summary.length,
        tasks: plan.tasks.map((task) => ({
          id: task.id,
          dependencies: task.dependencies,
          readFiles: task.readFiles,
          writableFiles: task.writableFiles,
          criteriaCount: task.completionCriteria.length,
          difficulty: task.difficulty,
        })),
      });

      const ledger = new RetryLedger(2);
      const luna = new LunaWorker(client, preflight.luna.model);
      const allAttempts: TaskAttempt[] = [];
      const latest = new Map<string, TaskAttempt>();

      const executeAttempt = async (task: PlanTask, feedback: string | null): Promise<TaskAttempt> => {
        const attempt = ledger.begin(task, feedback);
        const dependencyCommits = task.dependencies
          .map((id) => latest.get(id)?.result.commit)
          .filter((value): value is string => Boolean(value));
        const previousCommit = latest.get(task.id)?.result.commit;
        if (previousCommit) dependencyCommits.push(previousCommit);
        for (const [completedTaskId, completedAttempt] of latest) {
          if (completedTaskId !== task.id && pathsConflict(task.writableFiles, completedAttempt.task.writableFiles) && completedAttempt.result.commit) {
            dependencyCommits.push(completedAttempt.result.commit);
          }
        }
        const handle = await workspace.createWorkspace(task, attempt, dependencyCommits);
        let result: WorkerResult;
        try {
          const effort = task.difficulty === "hard" ? preflight.lunaHardEffort : preflight.lunaFastEffort;
          result = await luna.run(task, handle.path, effort, feedback);
          const captured = await workspace.finalizeWorkspace(handle, task);
          result = { ...result, changedFiles: captured.changedFiles, commit: captured.commit, patch: captured.patch };
          if (result.status === "completed" && !result.criteriaMet) result = { ...result, status: "failed", failureReason: "완료 기준 충족 여부가 false입니다." };
        } catch (error) {
          result = failureResult(task, error);
          try {
            const captured = await workspace.finalizeWorkspace(handle, task);
            result = { ...result, changedFiles: captured.changedFiles, commit: captured.commit, patch: captured.patch };
          } catch (captureError) {
            result.failureReason = `${result.failureReason}; 변경 검증 실패: ${errorMessage(captureError)}`;
          }
        }
        const taskAttempt: TaskAttempt = { task, attempt, feedback, workspacePath: handle.path, branch: handle.branch, result };
        allAttempts.push(taskAttempt);
        latest.set(task.id, taskAttempt);
        await logger.log("worker.completed", {
          taskId: task.id,
          attempt,
          feedbackSha256: feedback ? createHash("sha256").update(feedback).digest("hex") : null,
          workspacePath: handle.path,
          branch: handle.branch,
          status: result.status,
          changedFiles: result.changedFiles,
          tests: result.tests.map((test) => ({ command: test.command, passed: test.passed })),
          criteriaMet: result.criteriaMet,
          hasCommit: Boolean(result.commit),
          hasPatch: Boolean(result.patch),
          failureCode: result.failureReason ? "WORKER_REPORTED_FAILURE" : null,
        });
        return taskAttempt;
      };

      await scheduleDag(plan.tasks, options.workers, (task) => executeAttempt(task, null));
      let review = await sol.review(plan, plan.tasks.map((task) => latest.get(task.id)!.result));
      this.#validateReview(plan.tasks, review);
      await logger.log("review.completed", reviewForLog(review));

      for (let retryRound = 0; retryRound < 2; retryRound += 1) {
        const retryRequests = review.taskReviews.filter((item) => item.status === "retry");
        const retryTasks: Array<{ task: PlanTask; original: PlanTask; feedback: string }> = [];
        for (const item of retryRequests) {
            const task = plan.tasks.find((candidate) => candidate.id === item.taskId);
            if (!task || !item.instructions || ledger.retriesUsed(item.taskId) >= 2) continue;
            retryTasks.push({ task: { ...task, dependencies: [] }, original: task, feedback: item.instructions });
        }
        if (!retryTasks.length) break;
        const lookup = new Map(retryTasks.map((item) => [item.task.id, item]));
        await scheduleDag(retryTasks.map((item) => item.task), options.workers, (retryTask) => {
          const item = lookup.get(retryTask.id)!;
          return executeAttempt(item.original, item.feedback);
        });
        review = await sol.review(plan, plan.tasks.map((task) => latest.get(task.id)!.result));
        this.#validateReview(plan.tasks, review);
        await logger.log("review.completed", { retryRound: retryRound + 1, ...reviewForLog(review) });
      }

      let appliedCommits: string[] = [];
      if (options.apply) {
        if (!review.approved) throw new OrchestratorError("REVIEW_NOT_APPROVED", "Sol 검수를 통과하지 못해 --apply를 실행하지 않습니다.");
        const approvedIds = new Set(review.taskReviews.filter((item) => item.status === "approved").map((item) => item.taskId));
        const commits = review.applyOrder
          .filter((id) => approvedIds.has(id))
          .map((id) => latest.get(id)?.result.commit)
          .filter((value): value is string => Boolean(value));
        appliedCommits = await workspace.applyCommits(commits);
        await logger.log("apply.completed", { commits: appliedCommits });
      }

      rateLimitsAfter = await client.request("account/rateLimits/read");
      await logger.log("rate_limits.after", rateLimitsAfter);
      const report: RunReport = { runId, preflight, plan, attempts: allAttempts, review, appliedCommits, rateLimitsAfter };
      await logger.log("run.completed", { runId, approved: review.approved, appliedCommits });
      return report;
    } catch (error) {
      try {
        rateLimitsAfter = await client.request("account/rateLimits/read");
        await logger.log("rate_limits.after", rateLimitsAfter);
      } catch {
        // Preflight or transport may have failed before rate limits were available.
      }
      await logger.log("run.failed", { message: errorMessage(error), code: error instanceof OrchestratorError ? error.code : "UNKNOWN" });
      throw error;
    } finally {
      await client.close();
    }
  }

  #validateReview(tasks: PlanTask[], review: SolReview): void {
    const expected = new Set(tasks.map((task) => task.id));
    const observed = review.taskReviews.map((item) => item.taskId);
    if (new Set(observed).size !== observed.length || observed.length !== expected.size || observed.some((id) => !expected.has(id))) {
      throw new OrchestratorError("INVALID_REVIEW_TASKS", "Sol 검수 결과가 계획의 모든 태스크와 정확히 일치하지 않습니다.");
    }
    if (new Set(review.applyOrder).size !== review.applyOrder.length || review.applyOrder.some((id) => !expected.has(id))) {
      throw new OrchestratorError("INVALID_APPLY_ORDER", "Sol applyOrder에 중복 또는 알 수 없는 태스크가 있습니다.");
    }
    if (review.approved) {
      const approved = new Set(review.taskReviews.filter((item) => item.status === "approved").map((item) => item.taskId));
      if (approved.size !== expected.size || review.applyOrder.length !== expected.size || review.applyOrder.some((id) => !approved.has(id))) {
        throw new OrchestratorError("INCOMPLETE_APPROVAL", "approved=true인 검수는 모든 태스크와 전체 applyOrder를 포함해야 합니다.");
      }
    }
  }
}
