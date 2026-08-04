import { afterEach, describe, expect, it } from "vitest";
import { AppServerClient } from "../src/app-server/client.js";
import { resolveLaunchConfiguration, runPreflight } from "../src/preflight.js";
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
});
