import { spawn } from "node:child_process";
import { OrchestratorError, errorMessage } from "./errors.js";
import type { AccountSnapshot, ModelEntry, PreflightResult } from "./types.js";
import { AppServerClient, buildCodexEnvironment, type AppServerLaunchOptions } from "./app-server/client.js";

export const REQUIRED_SOL = "gpt-5.6-sol";
export const REQUIRED_LUNA = "gpt-5.6-luna";

export interface LaunchConfiguration {
  appServer: AppServerLaunchOptions;
  codexCommand: string;
}

export const resolveLaunchConfiguration = (cwd?: string): LaunchConfiguration => {
  const codexCommand = process.env.CODEX_ORCHESTRATOR_CODEX_PATH || "codex";
  const isTestEnvironment = process.env.NODE_ENV === "test";
  const command = isTestEnvironment
    ? process.env.CODEX_ORCHESTRATOR_APP_SERVER_COMMAND || codexCommand
    : codexCommand;
  let args = ["app-server", "--listen", "stdio://"];
  if (isTestEnvironment && process.env.CODEX_ORCHESTRATOR_APP_SERVER_ARGS) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(process.env.CODEX_ORCHESTRATOR_APP_SERVER_ARGS) as unknown;
    } catch {
      throw new OrchestratorError(
        "INVALID_APP_SERVER_ARGS",
        "CODEX_ORCHESTRATOR_APP_SERVER_ARGS는 문자열 JSON 배열이어야 합니다.",
      );
    }
    if (!Array.isArray(parsed) || !parsed.every((value) => typeof value === "string")) {
      throw new OrchestratorError("INVALID_APP_SERVER_ARGS", "CODEX_ORCHESTRATOR_APP_SERVER_ARGS는 문자열 JSON 배열이어야 합니다.");
    }
    args = parsed;
  }
  return { codexCommand, appServer: { command, args, ...(cwd ? { cwd } : {}) } };
};

export const readCodexVersion = async (command: string): Promise<string> => {
  if (process.env.NODE_ENV === "test" && process.env.CODEX_ORCHESTRATOR_MOCK_VERSION) {
    return process.env.CODEX_ORCHESTRATOR_MOCK_VERSION;
  }
  const executableFailure = (error: unknown): OrchestratorError => {
    const message = errorMessage(error);
    const windowsAppsBlocked = /\\windowsapps\\/i.test(command) || /EPERM|access is denied/i.test(message);
    const advice = windowsAppsBlocked
      ? " WindowsApps 설치본 실행이 차단되었을 수 있습니다. 실행 가능한 standalone Codex CLI 경로를 CODEX_ORCHESTRATOR_CODEX_PATH에 지정하세요."
      : " 실행 가능한 Codex CLI를 설치하거나 CODEX_ORCHESTRATOR_CODEX_PATH에 경로를 지정하세요.";
    return new OrchestratorError("CODEX_NOT_EXECUTABLE", `codex 실행 파일을 사용할 수 없습니다: ${message}.${advice}`);
  };
  return await new Promise<string>((resolve, reject) => {
    let stdout = "";
    let stderr = "";
    let child: ReturnType<typeof spawn>;
    try {
      child = spawn(command, ["--version"], {
        stdio: ["ignore", "pipe", "pipe"],
        windowsHide: true,
        env: buildCodexEnvironment(),
      });
    } catch (error) {
      reject(executableFailure(error));
      return;
    }
    child.stdout!.on("data", (chunk: Buffer) => (stdout += chunk.toString("utf8")));
    child.stderr!.on("data", (chunk: Buffer) => (stderr += chunk.toString("utf8")));
    child.once("error", (error) => {
      reject(executableFailure(error));
    });
    child.once("exit", (code) => {
      if (code !== 0) {
        reject(new OrchestratorError("CODEX_VERSION_FAILED", `codex --version이 실패했습니다: ${stderr.trim() || `exit ${String(code)}`}`));
        return;
      }
      const value = stdout.trim();
      if (!value) reject(new OrchestratorError("CODEX_VERSION_EMPTY", "codex --version 결과가 비어 있습니다."));
      else resolve(value);
    });
  });
};

export const modelDescription = (models: ModelEntry[]): string =>
  models
    .map((entry) => `${entry.id} / ${entry.model}${entry.hidden ? " (hidden)" : ""} [${(entry.supportedReasoningEfforts ?? []).map((x) => x.reasoningEffort).join(", ") || "effort 미제공"}]`)
    .join("\n");

