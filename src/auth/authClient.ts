import type { Session, SupabaseClient, User } from "@supabase/supabase-js";
import { getSupabaseClient } from "../lib/supabase/client";
import {
  AuthFailure,
  type AuthErrorCode,
  type AuthSessionSummary,
} from "./authTypes";

type SupabaseAuth = SupabaseClient["auth"];
type AuthSessionListener = (
  session: AuthSessionSummary | null,
  error?: AuthFailure,
) => void;

export type AuthClient = {
  getCurrentSession: () => Promise<AuthSessionSummary | null>;
  createGuestSession: (captchaToken: string) => Promise<AuthSessionSummary>;
  signInGoogle: (redirectTo: string) => Promise<void>;
  signOut: () => Promise<void>;
  connectGoogle: (redirectTo: string) => Promise<void>;
  exchangeOAuthCode: (code: string) => Promise<AuthSessionSummary>;
  subscribe: (listener: AuthSessionListener) => () => void;
};

const knownCodes: Partial<Record<string, AuthErrorCode>> = {
  captcha_failed: "captcha-required",
  captcha_verification_failed: "captcha-required",
  identity_already_exists: "account-merge-required",
  identity_not_found: "session-invalid",
  manual_linking_disabled: "configuration",
  oauth_provider_not_supported: "configuration",
  over_request_rate_limit: "rate-limited",
  request_timeout: "network",
  session_not_found: "session-invalid",
};

export const normalizeAuthFailure = (error: unknown) => {
  if (error instanceof AuthFailure) {
    return error;
  }

  if (error instanceof TypeError) {
    return new AuthFailure("network");
  }

  if (typeof error === "object" && error !== null) {
    const candidate = error as { code?: unknown; status?: unknown };
    const code = typeof candidate.code === "string" ? knownCodes[candidate.code] : undefined;

    if (code) {
      return new AuthFailure(code);
    }

    if (candidate.status === 429) {
      return new AuthFailure("rate-limited");
    }
  }

  return new AuthFailure("unknown");
};

const summarizeUser = (user: User): AuthSessionSummary => {
  const isAnonymous = user.is_anonymous === true;
  const providers = new Set(user.identities?.map((identity) => identity.provider) ?? []);
  const provider = isAnonymous ? "anonymous" : providers.has("google") ? "google" : "other";

  return {
    userId: user.id,
    mode: isAnonymous ? "guest" : "permanent",
    provider,
  };
};

const assertVerifiedSession = async (auth: SupabaseAuth, session: Session | null) => {
  if (!session) {
    return null;
  }

  const { data, error } = await auth.getUser();

  if (error) {
    throw normalizeAuthFailure(error);
  }

  if (!data.user || data.user.id !== session.user.id) {
    throw new AuthFailure("session-invalid");
  }

  return summarizeUser(data.user);
};

const getVerifiedCurrentSession = async (auth: SupabaseAuth) => {
  const { data, error } = await auth.getSession();

  if (error) {
    throw normalizeAuthFailure(error);
  }

  return assertVerifiedSession(auth, data.session);
};

