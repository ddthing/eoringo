import { ArrowRightLeft, CloudOff, Link2, LogIn, LogOut, ShieldCheck, UserRound } from "lucide-react";
import { lazy, Suspense, useCallback, useState } from "react";
import type { AuthErrorCode } from "../../auth/authTypes";
import { useAuth } from "../../auth/useAuth";
import { remoteSyncEnvironment } from "../../lib/supabase/env";
import { CaptchaGate } from "./CaptchaGate";
import { SyncStatus } from "../sync/SyncStatus";
import { Badge, Button, Card, SectionHeader, StatusMessage } from "../ui";

const LocalMigrationLauncher = lazy(() =>
  import("../sync/LocalMigrationLauncher").then((module) => ({
    default: module.LocalMigrationLauncher,
  })),
);

const LoginSafetyNotice = () => (
  <StatusMessage variant="info" title="안전한 Google 로그인">
    Google의 공식 동의 화면에서 기본 프로필과 이메일만 요청합니다. Google 비밀번호, Gmail, Drive에는 접근하지 않습니다. <a className="font-black underline underline-offset-4" href="/privacy">개인정보 안내 보기</a>
  </StatusMessage>
);

const errorMessages: Record<AuthErrorCode, string> = {
  "account-merge-required":
    "이 Google 계정은 다른 에오링고 계정에 이미 연결되어 있습니다. 자동 병합하지 않으므로 기존 계정으로 로그인하거나 다른 Google 계정을 사용해 주세요. 현재 게스트 데이터는 그대로 유지됩니다.",
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
  const [captchaFailed, setCaptchaFailed] = useState(false);
  const isBusy = ["initializing", "creating-guest", "oauth-redirect", "signing-out"].includes(auth.status);
  const isPendingSignIn = auth.status === "oauth-redirect" && auth.mode === "local-only";
  const isNoSession = auth.status === "no-session" || isPendingSignIn;

  const handleGoogleSignIn = async () => {
    setMessage("");

    try {
      await auth.signInGoogle();
    } catch (error) {
      const code =
        typeof error === "object" && error !== null && "code" in error
          ? (error.code as AuthErrorCode)
          : "unknown";
      setMessage(errorMessages[code] ?? errorMessages.unknown);
    }
  };

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
    setCaptchaFailed(false);

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
    setCaptchaFailed(true);
  }, []);

  const handleCaptchaRetry = () => {
    setMessage("");
    setCaptchaFailed(false);
    setCaptchaAttempt((attempt) => attempt + 1);
  };

  const handleSwitchAccount = async () => {
    setMessage("");

    try {
      await auth.signInExistingGoogle();
    } catch (error) {
      const code =
        typeof error === "object" && error !== null && "code" in error
          ? (error.code as AuthErrorCode)
          : "unknown";
      setMessage(errorMessages[code] ?? errorMessages.unknown);
    }
  };

  const handleSignOut = async () => {
    setMessage("");

    try {
      await auth.signOut();
    } catch (error) {
      const code =
        typeof error === "object" && error !== null && "code" in error
          ? (error.code as AuthErrorCode)
          : "unknown";
      setMessage(errorMessages[code] ?? errorMessages.unknown);
    }
  };

  if (auth.status === "disabled") {
    return (
      <Card className={embedded ? "space-y-3 border-0 p-0 shadow-none" : "space-y-3 p-5"}>
        <div className="flex items-start gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-card-soft text-ink-muted">
            <CloudOff aria-hidden size={18} />
          </span>
          <SectionHeader
            className="min-w-0 flex-1"
            title="이 기기에서만 저장 중"
            description="온라인 동기화가 꺼져 있습니다. 지금까지 입력한 데이터는 브라우저에 그대로 보관됩니다."
          />
        </div>
      </Card>
    );
  }

  const isPermanent = auth.mode === "permanent";
  const isGuest = auth.mode === "guest";
  const visibleError = message || (auth.errorCode ? errorMessages[auth.errorCode] : "");

  const content = (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary-soft text-primary">
          {isPermanent ? <ShieldCheck aria-hidden size={18} /> : <UserRound aria-hidden size={18} />}
        </span>
        <SectionHeader
          className="min-w-0 flex-1"
          title={
            isPermanent ? "Google 계정 연결됨" : isGuest ? "게스트로 사용 중" : "게스트로 시작하기"
          }
          description={
            isPermanent
              ? "이 계정으로 로그인하면 다른 기기에서도 동기화할 수 있습니다."
              : isGuest
                ? "Google 계정을 연결해도 현재 게스트 데이터와 사용자 ID는 그대로 유지됩니다."
                : "로그인하지 않아도 이 기기에서 바로 시작할 수 있습니다. 게스트 데이터는 이 브라우저에 안전하게 보관됩니다."
          }
        />
      </div>

      {isNoSession ? (
        <div className="space-y-3">
          <LoginSafetyNotice />
          <Button
            variant="secondary"
            className="w-full sm:w-auto"
            onClick={handleGoogleSignIn}
            loading={isPendingSignIn}
            loadingLabel="Google 로그인 준비 중"
            disabled={isBusy}
          >
            <LogIn aria-hidden size={17} />
            Google로 로그인
          </Button>

          {auth.status === "no-session" && remoteSyncEnvironment.enabled ? (
            <div className="space-y-3 border-t border-[rgb(var(--color-line-muted))] pt-3">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-black text-ink">게스트로 계속하기</p>
                <Badge variant="accent">기본</Badge>
              </div>
              <CaptchaGate
                key={captchaAttempt}
                siteKey={remoteSyncEnvironment.turnstileSiteKey}
                onVerified={handleCaptchaVerified}
                onFailure={handleCaptchaFailure}
              />
              {captchaFailed ? (
                <Button variant="ghost" size="sm" onClick={handleCaptchaRetry}>
                  보안 확인 다시 시도
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      {isGuest ? (
        <div className="space-y-3">
          <LoginSafetyNotice />
          <Button
            variant="primary"
            className="w-full sm:w-auto"
            onClick={handleGoogleLink}
            disabled={isBusy || auth.status === "error"}
            loading={isBusy}
            loadingLabel="계정 확인 중"
          >
            <Link2 aria-hidden size={17} />
            Google 계정 연결
          </Button>
        </div>
      ) : null}

      {isPermanent && auth.userId ? (
        <Suspense fallback={<p className="text-sm text-ink-muted">데이터 확인 준비 중</p>}>
          <LocalMigrationLauncher userId={auth.userId} />
        </Suspense>
      ) : null}

      <SyncStatus />

      {isPermanent ? (
        <div className="flex flex-wrap gap-2 border-t border-[rgb(var(--color-line-muted))] pt-3">
          <Button
            variant="secondary"
            onClick={handleSwitchAccount}
            loading={auth.status === "oauth-redirect"}
            loadingLabel="계정 전환 준비 중"
            disabled={isBusy}
          >
            <ArrowRightLeft aria-hidden size={16} />
            다른 Google 계정으로 전환
          </Button>
          <Button
            variant="ghost"
            onClick={handleSignOut}
            loading={auth.status === "signing-out"}
            loadingLabel="로그아웃 중"
            disabled={isBusy}
          >
            <LogOut aria-hidden size={16} />
            이 기기에서 로그아웃
          </Button>
          <p className="basis-full text-xs text-ink-muted">
            로그아웃해도 Google 계정의 원격 데이터는 삭제되지 않습니다.
          </p>
        </div>
      ) : null}

      {auth.status === "error" ? (
        <Button variant="secondary" onClick={auth.retry}>
          다시 시도
        </Button>
      ) : null}

      {visibleError ? (
        <StatusMessage variant="danger" aria-live="polite">
          {visibleError}
        </StatusMessage>
      ) : null}
    </div>
  );

  return embedded ? content : <Card className="space-y-4 p-5">{content}</Card>;
};
