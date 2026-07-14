import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PropsWithChildren,
} from "react";
import { AlertTriangle, X } from "lucide-react";

type ConfirmTone = "default" | "danger";

type ConfirmOptions = {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: ConfirmTone;
};

type ConfirmRequest = Required<Omit<ConfirmOptions, "description">> & {
  description?: string;
};

type ConfirmDialogContextValue = {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
};

const ConfirmDialogContext = createContext<ConfirmDialogContextValue | null>(null);

export const useConfirmDialog = () => {
  const context = useContext(ConfirmDialogContext);

  if (!context) {
    throw new Error("useConfirmDialog must be used inside ConfirmDialogProvider.");
  }

  return context.confirm;
};

const getFocusableElements = (root: HTMLElement) =>
  Array.from(
    root.querySelectorAll<HTMLElement>(
      'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
    ),
  );

export const ConfirmDialogProvider = ({ children }: PropsWithChildren) => {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const resolverRef = useRef<((confirmed: boolean) => void) | null>(null);
  const [request, setRequest] = useState<ConfirmRequest | null>(null);

  const closeDialog = useCallback((confirmed: boolean) => {
    resolverRef.current?.(confirmed);
    resolverRef.current = null;
    setRequest(null);
  }, []);

  const confirm = useCallback((options: ConfirmOptions) => {
    const nextRequest: ConfirmRequest = {
      title: options.title,
      description: options.description,
      confirmLabel: options.confirmLabel ?? "확인",
      cancelLabel: options.cancelLabel ?? "취소",
      tone: options.tone ?? "default",
    };

    return new Promise<boolean>((resolve) => {
      resolverRef.current?.(false);
      resolverRef.current = resolve;
      setRequest(nextRequest);
    });
  }, []);

  useEffect(() => {
    if (!request) {
      return undefined;
    }

    const previouslyFocusedElement =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const originalOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";
    window.setTimeout(() => {
      getFocusableElements(dialogRef.current ?? document.body)[0]?.focus();
    }, 0);

    return () => {
      document.body.style.overflow = originalOverflow;
      previouslyFocusedElement?.focus();
    };
  }, [request]);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!request) {
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      closeDialog(false);
      return;
    }

    if (event.key !== "Tab") {
      return;
    }

    const focusableElements = getFocusableElements(event.currentTarget);

    if (focusableElements.length === 0) {
      return;
    }

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (event.shiftKey && document.activeElement === firstElement) {
      event.preventDefault();
      lastElement.focus();
      return;
    }

    if (!event.shiftKey && document.activeElement === lastElement) {
      event.preventDefault();
      firstElement.focus();
    }
  };

  return (
    <ConfirmDialogContext.Provider value={{ confirm }}>
      {children}
      {request ? (
        <div
          ref={dialogRef}
          className="fixed inset-0 z-[70] grid place-items-end overflow-y-auto overscroll-contain bg-[rgb(var(--color-overlay)/0.58)] p-3 backdrop-blur-[3px] sm:place-items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-dialog-title"
          aria-describedby={request.description ? "confirm-dialog-description" : undefined}
          onKeyDown={handleKeyDown}
        >
          <div className="w-full max-w-[360px] rounded-[22px] border border-[rgb(var(--color-line-soft))] bg-card p-3 shadow-[0_18px_46px_rgb(30_35_40/0.18),0_2px_8px_rgb(30_35_40/0.08)]">
            <div className="flex items-start gap-3">
              <div
                className={[
                  "grid h-9 w-9 shrink-0 place-items-center rounded-full border",
                  request.tone === "danger"
                    ? "border-[rgb(var(--color-danger)/0.28)] bg-[rgb(var(--color-danger)/0.1)] text-[rgb(var(--color-danger))]"
                    : "border-[rgb(var(--color-line-soft))] bg-primary-soft text-primary",
                ].join(" ")}
              >
                <AlertTriangle aria-hidden size={17} />
              </div>
              <div className="min-w-0 flex-1">
                <p
                  id="confirm-dialog-title"
                  className="text-sm font-black leading-snug text-ink"
                >
                  {request.title}
                </p>
                {request.description ? (
                  <p
                    id="confirm-dialog-description"
                    className="mt-1 text-xs leading-relaxed text-ink-muted"
                  >
                    {request.description}
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-[rgb(var(--color-line-muted))] bg-card text-ink-muted shadow-[0_1px_3px_rgb(30_35_40/0.08)] transition hover:text-ink active:scale-95"
                onClick={() => closeDialog(false)}
                aria-label="닫기"
              >
                <X aria-hidden size={15} />
              </button>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                className="secondary-button"
                onClick={() => closeDialog(false)}
              >
                {request.cancelLabel}
              </button>
              <button
                type="button"
                className={[
                  "primary-button",
                  request.tone === "danger"
                    ? "border-[rgb(var(--color-danger)/0.28)] bg-[rgb(var(--color-danger))] text-[rgb(var(--color-danger-foreground))]"
                    : "",
                ].join(" ")}
                onClick={() => closeDialog(true)}
              >
                {request.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </ConfirmDialogContext.Provider>
  );
};
