import { CloudOff, Link2, LoaderCircle, ShieldCheck, UserRound } from "lucide-react";
import { lazy, Suspense, useCallback, useState } from "react";
import type { AuthErrorCode } from "../../auth/authTypes";
import { useAuth } from "../../auth/useAuth";
import { remoteSyncEnvironment } from "../../lib/supabase/env";
import { CaptchaGate } from "./CaptchaGate";
import { SyncStatus } from "../sync/SyncStatus";

const LocalMigrationLauncher = lazy(() =>
  import("../sync/LocalMigrationLauncher").then((module) => ({
    default: module.LocalMigrationLauncher,
  })),
);

const errorMessages: Record<AuthErrorCode, string> = {
  "account-merge-required":
    "이미 사용 중인 Google 계정입니다. 계정 병합 기능을 적용하기 전까지 현재 기기의 백업을 보관해 주세요.",
  "captcha-required": "보안 확인이 필요합니다. 잠시 후 다시 시도해 주세요.",
  configuration: "온라인 동기화 설정이 아직 완료되지 않았습니다.",
  network: "네트워크에 연결할 수 없습니다. 로컬 데이터는 그대로 사용할 수 있습니다.",
  "oauth-cancelled": "Google 연결이 취소되었습니다. 게스트 데이터는 그대로 유지됩니다.",
  "rate-limited": "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.",
  "session-invalid": "세션을 확인할 수 없습니다. 다시 시도해 주세요.",
  unknown: "계정을 연결하지 못했습니다. 로컬 데이터는 그대로 유지됩니다.",
};

export type AccountPanelProps = {
  embedded?: boolean;
};

export const AccountPanel = ({ embedded = false }: AccountPanelProps = {}) => {
  const auth = useAuth();
  const [message, setMessage] = useState("");
  const [captchaAttempt, setCaptchaAttempt] = useState(0);
  const isBusy = ["initializing", "creating-guest", "oauth-redirect"].includes(auth.status);

  const handleGoogleLink = async () => {
    setMessage("");

    try {
      await auth.connectGoogle();
    } catch (error) {
      const code =
        typeof error === "object" && error !== null && "code" in error
          ? (error.code as AuthErrorCode)
          : "unknown";
      setMessage(errorMessages[code] ?? errorMessages.unknown);
    }
  };

  const handleCaptchaVerified = useCallback(async (token: string) => {
    setMessage("");

    try {
      await auth.createGuest(token);
    } catch (error) {
      const code =
        typeof error === "object" && error !== null && "code" in error
          ? (error.code as AuthErrorCode)
          : "unknown";
      setMessage(errorMessages[code] ?? errorMessages.unknown);
      setCaptchaAttempt((attempt) => attempt + 1);
    }
  }, [auth.createGuest]);

  const handleCaptchaFailure = useCallback(() => {
    setMessage(errorMessages["captcha-required"]);
  }, []);

  if (auth.status === "disabled") {
    return (
      <section className={embedded ? "space-y-3" : "card space-y-3"}>
        <div className="flex items-start gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-card-soft text-ink-muted">
            <CloudOff aria-hidden size={18} />
          </span>
          <div>
            <p className="muted-label">account</p>
            <h2 className="text-lg font-bold text-ink">이 기기에서만 저장 중</h2>
            <p className="mt-1 text-sm text-ink-muted">
              온라인 동기화가 꺼져 있습니다. 지금까지 입력한 데이터는 브라우저에 그대로 보관됩니다.
            </p>
          </div>
        </div>
      </section>
    );
  }

  const isPermanent = auth.mode === "permanent";
  const isGuest = auth.mode === "guest";
  const visibleError = message || (auth.errorCode ? errorMessages[auth.errorCode] : "");

  return (
    <section className={embedded ? "space-y-4" : "card space-y-4"}>
      <div className="flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary-soft text-primary">
          {isPermanent ? <ShieldCheck aria-hidden size={18} /> : <UserRound aria-hidden size={18} />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="muted-label">account</p>
          <h2 className="text-lg font-bold text-ink">
            {isPermanent
              ? "Google 계정 연결됨"
              : isGuest
                ? "게스트로 사용 중"
                : "게스트 보안 확인"}
          </h2>
          <p className="mt-1 text-sm text-ink-muted">
            {isPermanent
              ? "이 계정으로 로그인하면 다른 기기에서도 동기화할 수 있습니다."
              : isGuest
                ? "Google 계정을 연결해도 현재 게스트 데이터와 사용자 ID는 그대로 유지됩니다."
                : "확인이 끝날 때까지 현재 데이터는 이 기기에 안전하게 보관됩니다."}
          </p>
        </div>
      </div>

      {auth.status === "no-session" && remoteSyncEnvironment.enabled ? (
        <CaptchaGate
          key={captchaAttempt}
          siteKey={remoteSyncEnvironment.turnstileSiteKey}
          onVerified={handleCaptchaVerified}
          onFailure={handleCaptchaFailure}
        />
      ) : null}

      {isGuest ? (
        <button
          type="button"
          className="primary-button flex w-full items-center justify-center gap-2 sm:w-auto"
          onClick={handleGoogleLink}
          disabled={isBusy || auth.status === "error"}
        >
          {isBusy ? (
            <LoaderCircle className="animate-spin" aria-hidden size={17} />
          ) : (
            <Link2 aria-hidden size={17} />
          )}
          {isBusy ? "계정 확인 중" : "Google 계정 연결"}
        </button>
      ) : null}

      {isPermanent && auth.userId ? (
        <Suspense fallback={<p className="text-sm text-ink-muted">데이터 확인 준비 중</p>}>
          <LocalMigrationLauncher userId={auth.userId} />
        </Suspense>
      ) : null}

      <SyncStatus />

      {auth.status === "error" ? (
        <button type="button" className="secondary-button" onClick={auth.retry}>
          다시 시도
        </button>
      ) : null}

      {visibleError ? (
        <p className="rounded-[14px] bg-card-soft p-3 text-sm text-ink-muted" aria-live="polite">
          {visibleError}
        </p>
      ) : null}
    </section>
  );
};
