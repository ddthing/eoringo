import { ArrowLeft, RefreshCw } from "lucide-react";
import { isRouteErrorResponse, Link, useRouteError } from "react-router-dom";

export const RouteErrorPage = () => {
  const error = useRouteError();
  const notFound = isRouteErrorResponse(error) && error.status === 404;

  return (
    <main className="grid min-h-[100dvh] place-items-center bg-bg px-6 text-ink">
      <section className="w-full max-w-sm space-y-5" aria-labelledby="route-error-heading">
        <p className="text-sm font-semibold text-ink-muted">에오링고</p>
        <h1 id="route-error-heading" className="text-2xl font-bold tracking-tight">
          {notFound ? "페이지를 찾을 수 없어요." : "화면을 불러오지 못했어요."}
        </h1>
        <p className="text-sm leading-relaxed text-ink-muted">
          {notFound ? "주소를 확인하거나 오늘 화면으로 돌아가주세요." : "연결 상태를 확인한 뒤 다시 시도해주세요."}
        </p>
        <div className="flex flex-wrap gap-2">
          <Link to="/" replace className="secondary-button gap-2">
            <ArrowLeft size={16} aria-hidden /> 오늘로
          </Link>
          {!notFound ? (
            <button type="button" className="primary-button gap-2" onClick={() => window.location.reload()}>
              <RefreshCw size={16} aria-hidden /> 다시 시도
            </button>
          ) : null}
        </div>
      </section>
    </main>
  );
};
