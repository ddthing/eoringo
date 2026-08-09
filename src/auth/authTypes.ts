export type AuthStatus =
  | "disabled"
  | "initializing"
  | "no-session"
  | "creating-guest"
  | "guest"
  | "oauth-redirect"
  | "signing-out"
  | "permanent"
  | "error";

export type AuthMode = "local-only" | "guest" | "permanent";

export type AuthErrorCode =
  | "account-merge-required"
  | "captcha-required"
  | "configuration"
  | "network"
  | "oauth-cancelled"
  | "rate-limited"
  | "session-invalid"
  | "unknown";

export type AuthSessionSummary = {
  userId: string;
  mode: Exclude<AuthMode, "local-only">;
  provider: "anonymous" | "google" | "other";
};

export type AuthState = {
  status: AuthStatus;
  mode: AuthMode;
  userId: string | null;
  provider: AuthSessionSummary["provider"] | null;
  errorCode: AuthErrorCode | null;
};

export class AuthFailure extends Error {
  readonly code: AuthErrorCode;

  constructor(code: AuthErrorCode) {
    super(code);
    this.name = "AuthFailure";
    this.code = code;
  }
}
