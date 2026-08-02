import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  createBrowserSupabaseClient,
  getBrowserClientOptions,
} from "./client";

const enabledEnvironment = {
  enabled: true,
  imageUploadsEnabled: false,
  supabaseUrl: "https://project.supabase.co",
  publishableKey: "sb_publishable_test-value",
  turnstileSiteKey: "1x00000000000000000000AA",
} as const;

describe("browser Supabase client", () => {
  it("does not construct a client in local-only mode", async () => {
    const factory = vi.fn();

    await expect(
      createBrowserSupabaseClient(
        { enabled: false, imageUploadsEnabled: false },
        factory,
      ),
    ).resolves.toBeNull();
    expect(factory).not.toHaveBeenCalled();
  });

  it("uses PKCE without automatically consuming arbitrary URL parameters", () => {
    expect(getBrowserClientOptions(enabledEnvironment)).toMatchObject({
      auth: {
        autoRefreshToken: true,
        detectSessionInUrl: false,
        flowType: "pkce",
        persistSession: true,
      },
      db: { schema: "public" },
    });
  });

  it("passes only the validated URL and publishable key to the SDK", async () => {
    const client = {} as SupabaseClient;
    const factory = vi.fn(() => client);

    await expect(createBrowserSupabaseClient(enabledEnvironment, factory)).resolves.toBe(client);
    expect(factory).toHaveBeenCalledWith(
      enabledEnvironment.supabaseUrl,
      enabledEnvironment.publishableKey,
      expect.any(Object),
    );
  });
});
