import { Download, LoaderCircle, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import {
  downloadMigrationBackup,
  prepareLocalMigration,
  runLocalMigration,
  type LocalMigrationTransport,
  type PreparedLocalMigration,
} from "../../sync/localMigration";

type LocalMigrationDialogProps = {
  userId: string;
  transport: LocalMigrationTransport;
  onComplete: () => void;
  onCancel: () => void;
};

type Phase = "preparing" | "ready" | "migrating" | "success" | "error";

const formatBytes = (bytes: number) =>
  new Intl.NumberFormat("ko-KR", {
    style: "unit",
    unit: bytes >= 1024 * 1024 ? "megabyte" : "kilobyte",
    maximumFractionDigits: 1,
  }).format(bytes >= 1024 * 1024 ? bytes / (1024 * 1024) : bytes / 1024);

export const LocalMigrationDialog = ({
  userId,
  transport,
  onComplete,
  onCancel,
}: LocalMigrationDialogProps) => {
  const [phase, setPhase] = useState<Phase>("preparing");
  const [prepared, setPrepared] = useState<PreparedLocalMigration | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    let active = true;

    void prepareLocalMigration()
      .then((result) => {
        if (active) {
          setPrepared(result);
          setPhase("ready");
        }
      })
      .catch(() => {
        if (active) {
          setPhase("error");
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const handleMigration = async () => {
    if (!prepared || !confirmed || phase !== "ready") {
      return;
    }

    setPhase("migrating");
    downloadMigrationBackup(prepared.backup);

    try {
      await runLocalMigration(prepared, transport, { userId });
      setPhase("success");
      onComplete();
    } catch {
      setPhase("error");
    }
  };

  return (
    <section className="card space-y-4" role="dialog" aria-modal="true" aria-labelledby="migration-title">
      <div>
        <p className="muted-label">safe migration</p>
        <h2 id="migration-title" className="mt-1 text-lg font-bold text-ink">
          이 기기의 데이터를 계정에서 이어갈까요?
        </h2>
        <p className="mt-2 text-sm text-ink-muted">
          업로드 전에 전체 백업 파일을 먼저 내려받고, 서버에서 다시 읽어 동일한지 확인합니다.
          원본은 확인 완료 후에도 7일 동안 이 기기에 남습니다.
        </p>
      </div>

      {prepared ? (
        <dl className="grid grid-cols-3 gap-2 rounded-ui-md bg-card-soft p-3 text-center">
          <div>
            <dt className="text-xs text-ink-muted">데이터 종류</dt>
            <dd className="mt-1 font-bold text-ink">{prepared.preview.documents.length}</dd>
          </div>
          <div>
            <dt className="text-xs text-ink-muted">이미지</dt>
            <dd className="mt-1 font-bold text-ink">{prepared.preview.images.length}</dd>
          </div>
          <div>
            <dt className="text-xs text-ink-muted">전체 크기</dt>
            <dd className="mt-1 font-bold text-ink">{formatBytes(prepared.preview.totalBytes)}</dd>
          </div>
        </dl>
      ) : null}

      {phase === "ready" ? (
        <label className="flex items-start gap-2 text-sm text-ink">
          <input
            type="checkbox"
            className="mt-0.5"
            checked={confirmed}
            onChange={(event) => setConfirmed(event.target.checked)}
          />
          이 기기의 현재 데이터를 백업한 뒤 내 계정으로 이어가는 것에 동의합니다.
        </label>
      ) : null}

      {phase === "error" ? (
        <p className="rounded-ui-md bg-card-soft p-3 text-sm text-ink-muted" role="alert">
          이전을 완료하지 못했습니다. 원본 데이터는 변경되지 않았습니다.
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="primary-button inline-flex items-center gap-2"
          disabled={!prepared || !confirmed || phase !== "ready"}
          onClick={handleMigration}
        >
          {phase === "migrating" || phase === "preparing" ? (
            <LoaderCircle aria-hidden size={17} className="animate-spin" />
          ) : phase === "success" ? (
            <ShieldCheck aria-hidden size={17} />
          ) : (
            <Download aria-hidden size={17} />
          )}
          {phase === "migrating" ? "검증하며 이전 중" : "백업 후 데이터 이어가기"}
        </button>
        <button type="button" className="secondary-button" onClick={onCancel} disabled={phase === "migrating"}>
          지금은 하지 않기
        </button>
      </div>
    </section>
  );
};
