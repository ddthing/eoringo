import { ExternalLink, ShieldCheck } from "lucide-react";
import { useEffect } from "react";
import { setPageMetadata } from "../../lib/seo";

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
    setPageMetadata({
      title: `${title} | 에오링고`,
      description:
        eyebrow === "privacy"
          ? "에오링고의 브라우저 저장, Google 연결, Supabase 동기화와 개인정보 처리 범위를 안내합니다."
          : "에오링고의 데이터 관리, 로그인, 백업과 서비스 이용 기준을 안내합니다.",
      canonicalPath: `/${eyebrow}`,
      robots: "index,follow",
    });
  }, [eyebrow, title]);

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
        <a className="underline underline-offset-4 hover:text-ink" href="/guide">사용 가이드</a>
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
  <LegalLayout eyebrow="privacy" title="개인정보 안내" updatedAt="2026년 8월 23일">
    <p>
      에오링고는 사용자가 자신의 루틴을 기록하고 관리할 수 있도록 돕는 서비스입니다. 이 안내는 어떤 정보가 어디에 저장되는지와 Google 로그인 시 요청되는 범위를 쉽게 설명합니다.
    </p>

    <NoticeSection title="기본 저장 위치">
      <p>
        루틴, 일정, 메모, 캐릭터 정보와 테마 설정은 기본적으로 현재 사용하는 브라우저의 로컬 저장소에 보관됩니다. 캐릭터 이미지는 브라우저의 IndexedDB에 저장됩니다. 백업 기능을 이용하면 사용자가 직접 JSON 파일로 내보내고 복원할 수 있습니다.
      </p>
      <p>
        브라우저 데이터를 삭제하거나 다른 기기에서 사용하면 로컬 데이터가 사라질 수 있으므로 중요한 기록은 먼저 백업하세요. 설정의 “모든 데이터 초기화”는 현재 브라우저의 로컬 기록만 삭제하며, Google 계정의 원격 데이터까지 자동으로 삭제하지 않습니다.
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

    <NoticeSection title="알림과 캐릭터 이미지">
      <p>
        브라우저 알림을 켜면 알림 권한은 브라우저가 관리합니다. 백그라운드 Web Push를 선택한 경우 알림을 전달하기 위해 구독 endpoint, 암호화 공개 정보, 시간대, 알림 시각과 미완료 요약이 원격 서비스에 저장될 수 있습니다. 설정에서 백그라운드 알림을 끄면 새 구독을 해지할 수 있습니다.
      </p>
      <p>
        캐릭터 이미지 원격 동기화는 선택 기능입니다. 활성화된 운영 환경에서 Google 계정과 연결된 비공개 Storage 영역에 저장되며, 다른 사용자가 공개 URL로 열 수 없도록 사용자별 경계를 적용합니다.
      </p>
    </NoticeSection>

    <NoticeSection title="광고·쿠키·Google 제품">
      <p>
        현재 공개 코드에는 Google AdSense 광고 태그를 삽입하지 않았습니다. 향후 광고를 활성화할 경우 Google과 광고 파트너가 광고 제공을 위해 쿠키, 웹 비콘, IP 주소 또는 유사 식별자를 사용할 수 있다는 사실을 이 안내에 명확히 반영하고, 적용 지역의 동의 요건을 확인한 뒤 게재합니다.
      </p>
      <p>
        Google 제품이 데이터를 사용하는 방법은 <a className="underline underline-offset-4" href="https://policies.google.com/technologies/partner-sites" target="_blank" rel="noreferrer">Google 파트너 사이트에서의 데이터 사용</a>에서 확인할 수 있습니다. 개인 맞춤 광고 설정은 <a className="underline underline-offset-4" href="https://adssettings.google.com/" target="_blank" rel="noreferrer">Google 광고 설정</a>에서 관리할 수 있습니다.
      </p>
    </NoticeSection>

    <NoticeSection title="삭제·문의 요청">
      <p>
        사용자는 브라우저 설정에서 로컬 데이터를 직접 초기화할 수 있습니다. Google 연결 계정, 원격 루틴 문서, 이미지 또는 Push 구독의 삭제·정정을 요청하려면 <a className="underline underline-offset-4" href={supportUrl} target="_blank" rel="noreferrer">문의하기</a>로 요청 내용을 보내 주세요. 본인 확인에 필요한 최소 정보만 요청하며, 요청 처리 후 결과를 안내합니다.
      </p>
    </NoticeSection>

    <NoticeSection title="문의와 변경 사항">
      <p>
        개인정보 처리에 관한 문의나 이 안내의 변경 사항은 아래 문의하기 링크를 통해 확인할 수 있습니다. 실제 저장·동기화 동작이 바뀌면 이 문서의 최종 업데이트 날짜와 설명도 함께 검토합니다.
      </p>
    </NoticeSection>
  </LegalLayout>
);

export const TermsNoticePage = () => (
  <LegalLayout eyebrow="terms" title="서비스 이용 안내" updatedAt="2026년 8월 23일">
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

    <NoticeSection title="정보의 성격과 외부 출처">
      <p>
        전장 순환, 하우징 단계와 기본 숙제 기준은 에오링고가 저장한 규칙과 외부 자료를 바탕으로 계획을 돕기 위해 표시합니다. 패치, 운영 일정, 지역·캐릭터 상태에 따라 달라질 수 있으며, 게임 내 화면과 공식 공지를 대신하지 않습니다.
      </p>
      <p>
        하우징 매물 정보처럼 커뮤니티 자료에 의존하는 내용은 제공자와 원본 링크를 표시합니다. 신청·입찰·보상과 관련된 행동 전에는 원본과 게임 내 상태를 직접 확인해야 합니다.
      </p>
    </NoticeSection>

    <NoticeSection title="서비스 중단과 데이터 보존">
      <p>
        네트워크·브라우저·외부 공급자 장애가 발생해도 가능한 범위에서 로컬 기록을 계속 사용할 수 있도록 설계했지만, 서비스나 동기화의 무중단을 보장하지는 않습니다. 기기 변경과 브라우저 초기화에 대비한 백업 책임은 사용자에게 있습니다.
      </p>
    </NoticeSection>

    <NoticeSection title="문의">
      <p>
        기능 오류, 계정 연결 또는 데이터 관련 문의는 아래 문의하기 링크로 보내 주세요.
      </p>
    </NoticeSection>
  </LegalLayout>
);
