import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.doUnmock("../lib/supabase/env");
  vi.doUnmock("@supabase/supabase-js");
  vi.resetModules();
});

describe("browser auth client recovery", () => {
  it("retries both client layers after failure and shares a successful instance", async () => {
    vi.resetModules();
    const createClient = vi.fn()
      .mockImplementationOnce(() => { throw new TypeError("SDK unavailable"); })
      .mockReturnValue({ auth: {} });
    vi.doMock("../lib/supabase/env", () => ({
      remoteSyncEnvironment: {
        enabled: true,
        imageUploadsEnabled: false,
        supabaseUrl: "https://project.supabase.co",
        publishableKey: "sb_publishable_test-value",
        turnstileSiteKey: "1x00000000000000000000AA",
      },
    }));
    vi.doMock("@supabase/supabase-js", () => ({ createClient }));
    const { getBrowserAuthClient } = await import("./authClient");

    const first = getBrowserAuthClient();
    expect(getBrowserAuthClient()).toBe(first);
    await expect(first).rejects.toThrow("SDK unavailable");

    const retry = getBrowserAuthClient();
    expect(retry).not.toBe(first);
    expect(getBrowserAuthClient()).toBe(retry);
    const client = await retry;
    expect(client).toHaveProperty("getCurrentSession");
    await expect(getBrowserAuthClient()).resolves.toBe(client);
    expect(createClient).toHaveBeenCalledTimes(2);
  });
});
