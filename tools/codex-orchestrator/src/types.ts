export type Difficulty = "easy" | "medium" | "hard";

export interface PlanTask {
  id: string;
  goal: string;
  dependencies: string[];
  readFiles: string[];
  writableFiles: string[];
  completionCriteria: string[];
  difficulty: Difficulty;
}

export interface SolPlan {
  summary: string;
  tasks: PlanTask[];
}

export type WorkerStatus = "completed" | "failed";

export interface WorkerResult {
  taskId: string;
  status: WorkerStatus;
  summary: string;
  changedFiles: string[];
  tests: Array<{ command: string; result: string; passed: boolean }>;
  criteriaMet: boolean;
  risks: string[];
  commit: string | null;
  patch: string | null;
  failureReason: string | null;
}

export interface ReviewTaskResult {
  taskId: string;
  status: "approved" | "retry" | "failed";
  instructions: string | null;
  risks: string[];
}

export interface SolReview {
  approved: boolean;
  summary: string;
  taskReviews: ReviewTaskResult[];
  applyOrder: string[];
}

export interface ModelEntry {
  id: string;
  model: string;
  displayName?: string;
  hidden?: boolean;
  defaultReasoningEffort?: string;
  supportedReasoningEfforts?: Array<{
    reasoningEffort: string;
    description?: string;
  }>;
}

export interface AccountSnapshot {
  account: null | {
    type: string;
    email?: string | null;
    planType?: string | null;
    [key: string]: unknown;
  };
  requiresOpenaiAuth: boolean;
}

export interface PreflightResult {
  codexVersion: string;
  account: AccountSnapshot;
  models: ModelEntry[];
  sol: ModelEntry;
  luna: ModelEntry;
  solEffort: string;
  lunaFastEffort: string;
  lunaHardEffort: string;
  rateLimits: unknown;
}

export interface RunOptions {
  goal: string;
  cwd: string;
  workers: number;
  apply: boolean;
}

export interface TaskAttempt {
  task: PlanTask;
  attempt: number;
  feedback: string | null;
  workspacePath: string;
  branch: string | null;
  result: WorkerResult;
}

export interface RunReport {
  runId: string;
  preflight: PreflightResult;
  plan: SolPlan;
  attempts: TaskAttempt[];
  review: SolReview;
  appliedCommits: string[];
  rateLimitsAfter: unknown;
}
