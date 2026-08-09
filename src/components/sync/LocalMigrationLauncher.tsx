import { DatabaseZap } from "lucide-react";
import { useState } from "react";
import { getSupabaseClient } from "../../lib/supabase/client";
import {
  downloadMigrationBackup,
  localMigrationReceiptKey,
  prepareLocalMigration,
  type LocalMigrationTransport,
} from "../../sync/localMigration";
import { createDocumentRepository } from "../../sync/documentRepository";
import { createSupabaseDocumentDataSource } from "../../sync/supabaseDocumentDataSource";
import { createSupabaseLocalMigrationTransport } from "../../sync/supabaseLocalMigrationTransport";
import { LocalMigrationDialog } from "./LocalMigrationDialog";
import { hydrateStoreDocuments } from "../../sync/storeSyncAdapter";
import { grantSyncConsent, hasSyncConsent } from "../../sync/syncConsent";

type LocalMigrationLauncherProps = { userId: string };

export const LocalMigrationLauncher = ({ userId }: LocalMigrationLauncherProps) => {
  const [transport, setTransport] = useState<LocalMigrationTransport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [completed, setCompleted] = useState(() => hasSyncConsent(userId));
  const [remoteDocuments, setRemoteDocuments] = useState<Awaited<
    ReturnType<ReturnType<typeof createDocumentRepository>["list"]>
  > | null>(null);

  const openMigration = async () => {
    setLoading(true);
    setError(false);

    try {
      const supabase = await getSupabaseClient();

      if (!supabase) {
        throw new Error("Remote sync disabled.");
      }

      const repository = createDocumentRepository(
        createSupabaseDocumentDataSource(supabase),
      );

      if (localStorage.getItem(localMigrationReceiptKey)) {
        grantSyncConsent(userId);
        setCompleted(true);
        return;
      }

      const existingDocuments = await repository.list();

      if (existingDocuments.length > 0) {
        setRemoteDocuments(existingDocuments);
        return;
      }

      setTransport(createSupabaseLocalMigrationTransport(supabase, repository));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const acceptRemoteDocuments = async () => {
    if (!remoteDocuments) {
      return;
    }

    setLoading(true);
    setError(false);

    try {
      const prepared = await prepareLocalMigration();
      downloadMigrationBackup(prepared.backup);
      hydrateStoreDocuments(remoteDocuments);
      grantSyncConsent(userId);
      setCompleted(true);
      setRemoteDocuments(null);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  if (completed) {
    return (
      <p className="rounded-ui-md bg-card-soft p-3 text-sm text-ink-muted">
        이 기기의 데이터 이전을 검증했습니다. 원본은 보존 기간 동안 그대로 유지됩니다.
      </p>
    );
  }

  if (transport) {
    return (
      <LocalMigrationDialog
        transport={transport}
        onComplete={() => {
          grantSyncConsent(userId);
          setCompleted(true);
          setTransport(null);
        }}
        onCancel={() => setTransport(null)}
      />
    );
  }

  if (remoteDocuments) {
    return (
      <div className="space-y-3 rounded-ui-md bg-card-soft p-3">
        <p className="text-sm text-ink-muted">
          이 계정에 저장된 데이터가 있습니다. 현재 기기를 먼저 백업한 뒤 계정 데이터를 불러올 수 있습니다.
        </p>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="primary-button" onClick={acceptRemoteDocuments} disabled={loading}>
            {loading ? "백업 중" : "백업 후 계정 데이터 불러오기"}
          </button>
          <button type="button" className="secondary-button" onClick={() => setRemoteDocuments(null)} disabled={loading}>
            지금은 하지 않기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        className="secondary-button inline-flex items-center gap-2"
        onClick={openMigration}
        disabled={loading}
      >
        <DatabaseZap aria-hidden size={17} />
        {loading ? "데이터 확인 중" : "이 기기의 기존 데이터 이어가기"}
      </button>
      {error ? (
        <p className="text-sm text-ink-muted" role="alert">
          이전 준비를 시작할 수 없습니다. 로컬 데이터는 변경되지 않았습니다.
        </p>
      ) : null}
    </div>
  );
};
