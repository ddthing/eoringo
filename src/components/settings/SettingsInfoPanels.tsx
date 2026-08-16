import { useState } from "react";
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
  removeRemotePushSubscription,
  upsertRemotePushSubscription,
} from "../../domain/notifications/remotePushSubscription";
import { KST_TIME_ZONE, getKstDateKey } from "../../lib/date";
import { remoteSyncEnvironment } from "../../lib/supabase/env";
import { useCharacterStore } from "../../stores/character/useCharacterStore";
import { useNotificationStore } from "../../stores/notifications/useNotificationStore";
import { useTaskStore } from "../../stores/task/useTaskStore";
import { getBackgroundNotificationTaskSummaries } from "../notifications/notificationSummary";
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

  const getCurrentBackgroundSummary = (date = new Date()) => {
    const taskState = useTaskStore.getState();

    return {
      summaryDate: getKstDateKey(date),
      characters: getBackgroundNotificationTaskSummaries(
        useCharacterStore.getState().characters,
        taskState,
        date,
      ),
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
          summary: getCurrentBackgroundSummary(),
        });
        setBackgroundPushEnabled(true);
        setDailyIncompleteEnabled(true);
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
            {backgroundPushEnabled ? "백그라운드 사용 중" : dailyIncompleteEnabled ? "사용 중" : "꺼짐"}
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
            <span className="block text-sm font-bold text-ink">앱이 닫혀도 미완료 숙제 알림</span>
            <span className="mt-0.5 block text-xs font-medium text-ink-muted">
              설정이 되면 앱을 닫아도 서버가 정해진 시간에 한 번 알려줍니다.
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
          <Input
            className="notification-time-input"
            id="daily-incomplete-notification-time"
            type="time"
            value={dailyIncompleteTime}
            disabled={!dailyIncompleteEnabled && !backgroundPushEnabled}
            onChange={(event) => setDailyIncompleteTime(event.target.value)}
          />
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
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-bold text-primary">
      <a className="underline underline-offset-4" href="/privacy">개인정보 안내</a>
      <a className="underline underline-offset-4" href="/terms">서비스 이용 안내</a>
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
