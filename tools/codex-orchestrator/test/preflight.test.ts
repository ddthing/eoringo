import { afterEach, describe, expect, it } from "vitest";
import { AppServerClient } from "../src/app-server/client.js";
import { chooseEfforts, modelDescription, readCodexVersion, resolveLaunchConfiguration, runPreflight } from "../src/preflight.js";
import { clearMockEnvironment, setMockEnvironment } from "./helpers.js";

afterEach(clearMockEnvironment);

const create = () => {
  setMockEnvironment();
  const launch = resolveLaunchConfiguration(process.cwd());
  return { launch, client: new AppServerClient(launch.appServer) };
};

describe("preflight", () => {
  it("accepts only exact visible Sol and Luna models and chooses efforts", async () => {
    const { launch, client } = create();
    const result = await runPreflight(client, launch.codexCommand);
    expect(result.account.account?.planType).toBe("pro");
    expect(result.solEffort).toBe("max");
    expect(result.lunaFastEffort).toBe("low");
    expect(result.lunaHardEffort).toBe("high");
    await client.close();
  });

  it("rejects API-key authentication", async () => {
    const { launch, client } = create();
    process.env.MOCK_ACCOUNT_TYPE = "apiKey";
    await expect(runPreflight(client, launch.codexCommand)).rejects.toMatchObject({ code: "API_KEY_AUTH_FORBIDDEN" });
    await client.close();
  });

  it("rejects missing exact models without fallback", async () => {
    const { launch, client } = create();
    process.env.MOCK_MISSING_MODEL = "gpt-5.6-luna";
    await expect(runPreflight(client, launch.codexCommand)).rejects.toMatchObject({ code: "REQUIRED_MODELS_UNAVAILABLE" });
    await client.close();
  });

  it("selects reasoning levels by capability rank instead of catalog order", () => {
    const result = chooseEfforts(
      {
        id: "gpt-5.6-sol",
        model: "gpt-5.6-sol",
        supportedReasoningEfforts: [{ reasoningEffort: "high" }, { reasoningEffort: "low" }],
      },
      {
        id: "gpt-5.6-luna",
        model: "gpt-5.6-luna",
        supportedReasoningEfforts: [{ reasoningEffort: "high" }, { reasoningEffort: "low" }],
      },
    );

    expect(result).toMatchObject({
      solEffort: "high",
      solEffortFallback: true,
      lunaFastEffort: "low",
      lunaHardEffort: "high",
      solEfforts: ["low", "high"],
      lunaEfforts: ["low", "high"],
    });
  });

  it("describes exact model ids and hidden restrictions when required models are unavailable", () => {
    expect(modelDescription([
      { id: "gpt-5.6-terra", model: "gpt-5.6-terra", hidden: false },
      { id: "gpt-5.6-luna", model: "gpt-5.6-luna", hidden: true },
    ])).toContain("gpt-5.6-luna / gpt-5.6-luna (hidden)");
  });

  it("keeps the production transport fixed to the Codex stdio command", () => {
    const originalNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    process.env.CODEX_ORCHESTRATOR_APP_SERVER_COMMAND = "mock-server";
    process.env.CODEX_ORCHESTRATOR_APP_SERVER_ARGS = JSON.stringify(["mock-server.mjs"]);

    try {
      const launch = resolveLaunchConfiguration(process.cwd());
      expect(launch.appServer).toMatchObject({
        command: process.env.CODEX_ORCHESTRATOR_CODEX_PATH || "codex",
        args: ["app-server", "--listen", "stdio://"],
      });
    } finally {
      if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = originalNodeEnv;
      delete process.env.CODEX_ORCHESTRATOR_APP_SERVER_COMMAND;
      delete process.env.CODEX_ORCHESTRATOR_APP_SERVER_ARGS;
    }
  });

  it("rejects malformed test transport arguments", () => {
    process.env.CODEX_ORCHESTRATOR_APP_SERVER_ARGS = "not-json";
    expect(() => resolveLaunchConfiguration(process.cwd())).toThrowError(/JSON 배열/);
  });

  it("explains how to recover from a blocked WindowsApps Codex executable", async () => {
    await expect(readCodexVersion("C:\\Program Files\\WindowsApps\\OpenAI.Codex\\codex.exe"))
      .rejects.toThrow(/standalone Codex CLI/);
  });
});