const requireChatGptPro = (snapshot: AccountSnapshot): void => {
  const account = snapshot.account;
  if (!account) {
    throw new OrchestratorError(
      "CHATGPT_LOGIN_REQUIRED",
      "ChatGPT 로그인이 필요합니다. account/login/start에 type=chatgptDeviceCode를 사용해 로그인하세요.",
    );
  }
  if (typeof account.type !== "string" || !account.type.trim()) {
    throw new OrchestratorError("CHATGPT_AUTH_REQUIRED", "account/read가 인증 유형을 반환하지 않았습니다.");
  }
  const accountType = account.type.toLowerCase();
  if (accountType === "apikey" || accountType === "api_key") {
    throw new OrchestratorError(
      "API_KEY_AUTH_FORBIDDEN",
      "API 키 인증이 감지되어 중단했습니다. `codex logout` 후 ChatGPT device-code 로그인으로 전환하세요.",
    );
  }
  if (accountType !== "chatgpt") {
    throw new OrchestratorError("CHATGPT_AUTH_REQUIRED", `ChatGPT 관리형 인증만 허용됩니다. 현재 유형: ${account.type}`);
  }
  if (String(account.planType ?? "").toLowerCase() !== "pro") {
    throw new OrchestratorError("CHATGPT_PRO_REQUIRED", `ChatGPT Pro 요금제가 필요합니다. 현재 요금제: ${String(account.planType ?? "unknown")}`);
  }
};

export const listAllModels = async (client: AppServerClient): Promise<ModelEntry[]> => {
  const models: ModelEntry[] = [];
  let cursor: string | null = null;
  const seenCursors = new Set<string>();
  do {
    const response: { data: ModelEntry[]; nextCursor?: string | null; next_cursor?: string | null } = await client.request("model/list", {
      cursor,
      limit: 100,
      includeHidden: true,
    });
    if (!Array.isArray(response.data)) throw new OrchestratorError("INVALID_MODEL_LIST", "model/list 응답이 올바르지 않습니다.");
    models.push(...response.data);
    const nextCursor = response.nextCursor ?? response.next_cursor ?? null;
    if (nextCursor !== null && (typeof nextCursor !== "string" || !nextCursor)) {
      throw new OrchestratorError("INVALID_MODEL_LIST", "model/list의 nextCursor가 올바르지 않습니다.");
    }
    if (nextCursor && seenCursors.has(nextCursor)) {
      throw new OrchestratorError("MODEL_LIST_PAGINATION_LOOP", "model/list 페이지네이션 커서가 반복되어 중단했습니다.");
    }
    if (nextCursor) seenCursors.add(nextCursor);
    cursor = nextCursor;
  } while (cursor);
  return models;
};

const findExactModel = (models: ModelEntry[], required: string): ModelEntry | undefined =>
  models.find((entry) => entry.model === required && entry.id === required && entry.hidden !== true);

const effortOrder = ["none", "minimal", "low", "medium", "high", "xhigh", "max", "ultra"];

const efforts = (model: ModelEntry): string[] => {
  const advertised = (model.supportedReasoningEfforts ?? [])
    .map((entry) => entry.reasoningEffort)
    .filter((effort): effort is string => Boolean(effort));
  const originalIndex = new Map(advertised.map((effort, index) => [effort, index]));

  return [...new Set(advertised)].sort((left, right) => {
    const leftRank = effortOrder.indexOf(left);
    const rightRank = effortOrder.indexOf(right);
    const normalizedLeftRank = leftRank === -1 ? effortOrder.length : leftRank;
    const normalizedRightRank = rightRank === -1 ? effortOrder.length : rightRank;
    return normalizedLeftRank - normalizedRightRank || originalIndex.get(left)! - originalIndex.get(right)!;
  });
};

export const chooseEfforts = (sol: ModelEntry, luna: ModelEntry) => {
  const solEfforts = efforts(sol);
  const lunaEfforts = efforts(luna);
  if (!solEfforts.length || !lunaEfforts.length) {
    throw new OrchestratorError("REASONING_EFFORTS_MISSING", "필수 모델의 추론 단계 정보가 없습니다.");
  }
  return {
    solEfforts,
    lunaEfforts,
    solEffort: solEfforts.includes("max") ? "max" : solEfforts.at(-1)!,
    solEffortFallback: !solEfforts.includes("max"),
    lunaFastEffort: lunaEfforts[0]!,
    lunaHardEffort: lunaEfforts.at(-1)!,
  };
};

export const runPreflight = async (
  client: AppServerClient,
  codexCommand: string,
): Promise<PreflightResult> => {
  const codexVersion = await readCodexVersion(codexCommand);
  await client.start();
  const account = await client.request<AccountSnapshot>("account/read", { refreshToken: false });
  requireChatGptPro(account);
  const models = await listAllModels(client);
  const sol = findExactModel(models, REQUIRED_SOL);
  const luna = findExactModel(models, REQUIRED_LUNA);
  if (!sol || !luna) {
    throw new OrchestratorError(
      "REQUIRED_MODELS_UNAVAILABLE",
      `필수 모델을 모두 사용할 수 없습니다. 대체 모델은 사용하지 않습니다.\n${modelDescription(models)}`,
      { required: [REQUIRED_SOL, REQUIRED_LUNA], models },
    );
  }
  const selectedEfforts = chooseEfforts(sol, luna);
  const rateLimits = await client.request("account/rateLimits/read");
  return { codexVersion, account, models, sol, luna, ...selectedEfforts, rateLimits };
};

export const loginGuidance = (): string =>
  "App Server에서 account/login/start { type: \"chatgptDeviceCode\" }를 실행하고 verificationUrl과 userCode로 로그인하세요.";
