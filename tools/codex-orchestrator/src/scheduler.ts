import { createHash } from "node:crypto";
import { OrchestratorError } from "./errors.js";
import type { PlanTask } from "./types.js";

const normalizePath = (value: string): string => value.replaceAll("\\", "/").replace(/^\.\//, "").replace(/\/+$/, "");
const staticPrefix = (value: string): string => normalizePath(value).split(/[?*[]/, 1)[0] ?? "";

export const pathsConflict = (left: string[], right: string[]): boolean => {
  for (const rawLeft of left) {
    for (const rawRight of right) {
      const a = normalizePath(rawLeft);
      const b = normalizePath(rawRight);
      if (!a || !b) return true;
      if (a === b || a.startsWith(`${b}/`) || b.startsWith(`${a}/`)) return true;
      const prefixA = staticPrefix(a);
      const prefixB = staticPrefix(b);
      if ((a.includes("*") || b.includes("*") || a.includes("?") || b.includes("?")) && (prefixA.startsWith(prefixB) || prefixB.startsWith(prefixA))) return true;
    }
  }
  return false;
};

export const validateDag = (tasks: PlanTask[]): void => {
  const ids = new Set<string>();
  for (const task of tasks) {
    if (ids.has(task.id)) throw new OrchestratorError("DUPLICATE_TASK_ID", `중복 태스크 ID: ${task.id}`);
    ids.add(task.id);
  }
  for (const task of tasks) {
    for (const dependency of task.dependencies) {
      if (!ids.has(dependency)) throw new OrchestratorError("UNKNOWN_DEPENDENCY", `${task.id}의 선행 작업 ${dependency}가 없습니다.`);
      if (dependency === task.id) throw new OrchestratorError("DAG_CYCLE", `${task.id}가 자신을 의존합니다.`);
    }
  }
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const byId = new Map(tasks.map((task) => [task.id, task]));
  const visit = (id: string) => {
    if (visited.has(id)) return;
    if (visiting.has(id)) throw new OrchestratorError("DAG_CYCLE", `순환 의존성이 감지됐습니다: ${id}`);
    visiting.add(id);
    for (const dependency of byId.get(id)?.dependencies ?? []) visit(dependency);
    visiting.delete(id);
    visited.add(id);
  };
  for (const task of tasks) visit(task.id);
};

export const scheduleDag = async <T>(
  tasks: PlanTask[],
  workers: number,
  runner: (task: PlanTask) => Promise<T>,
): Promise<Map<string, T>> => {
  validateDag(tasks);
  if (!Number.isInteger(workers) || workers < 1 || workers > 4) throw new OrchestratorError("INVALID_WORKER_COUNT", "workers는 1~4 정수여야 합니다.");
  const pending = new Map(tasks.map((task) => [task.id, task]));
  const completed = new Map<string, T>();
  const running = new Map<string, { task: PlanTask; promise: Promise<{ id: string; value: T }> }>();

  while (pending.size || running.size) {
    const ready = [...pending.values()].filter((task) => task.dependencies.every((id) => completed.has(id)));
    for (const task of ready) {
      if (running.size >= workers) break;
      if ([...running.values()].some((item) => pathsConflict(task.writableFiles, item.task.writableFiles))) continue;
      pending.delete(task.id);
      const promise = runner(task).then((value) => ({ id: task.id, value }));
      running.set(task.id, { task, promise });
    }
    if (!running.size) throw new OrchestratorError("DAG_STALLED", "실행 가능한 태스크가 없어 스케줄러가 중단됐습니다.");
    const finished = await Promise.race([...running.values()].map((item) => item.promise));
    running.delete(finished.id);
    completed.set(finished.id, finished.value);
  }
  return completed;
};

export class RetryLedger {
  readonly maxRetries: number;
  #fingerprints = new Set<string>();
  #attempts = new Map<string, number>();

  constructor(maxRetries = 2) {
    this.maxRetries = maxRetries;
  }

  begin(task: PlanTask, feedback: string | null): number {
    const count = this.#attempts.get(task.id) ?? 0;
    if (count > this.maxRetries) throw new OrchestratorError("RETRY_LIMIT", `${task.id}는 최대 재시도 ${this.maxRetries}회를 초과했습니다.`);
    const fingerprint = createHash("sha256").update(JSON.stringify({ task, feedback })).digest("hex");
    if (this.#fingerprints.has(fingerprint)) throw new OrchestratorError("DUPLICATE_ATTEMPT", `${task.id}의 동일 입력 중복 실행을 차단했습니다.`);
    this.#fingerprints.add(fingerprint);
    this.#attempts.set(task.id, count + 1);
    return count + 1;
  }

  retriesUsed(taskId: string): number {
    return Math.max(0, (this.#attempts.get(taskId) ?? 0) - 1);
  }
}
