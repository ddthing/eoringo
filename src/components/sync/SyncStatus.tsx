import { AlertTriangle, Check, CloudOff, LoaderCircle } from "lucide-react";
import { useSyncStore } from "../../stores/sync/useSyncStore";

const labels = {
  disabled: "이 기기에 저장 중",
  saved: "동기화됨",
  syncing: "동기화 중",
  offline: "오프라인 · 변경사항 보관 중",
  conflict: "확인이 필요한 변경사항 있음",
  error: "동기화 재시도 대기 중",
} as const;

export const SyncStatus = () => {
  const status = useSyncStore((state) => state.status);
  const pendingCount = useSyncStore((state) => state.pendingCount);
  const Icon =
    status === "syncing"
      ? LoaderCircle
      : status === "saved"
        ? Check
        : status === "disabled" || status === "offline"
          ? CloudOff
          : AlertTriangle;

  return (
    <p className="inline-flex items-center gap-1.5 text-xs text-ink-muted" aria-live="polite">
      <Icon aria-hidden size={14} className={status === "syncing" ? "animate-spin" : ""} />
      <span>{labels[status]}</span>
      {pendingCount > 0 ? <span>({pendingCount})</span> : null}
    </p>
  );
};
