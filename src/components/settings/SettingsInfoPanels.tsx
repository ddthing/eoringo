import { Bell, ExternalLink, Info } from "lucide-react";

export const NotificationSettingsPanel = () => (
  <section className="card space-y-3">
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="muted-label">notifications</p>
        <h2 className="text-lg font-bold">알림</h2>
        <p className="mt-1 text-sm text-ink-muted">
          루틴 초기화와 일정 알림 기능을 준비하고 있습니다.
        </p>
      </div>
      <span className="sticker shrink-0">준비 중</span>
    </div>
    <div className="flex items-center gap-2 rounded-[14px] border border-[rgb(var(--color-line-muted))] bg-card-soft/70 p-3 text-sm font-bold text-ink-muted">
      <Bell aria-hidden size={17} />
      알림 설정은 추후 업데이트에서 제공됩니다.
    </div>
  </section>
);

export const AppInfoPanel = () => (
  <section className="card space-y-3">
    <div>
      <p className="muted-label">about</p>
      <h2 className="text-lg font-bold">앱 정보</h2>
      <p className="mt-1 text-sm text-ink-muted">
        에오링고는 파이널판타지14 루틴을 브라우저에 안전하게 기록하는 로컬 우선 앱입니다.
      </p>
    </div>
    <div className="flex items-center gap-2 rounded-[14px] border border-[rgb(var(--color-line-muted))] bg-card-soft/70 p-3 text-xs font-semibold text-ink-muted">
      <Info aria-hidden size={16} />
      데이터는 직접 백업하거나 초기화하기 전까지 현재 브라우저에 보관됩니다.
    </div>
    <div className="rounded-[14px] border border-[rgb(var(--color-line-muted))] bg-card-soft/55 p-3">
      <p className="text-xs font-black uppercase tracking-[0.08em] text-primary">Credits</p>
      <p className="mt-2 text-sm font-bold text-ink">Thanks to ADD, 꼭짓점, 미여워, KILL</p>
      <p className="mt-1 text-xs font-semibold text-ink-muted">Special thanks to 루피</p>
    </div>
    <a
      href="https://coner.luv3r.me/"
      target="_blank"
      rel="noreferrer"
      className="secondary-button min-h-11 w-fit gap-1.5"
      aria-label="문의하기, 새 탭에서 열림"
    >
      문의하기
      <ExternalLink aria-hidden size={14} />
    </a>
  </section>
);
