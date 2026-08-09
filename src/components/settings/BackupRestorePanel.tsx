import { type ChangeEvent, useRef, useState } from "react";
import { Download, RotateCcw, Upload } from "lucide-react";
import { useConfirmDialog } from "../common/ConfirmDialog";
import { exportBackup } from "../../lib/exportBackup";
import { clearCharacterImages } from "../../lib/imageStorage";
import { importBackup } from "../../lib/importBackup";
import { storageKeys } from "../../lib/storage";
import { Button, Card, SectionHeader, StatusMessage } from "../ui";

const BackupRestoreActions = ({ showHeading = true }: { showHeading?: boolean }) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [message, setMessage] = useState<{
    text: string;
    variant: "success" | "danger";
  } | null>(null);
  const [busyAction, setBusyAction] = useState<"export" | "import" | null>(null);

  const handleExport = async () => {
    setBusyAction("export");
    setMessage(null);

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
      setMessage({
        text: "백업 파일을 만들었습니다. 캐릭터 사진도 함께 포함됩니다.",
        variant: "success",
      });
    } catch (error) {
      setMessage({
        text: error instanceof Error ? error.message : "백업 파일을 만들 수 없습니다.",
        variant: "danger",
      });
    } finally {
      setBusyAction(null);
    }
  };

  const handleImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setBusyAction("import");
    setMessage(null);

    try {
      const text = await file.text();
      await importBackup(JSON.parse(text));
      setMessage({
        text: "복원이 끝났습니다. 화면을 새로고침합니다.",
        variant: "success",
      });
      window.setTimeout(() => window.location.reload(), 600);
    } catch (error) {
      setMessage({
        text: error instanceof Error ? error.message : "복원에 실패했습니다.",
        variant: "danger",
      });
    } finally {
      setBusyAction(null);
      event.target.value = "";
    }
  };

  return (
    <div className="space-y-4">
      {showHeading ? (
        <SectionHeader
          headingLevel="h3"
          title="백업 및 복원"
          description="브라우저에 저장된 루틴 데이터와 캐릭터 사진을 JSON 파일로 백업합니다."
        />
      ) : null}
      <div className="grid gap-2 sm:grid-cols-2">
        <Button
          className="w-full"
          onClick={handleExport}
          loading={busyAction === "export"}
          disabled={busyAction !== null}
          loadingLabel="처리 중…"
        >
          <Download aria-hidden size={17} />
          백업
        </Button>
        <Button
          variant="secondary"
          className="w-full"
          onClick={() => fileInputRef.current?.click()}
          loading={busyAction === "import"}
          disabled={busyAction !== null}
          loadingLabel="처리 중…"
        >
          <Upload aria-hidden size={17} />
          복원
        </Button>
      </div>
      <input
        ref={fileInputRef}
        className="hidden"
        type="file"
        accept="application/json"
        onChange={handleImport}
        disabled={busyAction !== null}
        aria-label="백업 파일 선택"
      />
      {message ? (
        <StatusMessage variant={message.variant} aria-live="polite">
          {message.text}
        </StatusMessage>
      ) : null}
    </div>
  );
};

const DataManagementActions = () => {
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
    <div id="data" className="scroll-mt-[calc(var(--app-header-height)+0.75rem)] space-y-4 border-t border-[rgb(var(--color-line-muted))] pt-4">
      <SectionHeader
        headingLevel="h3"
        title="데이터 초기화"
        description="이 브라우저에 저장된 모든 앱 데이터를 삭제합니다. 먼저 백업을 권장합니다."
      />
      <Button
        variant="destructive"
        className="w-full sm:w-auto"
        onClick={handleReset}
        loading={isBusy}
        loadingLabel="처리 중…"
      >
        <RotateCcw aria-hidden size={17} />
        모든 데이터 초기화
      </Button>
      {message ? (
        <StatusMessage variant="danger" aria-live="polite">
          {message}
        </StatusMessage>
      ) : null}
    </div>
  );
};

export type DataSettingsPanelProps = {
  embedded?: boolean;
};

export const DataSettingsPanel = ({ embedded = false }: DataSettingsPanelProps = {}) => {
  const content = (
    <div className="space-y-4">
      {embedded ? null : (
        <SectionHeader
          eyebrow="storage"
          title="데이터"
          description="이 브라우저의 데이터를 백업하거나 안전하게 초기화합니다."
        />
      )}
      <div id="backup" className="scroll-mt-[calc(var(--app-header-height)+0.75rem)] space-y-4">
        {embedded ? (
          <SectionHeader
            eyebrow="data"
            title="백업 및 복원"
            description="브라우저에 저장된 루틴 데이터와 캐릭터 사진을 JSON 파일로 백업합니다."
            headingLevel="h3"
          />
        ) : null}
        <BackupRestoreActions showHeading={!embedded} />
      </div>
      <DataManagementActions />
    </div>
  );

  return embedded ? content : <Card className="p-5">{content}</Card>;
};
