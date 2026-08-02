import { useEffect, useRef } from "react";

export const turnstileScriptUrl =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

type TurnstileApi = {
  ready: (callback: () => void) => void;
  render: (
    container: HTMLElement,
    options: {
      sitekey: string;
      action: string;
      appearance: "interaction-only";
      size: "flexible";
      theme: "auto";
      callback: (token: string) => void;
      "error-callback": () => void;
      "expired-callback": () => void;
      "timeout-callback": () => void;
    },
  ) => string;
  remove: (widgetId: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

let scriptPromise: Promise<TurnstileApi> | undefined;

const loadTurnstile = () => {
  if (window.turnstile) {
    return Promise.resolve(window.turnstile);
  }

  if (scriptPromise) {
    return scriptPromise;
  }

  scriptPromise = new Promise<TurnstileApi>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${turnstileScriptUrl}"]`,
    );
    const script = existing ?? document.createElement("script");

    const handleLoad = () => {
      if (window.turnstile) {
        resolve(window.turnstile);
      } else {
        scriptPromise = undefined;
        reject(new Error("Turnstile API unavailable."));
      }
    };
    const handleError = () => {
      scriptPromise = undefined;
      script.remove();
      reject(new Error("Turnstile script failed to load."));
    };

    script.addEventListener("load", handleLoad, { once: true });
    script.addEventListener("error", handleError, { once: true });

    if (!existing) {
      script.src = turnstileScriptUrl;
      script.async = true;
      script.defer = true;
      script.referrerPolicy = "no-referrer";
      document.head.append(script);
    }
  });

  return scriptPromise;
};

export const isSafeCaptchaToken = (token: string) =>
  token.length > 0 && token.length <= 4096 && !/[\u0000-\u001f\u007f]/.test(token);

type CaptchaGateProps = {
  siteKey: string;
  onVerified: (token: string) => void;
  onFailure: () => void;
};

export const CaptchaGate = ({ siteKey, onVerified, onFailure }: CaptchaGateProps) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    let api: TurnstileApi | undefined;
    let widgetId: string | undefined;

    void loadTurnstile()
      .then((loadedApi) => {
        api = loadedApi;
        loadedApi.ready(() => {
          if (!active || !containerRef.current) {
            return;
          }

          widgetId = loadedApi.render(containerRef.current, {
            sitekey: siteKey,
            action: "guest_signup",
            appearance: "interaction-only",
            size: "flexible",
            theme: "auto",
            callback: (token) => {
              if (active && isSafeCaptchaToken(token)) {
                onVerified(token);
              } else if (active) {
                onFailure();
              }
            },
            "error-callback": onFailure,
            "expired-callback": onFailure,
            "timeout-callback": onFailure,
          });
        });
      })
      .catch(() => {
        if (active) {
          onFailure();
        }
      });

    return () => {
      active = false;

      if (api && widgetId) {
        api.remove(widgetId);
      }
    };
  }, [onFailure, onVerified, siteKey]);

  return (
    <div className="space-y-2">
      <p className="text-sm text-ink-muted">
        게스트 계정을 만들기 전에 자동 가입 방지를 위한 보안 확인을 진행합니다.
      </p>
      <div ref={containerRef} className="min-h-16 w-full" aria-label="보안 확인" />
    </div>
  );
};
