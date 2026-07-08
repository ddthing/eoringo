import { ChangeEvent, useRef, useState } from "react";
import { Download, RotateCcw, Upload } from "lucide-react";
import { exportBackup } from "../../lib/exportBackup";
import { importBackup } from "../../lib/importBackup";
import { storageKeys } from "../../lib/storage";

export const BackupRestorePanel = () => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [message, setMessage] = useState("");

  const handleExport = () => {
    const payload = exportBackup();
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `ff14-daily-board-${payload.exportedAt.slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    setMessage("백업 파일을 만들었습니다.");
  };

  const handleImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    try {
      const text = await file.text();
      importBackup(JSON.parse(text));
      setMessage("복원이 끝났습니다. 화면을 새로고침합니다.");
      window.setTimeout(() => window.location.reload(), 600);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "복원에 실패했습니다.");
    } finally {
      event.target.value = "";
    }
  };

  const handleReset = () => {
    const confirmed = window.confirm("저장된 캐릭터, 체크리스트, D-day 데이터를 모두 지울까요?");

    if (!confirmed) {
      return;
    }

    Object.values(storageKeys).forEach((key) => localStorage.removeItem(key));
    window.location.reload();
  };

  return (
    <section className="card space-y-4">
      <div>
        <p className="muted-label">로컬 데이터</p>
        <h2 className="text-lg font-bold">백업 / 복원 / 초기화</h2>
        <p className="mt-1 text-sm text-ink-muted">
          캐릭터 사진은 브라우저 IndexedDB에 저장되며, 현재 백업 파일에는 포함되지 않습니다.
        </p>
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        <button
          type="button"
          className="primary-button flex items-center justify-center gap-2"
          onClick={handleExport}
        >
          <Download aria-hidden size={17} />
          백업
        </button>
        <button
          type="button"
          className="secondary-button flex items-center justify-center gap-2"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload aria-hidden size={17} />
          복원
        </button>
        <button
          type="button"
          className="secondary-button flex items-center justify-center gap-2 text-red-500"
          onClick={handleReset}
        >
          <RotateCcw aria-hidden size={17} />
          초기화
        </button>
      </div>
      <input
        ref={fileInputRef}
        className="hidden"
        type="file"
        accept="application/json"
        onChange={handleImport}
      />
      {message ? (
        <p className="rounded-lg bg-surface-muted p-3 text-sm text-ink-muted">{message}</p>
      ) : null}
    </section>
  );
};
