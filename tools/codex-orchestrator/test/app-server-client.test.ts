import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { AppServerClient, buildCodexEnvironment } from "../src/app-server/client.js";
import { clearMockEnvironment, mockServerPath } from "./helpers.js";

afterEach(clearMockEnvironment);

describe("AppServerClient", () => {
  it("performs initialize then initialized before account requests", async () => {
    const directory = await mkdtemp(join(tmpdir(), "codex-trace-"));
    const trace = join(directory, "trace.jsonl");
    process.env.MOCK_TRACE_FILE = trace;
    const client = new AppServerClient({ command: process.execPath, args: [mockServerPath] });
    await client.start();
    const account = await client.request<{ account: { type: string } }>("account/read", { refreshToken: false });
    expect(account.account.type).toBe("chatgpt");
    await client.close();
    const messages = (await readFile(trace, "utf8")).trim().split("\n").map((line) => JSON.parse(line));
    expect(messages.slice(0, 3).map((message) => message.method)).toEqual(["initialize", "initialized", "account/read"]);
    expect(messages[1]).toEqual({ method: "initialized" });
  });

  it("fails a turn when the service reroutes the model", async () => {
    process.env.MOCK_REROUTE = "1";
    const client = new AppServerClient({ command: process.execPath, args: [mockServerPath] });
    await client.start();
    const thread = await client.startThread({ model: "gpt-5.6-sol" });
    await expect(client.runTurn({
      threadId: (thread.thread as { id: string }).id,
      input: "sole planner",
      effort: "max",
      model: "gpt-5.6-sol",
      cwd: process.cwd(),
      outputSchema: { type: "object" },
      sandboxPolicy: { type: "readOnly" },
    })).rejects.toMatchObject({ code: "MODEL_REROUTED" });
    await client.close();
  });

  it("rejects a thread model substitution even when only thread.model reports it", async () => {
    process.env.MOCK_THREAD_MODEL = "gpt-5.6-terra";
    process.env.MOCK_OMIT_RESULT_MODEL = "1";
    const client = new AppServerClient({ command: process.execPath, args: [mockServerPath] });
    await client.start();
    await expect(client.startThread({ model: "gpt-5.6-sol" })).rejects.toMatchObject({ code: "MODEL_SUBSTITUTED" });
    await client.close();
  });

  it("does not pass API-key credentials or API endpoints to Codex", () => {
    const previous = new Map([
      ["OPENAI_API_KEY", process.env.OPENAI_API_KEY],
      ["CODEX_API_KEY", process.env.CODEX_API_KEY],
      ["OPENAI_BASE_URL", process.env.OPENAI_BASE_URL],
      ["openai_api_key", process.env.openai_api_key],
      ["CODEX_HOME", process.env.CODEX_HOME],
    ]);
    process.env.OPENAI_API_KEY = "test-secret";
    process.env.CODEX_API_KEY = "test-secret";
    process.env.OPENAI_BASE_URL = "https://example.invalid";
    process.env.openai_api_key = "test-secret";
    process.env.CODEX_HOME = "managed-auth-home";
    try {
      const environment = buildCodexEnvironment();
      expect(environment.OPENAI_API_KEY).toBeUndefined();
      expect(environment.CODEX_API_KEY).toBeUndefined();
      expect(environment.OPENAI_BASE_URL).toBeUndefined();
      expect(environment.openai_api_key).toBeUndefined();
      expect(environment.CODEX_HOME).toBe("managed-auth-home");
      expect(environment.LOG_FORMAT).toBe("json");
    } finally {
      for (const [key, value] of previous) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      }
    }
  });
});
