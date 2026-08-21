import { ExternalLink, ShieldCheck } from "lucide-react";
import { useEffect } from "react";

type LegalNoticePageProps = {
  kind: "privacy" | "terms";
};

const supportUrl = "https://coner.luv3r.me/";

const LegalLayout = ({
  eyebrow,
  title,
  updatedAt,
  children,
}: {
  eyebrow: string;
  title: string;
  updatedAt: string;
  children: React.ReactNode;
}) => {
  useEffect(() => {
    document.title = `${title} | 에오링고`;
  }, [title]);

  return (
    <div className="min-h-dvh bg-bg px-4 py-6 sm:py-10">
      <a className="ui-skip-link" href="#main-content">
        본문으로 바로가기
      </a>
      <main id="main-content" className="mx-auto max-w-2xl space-y-4" tabIndex={-1}>
      <header className="flex items-center justify-between gap-3 px-1">
        <a className="ui-brand-mark shrink-0 no-underline" href="/" aria-label="에오링고 홈으로">
          에오링고
        </a>
        <p className="text-xs font-bold text-ink-muted">최종 업데이트 {updatedAt}</p>
      </header>

      <section className="ui-card p-5 sm:p-7" data-legal-notice={eyebrow}>
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary-soft text-primary">
            <ShieldCheck aria-hidden size={20} />
          </span>
          <div>
            <p className="muted-label">{eyebrow === "privacy" ? "개인정보" : "이용약관"}</p>
            <h1 className="mt-1 text-xl font-black tracking-[-0.03em] text-ink sm:text-2xl">{title}</h1>
          </div>
        </div>
        <div className="mt-6 space-y-6 text-sm font-medium leading-7 text-ink-muted">{children}</div>
      </section>

      <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 px-2 text-xs font-bold text-ink-muted" aria-label="법적 안내">
        <a className="underline underline-offset-4 hover:text-ink" href="/privacy">개인정보 안내</a>
        <a className="underline underline-offset-4 hover:text-ink" href="/terms">서비스 이용 안내</a>
        <a className="inline-flex items-center gap-1 underline underline-offset-4 hover:text-ink" href={supportUrl} target="_blank" rel="noreferrer" aria-label="문의하기, 새 탭에서 열림">
          문의하기 <ExternalLink aria-hidden size={13} />
        </a>
      </nav>
      </main>
    </div>
  );
};

const NoticeSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section>
    <h2 className="text-base font-black text-ink">{title}</h2>
    <div className="mt-2 space-y-3">{children}</div>
  </section>
);

export const PrivacyNoticePage = () => (
  <LegalLayout eyebrow="privacy" title="개인정보 안내" updatedAt="2026년 8월 10일">
    <p>
      에오링고는 사용자가 자신의 루틴을 기록하고 관리할 수 있도록 돕는 서비스입니다. 이 안내는 어떤 정보가 어디에 저장되는지와 Google 로그인 시 요청되는 범위를 쉽게 설명합니다.
    </p>

    <NoticeSection title="기본 저장 위치">
      <p>
        루틴, 일정, 메모, 캐릭터 정보와 캐릭터 이미지는 기본적으로 현재 사용하는 브라우저에 저장됩니다. 백업 기능을 이용하면 사용자가 직접 JSON 파일로 내보내고 복원할 수 있습니다.
      </p>
    </NoticeSection>

    <NoticeSection title="Google 로그인과 동기화">
      <p>
        Google 계정을 연결하면 계정을 식별하기 위한 기본 프로필과 이메일을 받습니다. Google 비밀번호, Gmail, Google Drive의 내용에는 접근하지 않습니다.
      </p>
      <p>
        Google 연결이 완료되면 대상 계정이 비어 있는지와 데이터 검증 결과를 확인한 뒤, 안전한 경우 이 기기의 루틴 데이터를 에오링고의 Supabase 동기화 서비스로 자동 전송합니다. 계정과 기기에 데이터가 모두 있으면 자동으로 합치지 않고 선택을 요청합니다.
      </p>
    </NoticeSection>

    <NoticeSection title="문의와 변경 사항">
      <p>
        개인정보 처리에 관한 문의나 이 안내의 변경 사항은 아래 문의하기 링크를 통해 확인할 수 있습니다.
      </p>
    </NoticeSection>
  </LegalLayout>
);

export const TermsNoticePage = () => (
  <LegalLayout eyebrow="terms" title="서비스 이용 안내" updatedAt="2026년 8월 10일">
    <p>
      에오링고는 개인 루틴 기록을 돕는 서비스입니다. 아래 내용은 서비스를 안전하게 이용하기 위한 기본 안내입니다.
    </p>

    <NoticeSection title="데이터 관리">
      <p>
        기본 데이터는 사용자의 브라우저에 저장됩니다. 브라우저 데이터 삭제, 기기 교체 또는 초기화에 대비해 중요한 기록은 백업 기능으로 직접 보관해 주세요.
      </p>
      <p>
        Google 계정 연결 후 안전한 자동 검증이 끝난 경우에만 동기화 기능이 시작됩니다. 계정 연결을 취소하거나 데이터 선택을 보류해도 로컬 기록 기능은 계속 이용할 수 있습니다.
      </p>
    </NoticeSection>

    <NoticeSection title="안전한 로그인">
      <p>
        Google 로그인은 Google의 공식 계정 선택 및 동의 화면에서 진행됩니다. 에오링고는 Google 비밀번호를 요구하거나 저장하지 않습니다. 동의 화면에서 요청 항목이 기본 프로필과 이메일인지 확인해 주세요.
      </p>
    </NoticeSection>

    <NoticeSection title="문의">
      <p>
        기능 오류, 계정 연결 또는 데이터 관련 문의는 아래 문의하기 링크로 보내 주세요.
      </p>
    </NoticeSection>
  </LegalLayout>
);
