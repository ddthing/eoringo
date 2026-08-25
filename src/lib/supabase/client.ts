import type { SupabaseClient, SupabaseClientOptions } from "@supabase/supabase-js";
import {
  remoteSyncEnvironment,
  type RemoteSyncEnvironment,
} from "./env";
import { createTimeoutFetch } from "./timeoutFetch";

type EnabledRemoteEnvironment = Extract<RemoteSyncEnvironment, { enabled: true }>;
type SupabaseFactory = (
  url: string,
  publishableKey: string,
  options: SupabaseClientOptions<"public">,
) => SupabaseClient;

const browserSupabaseFetch = createTimeoutFetch();

const getStorageKey = (supabaseUrl: string) => {
  const projectHost = new URL(supabaseUrl).hostname.replace(/[^a-z0-9.-]/gi, "-");

  return `eoringo-auth-${projectHost}`;
};

export const getBrowserClientOptions = (
  environment: EnabledRemoteEnvironment,
): SupabaseClientOptions<"public"> => ({
  auth: {
    autoRefreshToken: true,
    detectSessionInUrl: false,
    flowType: "pkce",
    persistSession: true,
    storageKey: getStorageKey(environment.supabaseUrl),
  },
  db: { schema: "public" },
  global: {
    fetch: browserSupabaseFetch,
    headers: { "X-Client-Info": "eoringo-web/0.1.0" },
  },
});

export const createBrowserSupabaseClient = async (
  environment: RemoteSyncEnvironment,
  factory?: SupabaseFactory,
) => {
  if (!environment.enabled) {
    return null;
  }

  const createSupabaseClient =
    factory ?? (await import("@supabase/supabase-js")).createClient;

  return createSupabaseClient(
    environment.supabaseUrl,
    environment.publishableKey,
    getBrowserClientOptions(environment),
  );
};

let browserClientPromise: Promise<SupabaseClient | null> | undefined;

export const getSupabaseClient = () => {
  if (!browserClientPromise) {
    browserClientPromise = createBrowserSupabaseClient(remoteSyncEnvironment);
  }

  return browserClientPromise;
};
