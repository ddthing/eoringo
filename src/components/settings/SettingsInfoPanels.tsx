import { useEffect, useState } from "react";
import { Bell, ExternalLink, Info } from "lucide-react";
import { useAuth } from "../../auth/useAuth";
import {
  getBrowserNotificationPermission,
  requestBrowserNotificationPermission,
  type BrowserNotificationPermission,
} from "../../domain/notifications/browserNotification";
import {
  getExistingPushSubscription,
  isBackgroundPushSupported,
  serializePushSubscription,
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
} from "../../domain/notifications/pushSubscription";
import { webPushPublicKey } from "../../domain/notifications/pushConfig";
import {
  getRemotePushSubscriptionStatus,
  removeRemotePushSubscription,
  type RemotePushSubscriptionStatus,
  upsertRemotePushSubscription,
} from "../../domain/notifications/remotePushSubscription";
import { KST_TIME_ZONE, getKstDateKey } from "../../lib/date";
import { remoteSyncEnvironment } from "../../lib/supabase/env";
import { useCharacterStore } from "../../stores/character/useCharacterStore";
import { useNotificationStore } from "../../stores/notifications/useNotificationStore";
import { useTaskStore } from "../../stores/task/useTaskStore";
import {
  getBackgroundNotificationTaskSummaries,
  getNotificationSourceDigest,
} from "../notifications/notificationSummary";
import { Badge, Card, SectionHeader, StatusMessage } from "../ui";
import { Button, Field, Input } from "../ui";

type BackgroundPushGuidanceOptions = {
  authMode: "local-only" | "guest" | "permanent";
  hasUserId: boolean;
  remoteSyncEnabled: boolean;
  hasPublicKey: boolean;
  browserSupported: boolean;
};

export const getBackgroundPushGuidance = ({
  authMode,
  hasUserId,
  remoteSyncEnabled,
  hasPublicKey,
  browserSupported,
}: BackgroundPushGuidanceOptions) => {
  if (!remoteSyncEnabled || !hasPublicKey) {
    return "앱을 닫은 뒤 알림은 아직 이 환경에서 사용할 수 없어요.";
  }

  if (!browserSupported) {
    return "현재 브라우저에서는 앱을 닫은 뒤 알림을 지원하지 않아요.";
  }

  if (authMode !== "permanent" || !hasUserId) {
    return "앱을 닫은 뒤에도 알림을 받으려면 Google 계정을 연결해 주세요.";
  }

  return null;
};

export const getBackgroundPushStatusMessage = (
  status: RemotePushSubscriptionStatus | null,
) => {
  if (!status?.registered) {
    return "서버 알림 설정을 확인하지 못했어요. 앱을 다시 열면 설정을 동기화합니다.";
  }

  if (!status.enabled) {
    return "서버 알림이 꺼져 있어요. 알림을 다시 켜 주세요.";
  }

  if (status.lastError === "stale_task_summary") {
    return "최근 숙제 변경을 서버에 동기화하는 중이에요. 동기화가 끝나면 다음 알림부터 반영됩니다.";
  }

  if (status.lastError === "source_read_failed") {
    return "알림 서버가 최신 숙제 상태를 확인하지 못했어요. 앱을 잠시 열어 둔 뒤 다시 확인해 주세요.";
  }

  if (status.lastError) {
    return "최근 알림 상태를 확인하지 못했어요. 잠시 후 다시 확인해 주세요.";
  }

  return "서버에 알림 설정이 저장되어 있어 앱이 닫혀 있어도 정해진 시간에 확인합니다.";
};

