import { LoaderCircle, ShieldAlert, ShieldCheck } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../auth/useAuth";
import {
  clearIdentityConflictRecovery,
  hasIdentityConflictRecovery,
  markIdentityConflictRecovery,
} from "../../auth/authTransitionStorage";
import { stripOAuthCallbackQuery } from "../../auth/oauthCallbackUrl";
import { Button } from "../ui";

type CallbackPhase = "working" | "failed";

export const AuthCallbackPage = () => {
  const auth = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const code = searchParams.get("code");
  const providerError = searchParams.get("error");
  const providerErrorCode = searchParams.get("error_code");
  const isIdentityAlreadyLinked = providerErrorCode === "identity_already_exists";
  const autoRecoveryStarted = useRef(false);
  const [phase, setPhase] = useState<CallbackPhase>(() =>
    isIdentityAlreadyLinked && !hasIdentityConflictRecovery()
      ? "working"
      : providerError || !code
        ? "failed"
        : "working",
  );
  const [isRecoveryBusy, setIsRecoveryBusy] = useState(false);

  useEffect(() => {
    let active = true;

    if (typeof window !== "undefined") {
      window.history.replaceState(
        null,
        document.title,
        stripOAuthCallbackQuery(window.location.href),
      );
    }

    if (providerError || !code) {
      if (
        isIdentityAlreadyLinked &&
        !autoRecoveryStarted.current &&
        !hasIdentityConflictRecovery()
      ) {
        autoRecoveryStarted.current = true;
        markIdentityConflictRecovery();
        setPhase("working");
        setIsRecoveryBusy(true);

        void auth.signInExistingGoogle().catch(() => {
          if (active) {
            setIsRecoveryBusy(false);
            setPhase("failed");
          }
        });
      } else {
        setIsRecoveryBusy(false);
        setPhase("failed");
      }

      return () => {
        active = false;
      };
    }

    void auth
      .completeOAuthCallback(code)
      .then(() => {
        if (active) {
          clearIdentityConflictRecovery();
          navigate("/settings#account", { replace: true });
        }
      })
      .catch(() => {
        if (active) {
          setPhase("failed");
        }
      });

    return () => {
      active = false;
    };
  }, [
    auth.completeOAuthCallback,
    auth.signInExistingGoogle,
    code,
    isIdentityAlreadyLinked,
    navigate,
    providerError,
  ]);

  const handleExistingGoogleSignIn = async () => {
    setIsRecoveryBusy(true);
    setPhase("working");

    try {
      await auth.signInExistingGoogle();
    } catch {
      setIsRecoveryBusy(false);
      setPhase("failed");
    }
  };

  return (
    <section
      className="card mx-auto max-w-md space-y-4 text-center"
      aria-busy={phase === "working"}
    >
      <span className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-primary-soft text-primary">
        {phase === "working" ? (
          <LoaderCircle className="animate-spin" aria-hidden size={20} />
        ) : (
          <ShieldAlert aria-hidden size={20} />
        )}
      </span>
      <div>
        <p className="muted-label">secure sign-in</p>
        <h1 className="mt-1 text-lg font-black text-ink">
          {phase === "working"
            ? isIdentityAlreadyLinked
              ? "기존 Google 계정으로 안전하게 로그인 중"
              : "Google 계정 확인 중"
            : isIdentityAlreadyLinked
              ? "이미 연결된 Google 계정입니다"
              : "Google 연결을 완료하지 못했습니다"}
        </h1>
        <p className="mt-2 text-sm text-ink-muted">
          {phase === "working"
            ? isIdentityAlreadyLinked
              ? "이미 연결된 계정을 확인하고 동기화를 준비하고 있습니다."
              : "일회용 PKCE 코드를 안전하게 확인하고 있습니다."
            : isIdentityAlreadyLinked
              ? "이 Google 계정은 다른 에오링고 계정에 이미 연결되어 있습니다. 자동 병합하지 않으며 현재 게스트 데이터는 삭제되지 않습니다. 기존 계정으로 로그인하거나 다른 Google 계정을 선택해 주세요."
              : "기존 게스트 세션과 로컬 데이터는 삭제되지 않았습니다."}
        </p>
      </div>
      {phase === "failed" ? (
        <div className="flex flex-wrap justify-center gap-2">
          {isIdentityAlreadyLinked ? (
            <Button
              onClick={handleExistingGoogleSignIn}
              loading={isRecoveryBusy}
              loadingLabel="Google 로그인 준비 중"
            >
              <ShieldCheck aria-hidden size={17} />
              기존 Google 계정으로 로그인
            </Button>
          ) : null}
          <Link className="secondary-button inline-flex items-center justify-center gap-2" to="/settings#account" replace>
            <ShieldCheck aria-hidden size={17} />
            계정 설정으로 돌아가기
          </Link>
        </div>
      ) : null}
    </section>
  );
};
