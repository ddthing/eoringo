import { Component, type ErrorInfo, type ReactNode } from "react";

type ErrorBoundaryProps = {
  children: ReactNode;
};

type ErrorBoundaryState = {
  hasError: boolean;
};

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    hasError: false,
  };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Eoringo render error", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-[18px] border border-[rgb(var(--color-line-soft))] bg-card p-4 text-sm text-ink">
          <p className="font-bold">문제가 발생했어요.</p>
          <p className="mt-1 text-ink-muted">
            새로고침하거나 설정에서 데이터를 백업한 뒤 초기화해보세요.
          </p>
          <button
            type="button"
            className="primary-button mt-3"
            onClick={() => window.location.reload()}
          >
            새로고침
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
