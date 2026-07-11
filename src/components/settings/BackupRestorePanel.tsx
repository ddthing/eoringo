import { type ChangeEvent, useRef, useState } from "react";
import { Download, RotateCcw, Upload } from "lucide-react";
import { useConfirmDialog } from "../common/ConfirmDialog";
import { exportBackup } from "../../lib/exportBackup";
import { clearCharacterImages } from "../../lib/imageStorage";
import { importBackup } from "../../lib/importBackup";
import { storageKeys } from "../../lib/storage";

export const BackupRestorePanel = () => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [message, setMessage] = useState("");
  const [isBusy, setIsBusy] = useState(false);

  const handleExport = async () => {
    setIsBusy(true);
    setMessage("");

    try {
      const payload = await exportBackup();
      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `eoringo-${payload.exportedAt.slice(0, 10)}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
      setMessage("백업 파일을 만들었습니다. 캐릭터 사진도 함께 포함됩니다.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "백업 파일을 만들 수 없습니다.");
    } finally {
      setIsBusy(false);
    }
  };

  const handleImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setIsBusy(true);
    setMessage("");

    try {
      const text = await file.text();
      await importBackup(JSON.parse(text));
      setMessage("복원이 끝났습니다. 화면을 새로고침합니다.");
      window.setTimeout(() => window.location.reload(), 600);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "복원에 실패했습니다.");
    } finally {
      setIsBusy(false);
      event.target.value = "";
    }
  };

  return (
    <section className="card space-y-4">
      <div>
        <p className="muted-label">local data</p>
        <h2 className="text-lg font-bold">백업 및 복원</h2>
        <p className="mt-1 text-sm text-ink-muted">
          브라우저에 저장된 루틴 데이터와 캐릭터 사진을 JSON 파일로 백업합니다.
        </p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          className="primary-button flex items-center justify-center gap-2"
          onClick={handleExport}
          disabled={isBusy}
        >
          <Download aria-hidden size={17} />
          {isBusy ? "처리 중…" : "백업"}
        </button>
        <button
          type="button"
          className="secondary-button flex items-center justify-center gap-2"
          onClick={() => fileInputRef.current?.click()}
          disabled={isBusy}
        >
          <Upload aria-hidden size={17} />
          복원
        </button>
      </div>
      <input
        ref={fileInputRef}
        className="hidden"
        type="file"
        accept="application/json"
        onChange={handleImport}
        aria-label="백업 파일 선택"
      />
      {message ? (
        <p className="rounded-lg bg-surface-muted p-3 text-sm text-ink-muted" aria-live="polite">
          {message}
        </p>
      ) : null}
    </section>
  );
};

export const DataManagementPanel = () => {
  const confirm = useConfirmDialog();
  const [message, setMessage] = useState("");
  const [isBusy, setIsBusy] = useState(false);

  const handleReset = async () => {
    const confirmed = await confirm({
      title: "모든 로컬 데이터를 초기화할까요?",
      description: "캐릭터, 체크리스트, D-day, 메모, 테마, 캐릭터 사진이 이 브라우저에서 삭제됩니다.",
      confirmLabel: "초기화",
      tone: "danger",
    });

    if (!confirmed) {
      return;
    }

    setIsBusy(true);
    setMessage("");

    try {
      Object.values(storageKeys).forEach((key) => localStorage.removeItem(key));
      await clearCharacterImages();
      window.location.reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "초기화에 실패했습니다.");
      setIsBusy(false);
    }
  };

  return (
    <section className="card space-y-4">
      <div>
        <p className="muted-label">local data</p>
        <h2 className="text-lg font-bold">데이터 관리</h2>
        <p className="mt-1 text-sm text-ink-muted">
          이 브라우저에 저장된 모든 앱 데이터를 삭제합니다. 먼저 백업을 권장합니다.
        </p>
      </div>
      <button
        type="button"
        className="secondary-button flex w-full items-center justify-center gap-2 text-[rgb(var(--color-danger))] sm:w-auto"
        onClick={handleReset}
        disabled={isBusy}
      >
        <RotateCcw aria-hidden size={17} />
        {isBusy ? "처리 중…" : "모든 데이터 초기화"}
      </button>
      {message ? (
        <p className="rounded-lg bg-surface-muted p-3 text-sm text-ink-muted" aria-live="polite">
          {message}
        </p>
      ) : null}
    </section>
  );
};
