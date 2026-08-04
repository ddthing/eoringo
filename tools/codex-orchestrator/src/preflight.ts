import { spawn } from "node:child_process";
import { OrchestratorError, errorMessage } from "./errors.js";
import type { AccountSnapshot, ModelEntry, PreflightResult } from "./types.js";
import { AppServerClient, type AppServerLaunchOptions } from "./app-server/client.js";

const REQUIRED_SOL = "gpt-5.6-sol";
const REQUIRED_LUNA = "gpt-5.6-luna";

export interface LaunchConfiguration {
  appServer: AppServerLaunchOptions;
  codexCommand: string;
}

export const resolveLaunchConfiguration = (cwd?: string): LaunchConfiguration => {
  const codexCommand = process.env.CODEX_ORCHESTRATOR_CODEX_PATH || "codex";
  const command = process.env.CODEX_ORCHESTRATOR_APP_SERVER_COMMAND || codexCommand;
  let args = ["app-server", "--listen", "stdio://"];
  if (process.env.CODEX_ORCHESTRATOR_APP_SERVER_ARGS) {
    const parsed = JSON.parse(process.env.CODEX_ORCHESTRATOR_APP_SERVER_ARGS) as unknown;
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
  return await new Promise<string>((resolve, reject) => {
    let stdout = "";
    let stderr = "";
    let child: ReturnType<typeof spawn>;
    try {
      child = spawn(command, ["--version"], { stdio: ["ignore", "pipe", "pipe"], windowsHide: true });
    } catch (error) {
      reject(new OrchestratorError("CODEX_NOT_EXECUTABLE", `codex 실행 파일을 사용할 수 없습니다: ${errorMessage(error)}. 실행 가능한 Codex CLI를 설치하거나 CODEX_ORCHESTRATOR_CODEX_PATH에 경로를 지정하세요.`));
      return;
    }
    child.stdout!.on("data", (chunk: Buffer) => (stdout += chunk.toString("utf8")));
    child.stderr!.on("data", (chunk: Buffer) => (stderr += chunk.toString("utf8")));
    child.once("error", (error) => {
      reject(new OrchestratorError("CODEX_NOT_EXECUTABLE", `codex 실행 파일을 사용할 수 없습니다: ${errorMessage(error)}. 실행 가능한 Codex CLI를 설치하거나 CODEX_ORCHESTRATOR_CODEX_PATH에 경로를 지정하세요.`));
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

const modelDescription = (models: ModelEntry[]): string =>
  models
    .map((entry) => `${entry.model} [${(entry.supportedReasoningEfforts ?? []).map((x) => x.reasoningEffort).join(", ") || "effort 미제공"}]`)
    .join("\n");

const requireChatGptPro = (snapshot: AccountSnapshot): void => {
  const account = snapshot.account;
  if (!account) {
    throw new OrchestratorError(
      "CHATGPT_LOGIN_REQUIRED",
      "ChatGPT 로그인이 필요합니다. account/login/start에 type=chatgptDeviceCode를 사용해 로그인하세요.",
    );
  }
  if (account.type.toLowerCase() === "apikey") {
    throw new OrchestratorError(
      "API_KEY_AUTH_FORBIDDEN",
      "API 키 인증이 감지되어 중단했습니다. `codex logout` 후 ChatGPT device-code 로그인으로 전환하세요.",
    );
  }
  if (account.type !== "chatgpt") {
    throw new OrchestratorError("CHATGPT_AUTH_REQUIRED", `ChatGPT 관리형 인증만 허용됩니다. 현재 유형: ${account.type}`);
  }
  if (String(account.planType ?? "").toLowerCase() !== "pro") {
    throw new OrchestratorError("CHATGPT_PRO_REQUIRED", `ChatGPT Pro 요금제가 필요합니다. 현재 요금제: ${String(account.planType ?? "unknown")}`);
  }
};

export const listAllModels = async (client: AppServerClient): Promise<ModelEntry[]> => {
  const models: ModelEntry[] = [];
  let cursor: string | null = null;
  do {
    const response: { data: ModelEntry[]; nextCursor?: string | null } = await client.request("model/list", {
      cursor,
      limit: 100,
      includeHidden: true,
    });
    if (!Array.isArray(response.data)) throw new OrchestratorError("INVALID_MODEL_LIST", "model/list 응답이 올바르지 않습니다.");
    models.push(...response.data);
    cursor = response.nextCursor ?? null;
  } while (cursor);
  return models;
};

const findExactModel = (models: ModelEntry[], required: string): ModelEntry | undefined =>
  models.find((entry) => entry.model === required && entry.id === required && entry.hidden !== true);

const efforts = (model: ModelEntry): string[] =>
  (model.supportedReasoningEfforts ?? []).map((entry) => entry.reasoningEffort).filter(Boolean);

export const chooseEfforts = (sol: ModelEntry, luna: ModelEntry) => {
  const solEfforts = efforts(sol);
  const lunaEfforts = efforts(luna);
  if (!solEfforts.length || !lunaEfforts.length) {
    throw new OrchestratorError("REASONING_EFFORTS_MISSING", "필수 모델의 추론 단계 정보가 없습니다.");
  }
  return {
    solEffort: solEfforts.includes("max") ? "max" : solEfforts.at(-1)!,
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
