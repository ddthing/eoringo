import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { AppServerClient } from "../src/app-server/client.js";
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
});
