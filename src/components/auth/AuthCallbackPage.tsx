import { LoaderCircle, ShieldAlert, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../auth/useAuth";

type CallbackPhase = "working" | "failed";

export const AuthCallbackPage = () => {
  const auth = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [phase, setPhase] = useState<CallbackPhase>("working");
  const code = searchParams.get("code");
  const providerError = searchParams.get("error");

  useEffect(() => {
    if (providerError || !code) {
      setPhase("failed");
      return;
    }

    let active = true;

    void auth
      .completeOAuthCallback(code)
      .then(() => {
        if (active) {
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
  }, [auth.completeOAuthCallback, code, navigate, providerError]);

  return (
    <section className="card mx-auto max-w-md space-y-4 text-center">
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
          {phase === "working" ? "Google 계정 확인 중" : "Google 연결을 완료하지 못했습니다"}
        </h1>
        <p className="mt-2 text-sm text-ink-muted">
          {phase === "working"
            ? "일회용 PKCE 코드를 안전하게 확인하고 있습니다."
            : "기존 게스트 세션과 로컬 데이터는 삭제되지 않았습니다."}
        </p>
      </div>
      {phase === "failed" ? (
        <Link className="secondary-button inline-flex items-center justify-center gap-2" to="/settings#account" replace>
          <ShieldCheck aria-hidden size={17} />
          계정 설정으로 돌아가기
        </Link>
      ) : null}
    </section>
  );
};