export const createAuthClient = (auth: SupabaseAuth): AuthClient => ({
  getCurrentSession: () => getVerifiedCurrentSession(auth),

  async createGuestSession(captchaToken) {
    if (!captchaToken.trim()) {
      throw new AuthFailure("captcha-required");
    }

    const { data, error } = await auth.signInAnonymously({
      options: { captchaToken },
    });

    if (error) {
      throw normalizeAuthFailure(error);
    }

    const summary = await assertVerifiedSession(auth, data.session);

    if (!summary || summary.mode !== "guest") {
      throw new AuthFailure("session-invalid");
    }

    return summary;
  },

  async signInGoogle(redirectTo) {
    const { error } = await auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
        scopes: "openid email profile",
      },
    });

    if (error) {
      throw normalizeAuthFailure(error);
    }
  },

  async signOut() {
    const { error } = await auth.signOut();

    if (error) {
      throw normalizeAuthFailure(error);
    }
  },

  async connectGoogle(redirectTo) {
    const session = await getVerifiedCurrentSession(auth);

    if (!session) {
      throw new AuthFailure("session-invalid");
    }

    if (session.mode === "permanent" && session.provider === "google") {
      return;
    }

    const { error } = await auth.linkIdentity({
      provider: "google",
      options: {
        redirectTo,
        scopes: "openid email profile",
      },
    });

    if (error) {
      throw normalizeAuthFailure(error);
    }
  },

  async exchangeOAuthCode(code) {
    const { data, error } = await auth.exchangeCodeForSession(code);

    if (error) {
      throw normalizeAuthFailure(error);
    }

    const summary = await assertVerifiedSession(auth, data.session);

    if (!summary) {
      throw new AuthFailure("session-invalid");
    }

    return summary;
  },

  subscribe(listener) {
    const { data } = auth.onAuthStateChange((_event, session) => {
      if (!session) {
        listener(null);
        return;
      }

      void assertVerifiedSession(auth, session)
        .then((summary) => listener(summary))
        .catch((error) => listener(null, normalizeAuthFailure(error)));
    });

    return () => data.subscription.unsubscribe();
  },
});

let browserAuthClientPromise: Promise<AuthClient | null> | undefined;

export const getBrowserAuthClient = () => {
  if (browserAuthClientPromise) {
    return browserAuthClientPromise;
  }

  browserAuthClientPromise = getSupabaseClient().then((supabase) =>
    supabase ? createAuthClient(supabase.auth) : null,
  );

  return browserAuthClientPromise;
};

const initializationPromises = new WeakMap<
  AuthClient,
  Promise<AuthSessionSummary | null>
>();
const guestCreationPromises = new WeakMap<AuthClient, Promise<AuthSessionSummary>>();
const callbackPromises = new WeakMap<AuthClient, Map<string, Promise<AuthSessionSummary>>>();

export const initializeAuthClient = (
  client: AuthClient,
) => {
  const existingPromise = initializationPromises.get(client);

  if (existingPromise) {
    return existingPromise;
  }

  const initialization = client.getCurrentSession();

  initializationPromises.set(client, initialization);
  void initialization.then(
    () => initializationPromises.delete(client),
    () => initializationPromises.delete(client),
  );

  return initialization;
};

export const createGuestSessionOnce = (client: AuthClient, captchaToken: string) => {
  const existingPromise = guestCreationPromises.get(client);

  if (existingPromise) {
    return existingPromise;
  }

  const creation = client.createGuestSession(captchaToken);
  guestCreationPromises.set(client, creation);
  void creation.then(
    () => guestCreationPromises.delete(client),
    () => guestCreationPromises.delete(client),
  );

  return creation;
};

export const exchangeOAuthCodeOnce = (client: AuthClient, code: string) => {
  let clientCallbacks = callbackPromises.get(client);

  if (!clientCallbacks) {
    clientCallbacks = new Map();
    callbackPromises.set(client, clientCallbacks);
  }

  const existingPromise = clientCallbacks.get(code);

  if (existingPromise) {
    return existingPromise;
  }

  const exchange = client.exchangeOAuthCode(code);
  clientCallbacks.set(code, exchange);
  void exchange.then(
    () => clientCallbacks?.delete(code),
    () => clientCallbacks?.delete(code),
  );

  return exchange;
};

export const buildAuthCallbackUrl = (origin: string) => {
  const url = new URL(origin);
  const isLocalhost = url.hostname === "localhost" || url.hostname === "127.0.0.1";

  if (url.username || url.password || (url.protocol !== "https:" && !(isLocalhost && url.protocol === "http:"))) {
    throw new AuthFailure("configuration");
  }

  url.pathname = "/auth/callback";
  url.search = "";
  url.hash = "";

  return url.toString();
};
