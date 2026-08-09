import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { EventEmitter } from "node:events";
import { createInterface, type Interface } from "node:readline";
import { OrchestratorError, errorMessage } from "../errors.js";

export interface AppServerLaunchOptions {
  command: string;
  args: string[];
  cwd?: string;
  requestTimeoutMs?: number;
}

interface RpcError {
  code: number;
  message: string;
  data?: unknown;
}

interface PendingRequest {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
  timeout: NodeJS.Timeout;
}

export interface AppServerNotification {
  method: string;
  params?: Record<string, unknown>;
}

export interface TurnRunOptions {
  threadId: string;
  input: string;
  effort: string;
  model: string;
  cwd: string;
  outputSchema: Record<string, unknown>;
  sandboxPolicy: Record<string, unknown>;
}

export interface TurnRunResult {
  turnId: string;
  text: string;
  turn: Record<string, unknown>;
}

const redactStderr = (value: string): string =>
  value
    .replace(/\b(sk|sbp)_[A-Za-z0-9_-]+/g, "[REDACTED_TOKEN]")
    .replace(/Bearer\s+[^\s]+/gi, "Bearer [REDACTED]")
    .slice(-8_000);

const API_AUTH_ENV_KEYS = new Set([
  "OPENAI_API_KEY",
  "CODEX_API_KEY",
  "CODEX_OPENAI_API_KEY",
  "AZURE_OPENAI_API_KEY",
  "OPENAI_BASE_URL",
  "OPENAI_API_BASE",
  "AZURE_OPENAI_ENDPOINT",
  "OPENAI_ORG_ID",
  "OPENAI_PROJECT_ID",
]);

/** Keep ChatGPT-managed auth available while preventing accidental API-key mode. */
export const buildCodexEnvironment = (): NodeJS.ProcessEnv => {
  const environment = Object.fromEntries(
    Object.entries(process.env).filter(([key]) => !API_AUTH_ENV_KEYS.has(key.toUpperCase())),
  ) as NodeJS.ProcessEnv;
  environment.LOG_FORMAT = "json";
  return environment;
};

export class AppServerClient {
  readonly notifications = new EventEmitter();
  readonly launch: AppServerLaunchOptions;
  #child: ChildProcessWithoutNullStreams | null = null;
  #reader: Interface | null = null;
  #nextId = 1;
  #pending = new Map<number, PendingRequest>();
  #stderr = "";
  #closed = false;

  constructor(launch: AppServerLaunchOptions) {
    this.launch = launch;
  }

  async start(): Promise<void> {
    if (this.#child) return;
    this.#closed = false;
    try {
      this.#child = spawn(this.launch.command, this.launch.args, {
        cwd: this.launch.cwd,
        stdio: ["pipe", "pipe", "pipe"],
        windowsHide: true,
        env: buildCodexEnvironment(),
      });
    } catch (error) {
      throw new OrchestratorError(
        "CODEX_SPAWN_FAILED",
        `Codex App Server를 시작하지 못했습니다: ${errorMessage(error)}`,
      );
    }

