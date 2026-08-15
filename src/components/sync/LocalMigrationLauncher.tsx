import { DatabaseZap } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { getSupabaseClient } from "../../lib/supabase/client";
import {
  downloadMigrationBackup,
  prepareLocalMigration,
  readLocalMigrationReceipt,
  runLocalMigration,
  type LocalMigrationTransport,
} from "../../sync/localMigration";
import { hasMeaningfulLocalSnapshot } from "../../sync/localSnapshot";
import { decideAutomaticSync } from "../../sync/automaticSyncDecision";
import {
  clearAutomaticSyncAttempt,
  clearPendingAuthTransition,
  hasAutomaticSyncAttempt,
  isPendingAccountSwitch,
  isPendingGuestLink,
  markAutomaticSyncAttempt,
} from "../../auth/authTransitionStorage";
import { createDocumentRepository } from "../../sync/documentRepository";
import { createSupabaseDocumentDataSource } from "../../sync/supabaseDocumentDataSource";
import { createSupabaseLocalMigrationTransport } from "../../sync/supabaseLocalMigrationTransport";
import { clearCharacterImages } from "../../lib/imageStorage";
import { clearMutationQueueForUser } from "../../sync/mutationQueue";
import { LocalMigrationDialog } from "./LocalMigrationDialog";
import { hydrateStoreDocuments } from "../../sync/storeSyncAdapter";
import {
  grantSyncConsent,
  hasActiveSyncAccount,
  hasSyncConsent,
} from "../../sync/syncConsent";

type LocalMigrationLauncherProps = { userId: string };

export const LocalMigrationLauncher = ({ userId }: LocalMigrationLauncherProps) => {
  const [transport, setTransport] = useState<LocalMigrationTransport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [completed, setCompleted] = useState(
    () =>
      hasSyncConsent(userId) &&
      hasActiveSyncAccount(userId) &&
      !isPendingAccountSwitch(),
  );
  const [completionMessage, setCompletionMessage] = useState(
    "이 기기의 데이터 이전을 검증했습니다. 원본은 보존 기간 동안 그대로 유지됩니다.",
  );
  const [accountSwitchNotice, setAccountSwitchNotice] = useState(false);
  const autoStarted = useRef(false);
  const previousUserId = useRef(userId);
  const [remoteDocuments, setRemoteDocuments] = useState<Awaited<
    ReturnType<ReturnType<typeof createDocumentRepository>["list"]>
  > | null>(null);

  const openMigration = async ({ automatic = false } = {}) => {
    setLoading(true);
    setError(false);
    setAccountSwitchNotice(false);

    try {
      const supabase = await getSupabaseClient();

      if (!supabase) {
        throw new Error("Remote sync disabled.");
      }

      const repository = createDocumentRepository(
        createSupabaseDocumentDataSource(supabase),
      );
      const accountSwitch = isPendingAccountSwitch();

      if (
        !accountSwitch &&
        hasActiveSyncAccount(userId) &&
        readLocalMigrationReceipt(userId)
      ) {
        grantSyncConsent(userId);
        clearAutomaticSyncAttempt(userId);
        setCompleted(true);
        return;
      }

      if (automatic) {
        if (hasAutomaticSyncAttempt(userId)) {
          setError(true);
          return;
        }

        markAutomaticSyncAttempt(userId);
      }

      const existingDocuments = await repository.list();
      const prepared = await prepareLocalMigration();
      const hasMeaningfulLocalData = hasMeaningfulLocalSnapshot(prepared.preview);
      const automaticDecision = decideAutomaticSync({
        remoteDocumentCount: existingDocuments.length,
        hasMeaningfulLocalData,
        isGuestLink: isPendingGuestLink(userId),
      });

      if (existingDocuments.length > 0) {
        if (automaticDecision === "hydrate-remote") {
          hydrateStoreDocuments(existingDocuments);
          await clearCharacterImages();
          clearMutationQueueForUser(localStorage, userId);
          clearPendingAuthTransition();
          grantSyncConsent(userId);
          clearAutomaticSyncAttempt(userId);
          setCompletionMessage("계정 데이터를 이 기기에 자동으로 불러왔습니다.");
          setCompleted(true);
        } else {
          clearAutomaticSyncAttempt(userId);
          setAccountSwitchNotice(accountSwitch);
          setRemoteDocuments(existingDocuments);
        }
        return;
      }

      if (automatic && automaticDecision === "migrate-local") {
        await runLocalMigration(prepared, createSupabaseLocalMigrationTransport(supabase, repository), {
          userId,
        });
        clearMutationQueueForUser(localStorage, userId);
        clearPendingAuthTransition();
        grantSyncConsent(userId);
        clearAutomaticSyncAttempt(userId);
        setCompletionMessage("이 기기의 데이터가 계정과 자동으로 동기화되었습니다.");
        setCompleted(true);
        return;
      }

      if (automatic && automaticDecision === "enable-empty") {
        await clearCharacterImages();
        hydrateStoreDocuments([]);
        clearMutationQueueForUser(localStorage, userId);
        clearPendingAuthTransition();
        grantSyncConsent(userId);
        clearAutomaticSyncAttempt(userId);
        setCompletionMessage("새 계정의 동기화를 자동으로 준비했습니다.");
        setCompleted(true);
        return;
      }

      setTransport(createSupabaseLocalMigrationTransport(supabase, repository));
      setAccountSwitchNotice(accountSwitch);
      if (automatic) {
        clearAutomaticSyncAttempt(userId);
      }
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
      await clearCharacterImages();
      clearMutationQueueForUser(localStorage, userId);
      clearPendingAuthTransition();
      grantSyncConsent(userId);
      clearAutomaticSyncAttempt(userId);
      setAccountSwitchNotice(false);
      setCompletionMessage("계정 데이터를 백업 후 이 기기에 불러왔습니다.");
      setCompleted(true);
      setRemoteDocuments(null);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (previousUserId.current === userId) {
      return;
    }

    previousUserId.current = userId;
    autoStarted.current = false;
    setTransport(null);
    setRemoteDocuments(null);
    setError(false);
    setCompleted(
      hasSyncConsent(userId) &&
        hasActiveSyncAccount(userId) &&
        !isPendingAccountSwitch(),
    );
  }, [userId]);

  useEffect(() => {
    if (completed || autoStarted.current) {
      return;
    }

    autoStarted.current = true;
    void openMigration({ automatic: true });
  }, [completed, userId]);

  if (completed) {
    return (
      <p className="rounded-ui-md bg-card-soft p-3 text-sm text-ink-muted">
        {completionMessage}
      </p>
    );
  }

  if (transport) {
    return (
      <LocalMigrationDialog
        userId={userId}
        transport={transport}
        onComplete={() => {
          clearMutationQueueForUser(localStorage, userId);
          clearPendingAuthTransition();
          grantSyncConsent(userId);
          clearAutomaticSyncAttempt(userId);
          setAccountSwitchNotice(false);
          setCompletionMessage("이 기기의 데이터 이전을 검증했습니다. 원본은 보존 기간 동안 그대로 유지됩니다.");
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
          {accountSwitchNotice
            ? "계정을 전환했습니다. 이전 기기의 데이터는 자동으로 합치지 않았습니다. 현재 계정 데이터를 확인한 뒤 선택해 주세요."
            : "이 계정에 저장된 데이터가 있습니다. 현재 기기를 먼저 백업한 뒤 계정 데이터를 불러올 수 있습니다."}
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
        onClick={() => void openMigration()}
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
