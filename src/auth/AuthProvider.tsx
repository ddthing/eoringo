import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useState,
  type PropsWithChildren,
} from "react";
import {
  buildAuthCallbackUrl,
  createGuestSessionOnce,
  exchangeOAuthCodeOnce,
  getBrowserAuthClient,
  initializeAuthClient,
  normalizeAuthFailure,
  type AuthClient,
} from "./authClient";
import type {
  AuthErrorCode,
  AuthSessionSummary,
  AuthState,
} from "./authTypes";

type AuthAction =
  | { type: "disabled" }
  | { type: "initializing" }
  | { type: "no-session" }
  | { type: "creating-guest" }
  | { type: "oauth-redirect" }
  | { type: "ready"; session: AuthSessionSummary }
  | { type: "error"; code: AuthErrorCode };

export const disabledAuthState: AuthState = {
  status: "disabled",
  mode: "local-only",
  userId: null,
  provider: null,
  errorCode: null,
};

export const initializingAuthState: AuthState = {
  ...disabledAuthState,
  status: "initializing",
};

export const authStateReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case "disabled":
      return disabledAuthState;
    case "initializing":
      return initializingAuthState;
    case "no-session":
      return { ...initializingAuthState, status: "no-session" };
    case "creating-guest":
      return { ...initializingAuthState, status: "creating-guest" };
    case "oauth-redirect":
      return { ...state, status: "oauth-redirect", errorCode: null };
    case "ready":
      return {
        status: action.session.mode === "guest" ? "guest" : "permanent",
        mode: action.session.mode,
        userId: action.session.userId,
        provider: action.session.provider,
        errorCode: null,
      };
    case "error":
      return {
        ...disabledAuthState,
        status: "error",
        errorCode: action.code,
      };
  }
};

type AuthContextValue = AuthState & {
  createGuest: (captchaToken: string) => Promise<void>;
  signInGoogle: () => Promise<void>;
  connectGoogle: () => Promise<void>;
  completeOAuthCallback: (code: string) => Promise<void>;
  retry: () => void;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

type AuthProviderProps = PropsWithChildren<{
  client?: AuthClient | null;
}>;

export const AuthProvider = ({ children, client: providedClient }: AuthProviderProps) => {
  const [client, setClient] = useState<AuthClient | null | undefined>(providedClient);
  const [state, dispatch] = useReducer(
    authStateReducer,
    providedClient === null ? disabledAuthState : initializingAuthState,
  );
  const [retryVersion, setRetryVersion] = useState(0);

  useEffect(() => {
    if (providedClient !== undefined) {
      setClient(providedClient);
      return undefined;
    }

    let active = true;

    void getBrowserAuthClient().then((loadedClient) => {
      if (active) {
        setClient(loadedClient);
      }
    });

    return () => {
      active = false;
    };
  }, [providedClient]);

  useEffect(() => {
    if (client === undefined) {
      dispatch({ type: "initializing" });
      return undefined;
    }

    if (!client) {
      dispatch({ type: "disabled" });
      return undefined;
    }

    let active = true;
    dispatch({ type: "initializing" });

    const unsubscribe = client.subscribe((session, error) => {
      if (!active) {
        return;
      }

      if (error) {
        dispatch({ type: "error", code: error.code });
      } else if (session) {
        dispatch({ type: "ready", session });
      } else {
        dispatch({ type: "no-session" });
      }
    });

    void initializeAuthClient(client)
      .then((session) => {
        if (active && session) {
          dispatch({ type: "ready", session });
        } else if (active) {
          dispatch({ type: "no-session" });
        }
      })
      .catch((error) => {
        if (active) {
          dispatch({ type: "error", code: normalizeAuthFailure(error).code });
        }
      });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [client, retryVersion]);

  const createGuest = useCallback(
    async (captchaToken: string) => {
      if (!client) {
        throw normalizeAuthFailure({ code: "manual_linking_disabled" });
      }

      dispatch({ type: "creating-guest" });

      try {
        const session = await createGuestSessionOnce(client, captchaToken);
        dispatch({ type: "ready", session });
      } catch (error) {
        const failure = normalizeAuthFailure(error);
        dispatch({ type: "error", code: failure.code });
        throw failure;
      }
    },
    [client],
  );

  const connectGoogle = useCallback(async () => {
    if (!client) {
      throw normalizeAuthFailure({ code: "manual_linking_disabled" });
    }

    dispatch({ type: "oauth-redirect" });

    try {
      await client.connectGoogle(buildAuthCallbackUrl(window.location.origin));
      const restoredSession = await client.getCurrentSession();

      if (restoredSession) {
        dispatch({ type: "ready", session: restoredSession });
      }
    } catch (error) {
      const failure = normalizeAuthFailure(error);

      try {
        const restoredSession = await client.getCurrentSession();

        if (restoredSession) {
          dispatch({ type: "ready", session: restoredSession });
        } else {
          dispatch({ type: "error", code: failure.code });
        }
      } catch {
        dispatch({ type: "error", code: failure.code });
      }

      throw failure;
    }
  }, [client]);

  const signInGoogle = useCallback(async () => {
    if (!client) {
      throw normalizeAuthFailure({ code: "manual_linking_disabled" });
    }

    dispatch({ type: "oauth-redirect" });

    try {
      await client.signInGoogle(buildAuthCallbackUrl(window.location.origin));
      const restoredSession = await client.getCurrentSession();

      if (restoredSession) {
        dispatch({ type: "ready", session: restoredSession });
      }
    } catch (error) {
      const failure = normalizeAuthFailure(error);

      try {
        const restoredSession = await client.getCurrentSession();

        if (restoredSession) {
          dispatch({ type: "ready", session: restoredSession });
        } else {
          dispatch({ type: "error", code: failure.code });
        }
      } catch {
        dispatch({ type: "error", code: failure.code });
      }

      throw failure;
    }
  }, [client]);

  const completeOAuthCallback = useCallback(
    async (code: string) => {
      if (!client) {
        throw normalizeAuthFailure({ code: "manual_linking_disabled" });
      }

      dispatch({ type: "oauth-redirect" });

      try {
        const session = await exchangeOAuthCodeOnce(client, code);
        dispatch({ type: "ready", session });
      } catch (error) {
        const failure = normalizeAuthFailure(error);

        try {
          const restoredSession = await client.getCurrentSession();

          if (restoredSession) {
            dispatch({ type: "ready", session: restoredSession });
          } else {
            dispatch({ type: "error", code: failure.code });
          }
        } catch {
          dispatch({ type: "error", code: failure.code });
        }

        throw failure;
      }
    },
    [client],
  );

  const retry = useCallback(() => setRetryVersion((version) => version + 1), []);
  const value = useMemo(
    () => ({ ...state, createGuest, signInGoogle, connectGoogle, completeOAuthCallback, retry }),
    [completeOAuthCallback, connectGoogle, createGuest, retry, signInGoogle, state],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
