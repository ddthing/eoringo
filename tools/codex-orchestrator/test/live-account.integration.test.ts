import { describe, expect, it } from "vitest";
import { AppServerClient } from "../src/app-server/client.js";
import { resolveLaunchConfiguration, runPreflight } from "../src/preflight.js";

const live = process.env.CODEX_ORCHESTRATOR_LIVE_TEST === "1";

describe.skipIf(!live)("live account read-only integration", () => {
  it("reads executable, ChatGPT Pro account, exact models, and rate limits without a model turn", async () => {
    const launch = resolveLaunchConfiguration(process.cwd());
    const client = new AppServerClient({ ...launch.appServer, requestTimeoutMs: 60_000 });
    try {
      const result = await runPreflight(client, launch.codexCommand);
      expect(result.account.account?.type).toBe("chatgpt");
      expect(result.account.account?.planType).toBe("pro");
      expect(result.sol.model).toBe("gpt-5.6-sol");
      expect(result.luna.model).toBe("gpt-5.6-luna");
      expect(result.rateLimits).toBeTruthy();
    } finally {
      await client.close();
    }
  });
});