export const NotificationSettingsPanel = () => {
  const auth = useAuth();
  const dailyIncompleteEnabled = useNotificationStore(
    (state) => state.dailyIncompleteEnabled,
  );
  const backgroundPushEnabled = useNotificationStore(
    (state) => state.backgroundPushEnabled,
  );
  const dailyIncompleteTime = useNotificationStore((state) => state.dailyIncompleteTime);
  const setDailyIncompleteEnabled = useNotificationStore(
    (state) => state.setDailyIncompleteEnabled,
  );
  const setBackgroundPushEnabled = useNotificationStore(
    (state) => state.setBackgroundPushEnabled,
  );
  const setDailyIncompleteTime = useNotificationStore((state) => state.setDailyIncompleteTime);
  const [permission, setPermission] = useState<BrowserNotificationPermission>(() =>
    getBrowserNotificationPermission(),
  );
  const [permissionMessage, setPermissionMessage] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [remoteStatus, setRemoteStatus] = useState<RemotePushSubscriptionStatus | null>(null);

  const backgroundPushSupported = isBackgroundPushSupported();
  const backgroundPushAvailable =
    remoteSyncEnvironment.enabled &&
    auth.mode === "permanent" &&
    Boolean(auth.userId) &&
    Boolean(webPushPublicKey) &&
    backgroundPushSupported;
  const backgroundPushGuidance = getBackgroundPushGuidance({
    authMode: auth.mode,
    hasUserId: Boolean(auth.userId),
    remoteSyncEnabled: remoteSyncEnvironment.enabled,
    hasPublicKey: Boolean(webPushPublicKey),
    browserSupported: backgroundPushSupported,
  });

  useEffect(() => {
    let cancelled = false;

    if (auth.mode !== "permanent" || !auth.userId || !backgroundPushEnabled) {
      setRemoteStatus(null);
      return () => {
        cancelled = true;
      };
    }

    void (async () => {
      try {
        const subscription = await getExistingPushSubscription();
        const serializedSubscription = subscription
          ? serializePushSubscription(subscription)
          : null;

        if (!serializedSubscription) {
          if (!cancelled) {
            setBackgroundPushEnabled(false);
            setRemoteStatus(null);
          }
          return;
        }

        const status = await getRemotePushSubscriptionStatus(serializedSubscription.endpoint);

        if (!cancelled) {
          setRemoteStatus(status);
        }
      } catch {
        if (!cancelled) {
          setRemoteStatus(null);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [auth.mode, auth.userId, backgroundPushEnabled, setBackgroundPushEnabled]);

  const getCurrentBackgroundSummary = async (date = new Date()) => {
    const taskState = useTaskStore.getState();
    const characters = useCharacterStore.getState().characters;

    return {
      summaryDate: getKstDateKey(date),
      characters: getBackgroundNotificationTaskSummaries(characters, taskState, date),
      sourceDigest: await getNotificationSourceDigest(characters, taskState),
    };
  };

  const requestPermission = async () => {
    if (isBusy) {
      return;
    }

    setIsBusy(true);
    setPermissionMessage(null);
    let createdSubscription: PushSubscription | null = null;

    try {
      const nextPermission = await requestBrowserNotificationPermission();
      setPermission(nextPermission);

      if (nextPermission !== "granted") {
        setDailyIncompleteEnabled(false);
        setBackgroundPushEnabled(false);
        setPermissionMessage(
          nextPermission === "denied"
            ? "브라우저 설정에서 알림 권한을 허용해야 사용할 수 있습니다."
            : "현재 브라우저에서는 알림을 지원하지 않습니다.",
        );
        return;
      }

      if (backgroundPushAvailable && webPushPublicKey) {
        createdSubscription = await subscribeToPushNotifications(webPushPublicKey);
        const subscription = serializePushSubscription(createdSubscription);

        if (!subscription) {
          throw new Error("브라우저 Push 구독을 읽지 못했습니다.");
        }

        await upsertRemotePushSubscription({
          subscription,
          timezone: KST_TIME_ZONE,
          notificationTime: dailyIncompleteTime,
          summary: await getCurrentBackgroundSummary(),
        });
        setBackgroundPushEnabled(true);
        setDailyIncompleteEnabled(true);
        try {
          setRemoteStatus(await getRemotePushSubscriptionStatus(subscription.endpoint));
        } catch {
          setRemoteStatus(null);
        }
        setPermissionMessage("앱이 닫혀 있어도 미완료 숙제 알림을 보냅니다.");
      } else {
        setBackgroundPushEnabled(false);
        setDailyIncompleteEnabled(true);
        setPermissionMessage(
          backgroundPushGuidance ?? "앱이 닫혀 있어도 알림을 보낼 수 있습니다.",
        );
      }
    } catch (error) {
      if (createdSubscription) {
        await createdSubscription.unsubscribe().catch(() => false);
      }
      setDailyIncompleteEnabled(false);
      setBackgroundPushEnabled(false);
      setPermissionMessage(
        error instanceof Error ? error.message : "백그라운드 알림을 설정하지 못했습니다.",
      );
    } finally {
      setIsBusy(false);
    }
  };

  const disableNotifications = async () => {
    if (isBusy) {
      return;
    }

    setIsBusy(true);
    setPermissionMessage(null);
    let serverRemovalFailed = false;

    try {
      const subscription = await getExistingPushSubscription();
      const serializedSubscription = subscription
        ? serializePushSubscription(subscription)
        : null;

      if (backgroundPushEnabled && serializedSubscription) {
        try {
          await removeRemotePushSubscription(serializedSubscription.endpoint);
        } catch {
          serverRemovalFailed = true;
        }
      }

      await unsubscribeFromPushNotifications();
      setDailyIncompleteEnabled(false);
      setBackgroundPushEnabled(false);
      setRemoteStatus(null);
      setPermissionMessage(
        serverRemovalFailed
          ? "이 기기에서는 해제했지만 서버 설정을 확인하지 못했습니다. 다음에 앱을 열면 다시 정리합니다."
          : "알림을 해제했습니다.",
      );
    } catch {
      setPermissionMessage("알림 해제 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <Card className="space-y-4 p-5">
      <SectionHeader
        title="알림"
        description="매일 남은 숙제를 정해진 시간에 확인합니다."
        icon={<Bell size={18} strokeWidth={2.2} />}
        action={
          <Badge variant={dailyIncompleteEnabled || backgroundPushEnabled ? "success" : "neutral"}>
            {backgroundPushEnabled
              ? remoteStatus?.registered && remoteStatus.enabled
                ? "서버 사용 중"
                : "확인 중"
              : dailyIncompleteEnabled
                ? "사용 중"
                : "꺼짐"}
          </Badge>
        }
      />

      <div className="space-y-4 rounded-ui-md border border-[rgb(var(--color-line-muted))] bg-card-soft/70 p-4">
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 accent-primary"
            checked={dailyIncompleteEnabled || backgroundPushEnabled}
            disabled={isBusy}
            onChange={(event) => {
              if (event.target.checked) {
                void requestPermission();
              } else {
                void disableNotifications();
              }
            }}
          />
          <span>
            <span className="block text-sm font-bold text-ink">
              매일 남은 미완료 숙제를 정해진 시간에 알려드려요.
            </span>
          </span>
        </label>

        <Field
          className="notification-time-field"
          id="daily-incomplete-notification-time"
          label="알림 시간"
          hint={
            backgroundPushEnabled
              ? "한국 시간 기준 · 앱이 닫혀 있어도 알림을 보냅니다."
              : "한국 시간 기준 · 앱이 열려 있을 때 브라우저 알림을 보냅니다."
          }
        >
          <div className="notification-time-control">
            <Input
              className="notification-time-input"
              id="daily-incomplete-notification-time"
              type="time"
              value={dailyIncompleteTime}
              disabled={!dailyIncompleteEnabled && !backgroundPushEnabled}
              onChange={(event) => setDailyIncompleteTime(event.target.value)}
            />
          </div>
        </Field>
      </div>

      <StatusMessage variant="info">
        완료한 숙제를 제외하고 캐릭터별 남은 일일 숙제를 한 번에 알려드려요.
        {!backgroundPushAvailable && backgroundPushGuidance ? (
          <span className="mt-1 block">
            {backgroundPushGuidance}
          </span>
        ) : null}
      </StatusMessage>

      {backgroundPushEnabled ? (
        <p className="text-xs font-semibold text-ink-muted" role="status">
          {getBackgroundPushStatusMessage(remoteStatus)}
        </p>
      ) : null}

      {permission === "unsupported" ? (
        <p className="text-xs font-semibold text-ink-muted">
          현재 브라우저에서는 브라우저 알림을 지원하지 않습니다.
        </p>
      ) : permission !== "granted" ? (
        <Button
          type="button"
          variant="secondary"
          loading={isBusy}
          onClick={() => void requestPermission()}
        >
          브라우저 알림 허용
        </Button>
      ) : (
        <p className="text-xs font-semibold text-primary">
          {backgroundPushEnabled
            ? "백그라운드 알림이 허용되어 있습니다."
            : "브라우저 알림이 허용되어 있습니다."}
        </p>
      )}

      {permissionMessage ? (
        <p className="text-xs font-semibold text-ink-muted" role="status">
          {permissionMessage}
        </p>
      ) : null}
    </Card>
  );
};

export const AppInfoPanel = () => (
  <Card className="space-y-4 p-5">
    <SectionHeader
      title="앱 정보"
      description="에오링고는 파이널판타지14 루틴을 브라우저에 안전하게 기록하는 로컬 우선 앱입니다."
      icon={<Info size={18} strokeWidth={2.2} />}
    />
    <div className="rounded-ui-md border border-[rgb(var(--color-line-muted))] bg-card-soft/70 p-4">
      <p className="text-xs font-bold text-primary">크레딧</p>
      <p className="mt-2 text-sm font-bold text-ink">도움을 주신 분들: ADD, 꼭짓점, 미여워, KILL</p>
      <p className="mt-1 text-xs font-semibold text-ink-muted">특별히 감사한 분: 루피</p>
    </div>
    <div className="space-y-3">
      <p className="text-xs font-bold text-primary">서비스 안내</p>
      <nav
        className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-bold text-ink-muted"
        aria-label="서비스 안내"
      >
        <a className="underline underline-offset-4 hover:text-ink" href="/guide">
          사용 가이드
        </a>
        <a className="underline underline-offset-4 hover:text-ink" href="/about">
          운영 원칙
        </a>
        <a className="underline underline-offset-4 hover:text-ink" href="/demo">
          로그인 없이 체험
        </a>
        <a className="underline underline-offset-4 hover:text-ink" href="/privacy">
          개인정보 처리방침
        </a>
        <a className="underline underline-offset-4 hover:text-ink" href="/terms">
          서비스 이용약관
        </a>
      </nav>
    </div>
    <a
      href="https://coner.luv3r.me/"
      target="_blank"
      rel="noreferrer"
      className="ui-button ui-button-md w-fit gap-1.5"
      data-variant="secondary"
      aria-label="문의하기, 새 탭에서 열림"
    >
      문의하기
      <ExternalLink aria-hidden size={14} />
    </a>
  </Card>
);
