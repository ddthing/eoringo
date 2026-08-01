import { describe, expect, it } from "vitest";
import { parseRemoteSyncEnvironment } from "./env";

const publishableKey = "sb_publishable_test-value";

describe("parseRemoteSyncEnvironment", () => {
  it("keeps the app safely local-only when remote sync is disabled", () => {
    expect(
      parseRemoteSyncEnvironment(
        {
          VITE_REMOTE_SYNC_ENABLED: "false",
          VITE_IMAGE_UPLOADS_ENABLED: "true",
        },
        { production: true },
      ),
    ).toEqual({ enabled: false, imageUploadsEnabled: false });
  });

  it("accepts local development configuration", () => {
    expect(
      parseRemoteSyncEnvironment(
        {
          VITE_REMOTE_SYNC_ENABLED: "true",
          VITE_IMAGE_UPLOADS_ENABLED: "true",
          VITE_SUPABASE_URL: "http://127.0.0.1:54321/",
          VITE_SUPABASE_PUBLISHABLE_KEY: publishableKey,
        },
        { production: false },
      ),
    ).toEqual({
      enabled: true,
      imageUploadsEnabled: true,
      supabaseUrl: "http://127.0.0.1:54321",
      publishableKey,
    });
  });

  it("accepts a secure production configuration", () => {
    expect(
      parseRemoteSyncEnvironment(
        {
          VITE_REMOTE_SYNC_ENABLED: "true",
          VITE_SUPABASE_URL: "https://project.supabase.co",
          VITE_SUPABASE_PUBLISHABLE_KEY: publishableKey,
        },
        { production: true },
      ),
    ).toMatchObject({ enabled: true, imageUploadsEnabled: false });
  });

  it.each([
    ["missing URL", { VITE_REMOTE_SYNC_ENABLED: "true", VITE_SUPABASE_PUBLISHABLE_KEY: publishableKey }],
    [
      "malformed key",
      {
        VITE_REMOTE_SYNC_ENABLED: "true",
        VITE_SUPABASE_URL: "https://project.supabase.co",
        VITE_SUPABASE_PUBLISHABLE_KEY: "not-a-publishable-key",
      },
    ],
    [
      "local production URL",
      {
        VITE_REMOTE_SYNC_ENABLED: "true",
        VITE_SUPABASE_URL: "http://localhost:54321",
        VITE_SUPABASE_PUBLISHABLE_KEY: publishableKey,
      },
    ],
  ])("rejects %s", (_name, source) => {
    expect(() => parseRemoteSyncEnvironment(source, { production: true })).toThrow();
  });

  it("rejects privileged values exposed through browser configuration", () => {
    expect(() =>
      parseRemoteSyncEnvironment(
        {
          VITE_REMOTE_SYNC_ENABLED: "false",
          VITE_SUPABASE_SERVICE_ROLE_KEY: "secret",
        },
        { production: false },
      ),
    ).toThrow("must never be exposed to the browser");
  });

  it("rejects ambiguous feature flag values", () => {
    expect(() =>
      parseRemoteSyncEnvironment(
        { VITE_REMOTE_SYNC_ENABLED: "yes" },
        { production: false },
      ),
    ).toThrow("must be either true or false");
  });
});