    this.#reader = createInterface({ input: this.#child.stdout });
    this.#reader.on("line", (line) => this.#handleLine(line));
    this.#child.stderr.on("data", (chunk: Buffer) => {
      this.#stderr = redactStderr(`${this.#stderr}${chunk.toString("utf8")}`);
    });
    this.#child.once("error", (error) => this.#failAll(error));
    this.#child.once("exit", (code, signal) => {
      if (!this.#closed) {
        this.#failAll(
          new OrchestratorError(
            "APP_SERVER_EXITED",
            `Codex App Server가 예기치 않게 종료됐습니다 (code=${String(code)}, signal=${String(signal)}).`,
            { stderr: this.#stderr },
          ),
        );
      }
    });

    await this.request("initialize", {
      clientInfo: {
        name: "eoringo_codex_orchestrator",
        title: "Eoringo Codex Orchestrator",
        version: "0.1.0",
      },
    });
    this.notify("initialized");
  }

  request<T = unknown>(method: string, params?: unknown): Promise<T> {
    if (!this.#child || this.#closed) {
      return Promise.reject(
        new OrchestratorError("APP_SERVER_NOT_RUNNING", "Codex App Server가 실행 중이 아닙니다."),
      );
    }
    const id = this.#nextId++;
    const timeoutMs = this.launch.requestTimeoutMs ?? 60_000;
    return new Promise<T>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.#pending.delete(id);
        reject(
          new OrchestratorError(
            "RPC_TIMEOUT",
            `${method} 요청이 ${timeoutMs}ms 안에 완료되지 않았습니다.`,
          ),
        );
      }, timeoutMs);
      this.#pending.set(id, {
        resolve: resolve as (value: unknown) => void,
        reject,
        timeout,
      });
      try {
        this.#write({ method, id, ...(params === undefined ? {} : { params }) });
      } catch (error) {
        clearTimeout(timeout);
        this.#pending.delete(id);
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    });
  }

  notify(method: string, params?: unknown): void {
    this.#write({ method, ...(params === undefined ? {} : { params }) });
  }

  async startThread(params: Record<string, unknown>): Promise<Record<string, unknown>> {
    const result = await this.request<Record<string, unknown>>("thread/start", params);
    const thread = result.thread as Record<string, unknown> | undefined;
    if (!thread || typeof thread.id !== "string") {
      throw new OrchestratorError("INVALID_THREAD_RESPONSE", "thread/start 응답에 thread.id가 없습니다.");
    }
    const returnedModel = typeof result.model === "string"
      ? result.model
      : typeof thread.model === "string"
        ? thread.model
        : undefined;
    if (typeof params.model === "string" && returnedModel && returnedModel !== params.model) {
      throw new OrchestratorError(
        "MODEL_SUBSTITUTED",
        `요청 모델 ${String(params.model)} 대신 ${returnedModel}이 선택되어 실행을 중단합니다.`,
      );
    }
    return result;
  }

  async runTurn(options: TurnRunOptions): Promise<TurnRunResult> {
    let turnId: string | null = null;
    let finalText = "";
    let settled = false;
    let cleanupTurn = () => {};

    const completion = new Promise<TurnRunResult>((resolve, reject) => {
      const timeout = setTimeout(() => {
        cleanup();
        reject(new OrchestratorError("TURN_TIMEOUT", "Codex turn이 제한 시간 안에 완료되지 않았습니다."));
      }, this.launch.requestTimeoutMs ?? 600_000);

      const onNotification = (notification: AppServerNotification) => {
        const params = notification.params ?? {};
        const eventThreadId = typeof params.threadId === "string" ? params.threadId : undefined;
        if (eventThreadId && eventThreadId !== options.threadId) return;

        if (notification.method === "model/rerouted") {
          cleanup();
          reject(
            new OrchestratorError(
              "MODEL_REROUTED",
              `모델이 ${String(params.fromModel)}에서 ${String(params.toModel)}로 변경되어 실행을 중단합니다.`,
              params,
            ),
          );
          return;
        }

        if (notification.method === "item/completed") {
          const item = params.item as Record<string, unknown> | undefined;
          if (item?.type === "agentMessage" && typeof item.text === "string") {
            finalText = item.text;
          }
          return;
        }

        if (notification.method !== "turn/completed") return;
        const turn = params.turn as Record<string, unknown> | undefined;
        if (!turn || typeof turn.id !== "string") return;
        if (turnId && turn.id !== turnId) return;
        const status = turn.status;
        if (status !== "completed") {
          cleanup();
          reject(
            new OrchestratorError(
              "TURN_FAILED",
              `Codex turn 상태가 ${String(status)}입니다.`,
              turn.error,
            ),
          );
          return;
        }
        const items = Array.isArray(turn.items) ? turn.items : [];
        for (const rawItem of items) {
          const item = rawItem as Record<string, unknown>;
          if (item.type === "agentMessage" && typeof item.text === "string") finalText = item.text;
        }
        cleanup();
        resolve({ turnId: turn.id, text: finalText, turn });
      };

      const cleanup = () => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        this.notifications.off("notification", onNotification);
      };
      cleanupTurn = cleanup;

      this.notifications.on("notification", onNotification);
    });

    try {
      const response = await this.request<{ turn: Record<string, unknown> }>("turn/start", {
        threadId: options.threadId,
        input: [{ type: "text", text: options.input }],
        cwd: options.cwd,
        model: options.model,
        effort: options.effort,
        approvalPolicy: "never",
        sandboxPolicy: options.sandboxPolicy,
        outputSchema: options.outputSchema,
      });
      if (!response.turn || typeof response.turn.id !== "string") {
        throw new OrchestratorError("INVALID_TURN_RESPONSE", "turn/start 응답에 turn.id가 없습니다.");
      }
      turnId = response.turn.id;
      return await completion;
    } catch (error) {
      cleanupTurn();
      throw error;
    }
  }

  async close(): Promise<void> {
    this.#closed = true;
    this.#reader?.close();
    this.#reader = null;
    const child = this.#child;
    this.#child = null;
    if (child && child.exitCode === null) {
      child.kill();
      await new Promise<void>((resolve) => {
        const timeout = setTimeout(resolve, 1_000);
        child.once("exit", () => {
          clearTimeout(timeout);
          resolve();
        });
      });
    }
    this.#failAll(new OrchestratorError("APP_SERVER_CLOSED", "Codex App Server 연결이 종료됐습니다."));
  }

  #write(message: unknown): void {
    if (!this.#child || this.#closed) {
      throw new OrchestratorError("APP_SERVER_NOT_RUNNING", "Codex App Server가 실행 중이 아닙니다.");
    }
    this.#child.stdin.write(`${JSON.stringify(message)}\n`);
  }

  #handleLine(line: string): void {
    let message: Record<string, unknown>;
    try {
      message = JSON.parse(line) as Record<string, unknown>;
    } catch {
      this.notifications.emit("protocolError", new OrchestratorError("INVALID_JSONL", "App Server가 잘못된 JSONL을 보냈습니다."));
      return;
    }

    if (typeof message.id === "number" && typeof message.method !== "string") {
      const pending = this.#pending.get(message.id);
      if (!pending) return;
      this.#pending.delete(message.id);
      clearTimeout(pending.timeout);
      if (message.error) {
        const rpcError = message.error as RpcError;
        pending.reject(
          new OrchestratorError(
            "RPC_ERROR",
            `${rpcError.message} (${rpcError.code})`,
            rpcError.data,
          ),
        );
      } else {
        pending.resolve(message.result);
      }
      return;
    }

    if (typeof message.method === "string" && typeof message.id === "number") {
      this.#write({ id: message.id, error: { code: -32002, message: "Interactive request declined by non-interactive orchestrator" } });
      return;
    }

    if (typeof message.method === "string") {
      const params = message.params && typeof message.params === "object"
        ? message.params as Record<string, unknown>
        : undefined;
      this.notifications.emit("notification", {
        method: message.method,
        ...(params ? { params } : {}),
      } satisfies AppServerNotification);
    }
  }

  #failAll(error: unknown): void {
    const normalized = error instanceof Error ? error : new Error(String(error));
    for (const pending of this.#pending.values()) {
      clearTimeout(pending.timeout);
      pending.reject(normalized);
    }
    this.#pending.clear();
  }
}
