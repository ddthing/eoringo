import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Database,
  ExternalLink,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { setJsonLd, setPageMetadata } from "../../lib/seo";

const SITE_ORIGIN = "https://eoringo.pages.dev";
const GUIDE_UPDATED_AT = "2026년 8월 23일";
const GUIDE_UPDATED_ISO = "2026-08-23";

type GuideLayoutProps = {
  path: string;
  eyebrow: string;
  title: string;
  description: string;
  readingTime?: string;
  children: ReactNode;
  schemaType?: "Article" | "CollectionPage" | "AboutPage";
};

const guideCards = [
  {
    href: "/guide/routine",
    icon: <Clock3 aria-hidden size={19} />,
    label: "루틴 설계",
    title: "일일·주간 숙제를 덜 놓치는 정리법",
    description: "리셋 시간이 다른 활동을 한 화면에서 우선순위로 바꾸는 방법을 설명합니다.",
    readingTime: "6분 읽기",
  },
  {
    href: "/guide/getting-started",
    icon: <ShieldCheck aria-hidden size={19} />,
    label: "처음 사용하기",
    title: "10분 만에 나에게 맞는 루틴 만들기",
    description: "게스트 시작, 캐릭터 설정, 백업, Google 연결을 데이터 흐름과 함께 안내합니다.",
    readingTime: "5분 읽기",
  },
  {
    href: "/guide/calendar",
    icon: <CalendarDays aria-hidden size={19} />,
    label: "일정 해석",
    title: "전장·하우징 달력을 읽는 방법",
    description: "KST 기준의 날짜 계산과 커뮤니티 기반 하우징 정보를 안전하게 활용하는 법입니다.",
    readingTime: "4분 읽기",
  },
  {
    href: "/guide/task-catalog",
    icon: <BookOpen aria-hidden size={19} />,
    label: "항목 사전",
    title: "숙제 항목의 리셋·횟수 기준표",
    description: "기본 목록이 어떤 주기와 캐릭터 범위로 동작하는지 실제 앱 기준으로 확인합니다.",
    readingTime: "7분 읽기",
  },
] as const;

const InternalLink = ({ to, children }: { to: string; children: ReactNode }) => (
  <a className="public-inline-link" href={to}>
    {children}
  </a>
);

const GuideLayout = ({
  path,
  eyebrow,
  title,
  description,
  readingTime,
  children,
  schemaType = "Article",
}: GuideLayoutProps) => {
  useEffect(() => {
    setPageMetadata({
      title: `${title} | 에오링고`,
      description,
      canonicalPath: path,
      ogType: schemaType === "Article" ? "article" : "website",
      publishedAt: GUIDE_UPDATED_ISO,
      modifiedAt: GUIDE_UPDATED_ISO,
    });

    setJsonLd("eoringo-guide-jsonld", {
      "@context": "https://schema.org",
      "@type": schemaType,
      headline: title,
      description,
      url: `${SITE_ORIGIN}${path}`,
      inLanguage: "ko-KR",
      datePublished: GUIDE_UPDATED_ISO,
      dateModified: GUIDE_UPDATED_ISO,
      author: {
        "@type": "Organization",
        name: "에오링고 운영팀",
        url: SITE_ORIGIN,
      },
      publisher: {
        "@type": "Organization",
        name: "에오링고",
        url: SITE_ORIGIN,
      },
      isPartOf: {
        "@type": "WebSite",
        name: "에오링고",
        url: SITE_ORIGIN,
      },
    });
  }, [description, path, schemaType, title]);

  return (
    <div className="public-content-shell">
      <a className="ui-skip-link" href="#main-content">
        본문으로 바로가기
      </a>
      <header className="public-content-header">
        <div className="public-content-brand">
          <a className="ui-brand-mark no-underline" href="/" aria-label="에오링고 앱으로">
            에오링고
          </a>
          <span>파이널판타지14 루틴 가이드</span>
        </div>
          <nav className="public-content-nav" aria-label="콘텐츠 메뉴">
            <a href="/guide">
              가이드
            </a>
            <a href="/about">운영 원칙</a>
            <a href="/demo">체험</a>
            <a href="/">앱 열기</a>
          </nav>
      </header>

      <main id="main-content" className="public-content-main" tabIndex={-1}>
        <nav className="public-breadcrumbs" aria-label="현재 위치">
          <a href="/guide">가이드</a>
          <span aria-hidden>/</span>
          <span>{eyebrow}</span>
        </nav>
        <article className="public-article">
          <header className="public-article-header">
            <p className="public-eyebrow">{eyebrow}</p>
            <h1>{title}</h1>
            <p className="public-article-lead">{description}</p>
            <div className="public-article-meta" aria-label="문서 정보">
              <span>최종 검토 {GUIDE_UPDATED_AT}</span>
              {readingTime ? <span>{readingTime}</span> : null}
              <span>에오링고 운영팀</span>
            </div>
          </header>
          <div className="public-article-body">{children}</div>
        </article>
      </main>

      <footer className="public-content-footer">
        <div>
          <a className="font-black text-ink" href="/guide">
            에오링고 가이드
          </a>
          <p>게임 플레이를 대신하지 않고, 나만의 루틴을 정리하는 도구입니다.</p>
        </div>
        <nav aria-label="서비스 안내">
          <a href="/privacy">개인정보 안내</a>
          <a href="/terms">서비스 이용 안내</a>
          <a href="/about">운영 원칙</a>
          <a href="/demo">로그인 없이 체험</a>
          <a href="https://coner.luv3r.me/" target="_blank" rel="noreferrer">
            문의하기 <ExternalLink aria-hidden size={13} />
          </a>
        </nav>
      </footer>
    </div>
  );
};

const GuideSection = ({
  eyebrow,
  title,
  children,
}: {
  eyebrow?: string;
  title: string;
  children: ReactNode;
}) => (
  <section className="public-article-section">
    {eyebrow ? <p className="public-section-eyebrow">{eyebrow}</p> : null}
    <h2>{title}</h2>
    <div className="public-section-content">{children}</div>
  </section>
);

const GuideCallout = ({
  icon,
  title,
  children,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
}) => (
  <aside className="public-callout">
    <span className="public-callout-icon">{icon}</span>
    <div>
      <h3>{title}</h3>
      <p>{children}</p>
    </div>
  </aside>
);

const GuideCard = ({
  href,
  icon,
  label,
  title,
  description,
  readingTime,
}: (typeof guideCards)[number]) => (
  <a className="public-guide-card" href={href}>
    <div className="public-guide-card-topline">
      <span className="public-guide-card-icon">{icon}</span>
      <span>{label}</span>
      <ArrowRight aria-hidden size={17} />
    </div>
    <h2>{title}</h2>
    <p>{description}</p>
    <span className="public-guide-card-meta">{readingTime}</span>
  </a>
);

export const GuideIndexPage = () => (
  <GuideLayout
    path="/guide"
    eyebrow="에오링고 편집 가이드"
    title="파이널판타지14 루틴을, 오늘 해야 할 일로 바꾸는 법"
    description="에오링고는 일일·주간 숙제와 전장·하우징 일정을 캐릭터별로 정리하는 로컬 우선 도구입니다. 이 가이드는 기능 소개를 넘어, 무엇을 왜 기록하는지와 기록을 오래 유지하는 방법을 설명합니다."
    schemaType="CollectionPage"
  >
    <GuideSection title="기록보다 중요한 것은 판단입니다">
      <p>
        파이널판타지14에는 매일 반복하는 무작위 임무부터 일정 시간이 지난 뒤 다시 확인하는 집사 수행, 주간 단위로 돌아오는 공략수첩까지 서로 다른 리듬의 활동이 있습니다. 목록을 많이 만드는 것만으로는 바쁜 날에 무엇부터 해야 하는지 알기 어렵습니다.
      </p>
      <p>
        에오링고의 가이드는 “모든 것을 다 하자”는 식의 압박 대신, 오늘의 시간과 캐릭터 수에 맞춰 루틴을 줄이고 다시 시작하는 방법을 다룹니다. 앱은 기록을 담당하고, 이 페이지들은 그 기록을 잘 쓰기 위한 배경과 판단 기준을 제공합니다.
      </p>
    </GuideSection>

    <div className="public-guide-grid" aria-label="추천 가이드">
      {guideCards.map((card) => (
        <GuideCard key={card.href} {...card} />
      ))}
    </div>

    <GuideSection eyebrow="에오링고의 기준" title="세 가지 기준으로 기능을 설계합니다">
      <div className="public-principles-grid">
        <div className="public-principle-card">
          <span className="public-principle-number">01</span>
          <h3>리셋보다 실제 행동을 먼저 봅니다</h3>
          <p>고정 리셋과 18시간 주기를 구분해, 지금 놓치면 손실이 큰 항목을 먼저 찾게 합니다.</p>
        </div>
        <div className="public-principle-card">
          <span className="public-principle-number">02</span>
          <h3>캐릭터별 진행을 섞지 않습니다</h3>
          <p>한 캐릭터의 완료 상태가 다른 캐릭터의 오늘 할 일을 가리지 않도록 기록 범위를 분리합니다.</p>
        </div>
        <div className="public-principle-card">
          <span className="public-principle-number">03</span>
          <h3>복구 가능한 기록을 만듭니다</h3>
          <p>브라우저 중심 저장을 기본으로 하되, JSON 백업과 선택적 계정 동기화로 기기 변경에 대비합니다.</p>
        </div>
      </div>
    </GuideSection>

    <GuideSection eyebrow="먼저 확인할 것" title="이 사이트의 정보가 만들어지는 방식">
      <p>
        공개 글은 검색어를 늘리기 위해 만든 요약 모음이 아닙니다. 앱에서 실제로 사용하는 리셋 규칙과 저장 흐름을 먼저 확인하고, 그중 이용자가 판단에 필요한 부분만 한국어로 풀어 씁니다. 날짜를 계산하는 기준일, 외부 정보의 출처, 패치에 따라 달라질 수 있는 한계를 같은 문서 안에서 함께 공개합니다.
      </p>
      <p>
        에오링고가 어떤 정보를 제공하고 제공하지 않는지는 <InternalLink to="/about">운영 원칙</InternalLink>에서 확인할 수 있습니다. 기본 항목별 기준은 <InternalLink to="/guide/task-catalog">숙제 항목 사전</InternalLink>에 기록하며, 로그인 없이 제품의 핵심 흐름을 보고 싶다면 <InternalLink to="/demo">체험 화면</InternalLink>을 이용할 수 있습니다.
      </p>
    </GuideSection>

    <GuideCallout icon={<Sparkles aria-hidden size={19} />} title="이 사이트는 공식 게임 정보 사이트가 아닙니다.">
      에오링고는 플레이어가 만든 비공식 루틴 도구입니다. 패치, 보상, 리셋 규칙은 바뀔 수 있으므로 실제 게임 화면과 공식 공지를 최종 기준으로 삼아 주세요.
    </GuideCallout>

    <GuideSection title="자주 묻는 질문">
      <div className="public-faq-list">
        <details>
          <summary>로그인하지 않으면 사용할 수 없나요?</summary>
          <p>아니요. 게스트로 시작하면 기록은 현재 브라우저에 저장됩니다. 기기 간 동기화가 필요할 때만 Google 계정을 선택적으로 연결할 수 있습니다.</p>
        </details>
        <details>
          <summary>에오링고가 게임 계정이나 캐릭터 정보를 읽나요?</summary>
          <p>게임에 자동 로그인하거나 게임 계정에 접근하지 않습니다. 앱에 직접 입력한 캐릭터와 루틴을 기록하며, Google 연결 시에도 기본 프로필과 이메일 범위만 사용합니다.</p>
        </details>
        <details>
          <summary>달력의 일정은 언제나 정확한가요?</summary>
          <p>전장 순환과 하우징 단계는 계획을 세우기 위한 참고 정보입니다. 패치나 데이터 갱신 시점에 따라 달라질 수 있으므로 신청·입찰·보상 직전에는 게임 내 정보를 다시 확인해야 합니다.</p>
        </details>
      </div>
    </GuideSection>

    <div className="public-article-cta">
      <div>
        <p className="public-section-eyebrow">바로 적용하기</p>
        <h2>오늘의 루틴을 직접 정리해 보세요.</h2>
        <p>앱을 열어 기본 목록을 확인하고, 하지 않는 활동은 숨기거나 나만의 항목을 추가할 수 있습니다.</p>
      </div>
      <a className="primary-button inline-flex items-center gap-2" href="/">
        앱 열기 <ArrowRight aria-hidden size={16} />
      </a>
    </div>
  </GuideLayout>
);

export const RoutineGuidePage = () => (
  <GuideLayout
    path="/guide/routine"
    eyebrow="루틴 설계"
    title="일일·주간 숙제를 덜 놓치는 정리법"
    description="모든 숙제를 같은 무게로 보지 않고, 리셋 규칙과 실제 플레이 시간을 기준으로 오늘의 우선순위를 정하는 방법입니다."
    readingTime="6분 읽기"
  >
    <GuideCallout icon={<Clock3 aria-hidden size={19} />} title="완료율보다 다음 행동을 선명하게 만드는 것이 목표입니다.">
      에오링고의 체크박스는 성취도를 평가하기 위한 점수가 아니라, 다음에 무엇을 할지 결정하기 위한 작은 기억 장치입니다. 하루를 놓쳤다면 지난 목록을 복구하려 하기보다 오늘의 기준으로 다시 시작하세요.
    </GuideCallout>

    <GuideSection eyebrow="01" title="먼저 루틴을 세 종류로 나눕니다">
      <p>
        첫 번째는 접속했을 때 바로 처리할 수 있는 고정 일일 항목입니다. 두 번째는 집사 수행이나 보물지도처럼 마지막 행동 후 일정 시간이 지나야 다시 의미가 생기는 항목입니다. 세 번째는 주간 경계 안에서 한 번만 챙기면 되는 항목입니다.
      </p>
      <p>
        이 세 가지를 구분하면 “목록이 30개라서 막막하다”는 문제가 “지금 확인할 것, 나중에 확인할 것, 주말에 확인할 것”으로 바뀝니다. 앱의 오늘 화면은 이 판단을 돕기 위해 일일·주간 진행을 따로 보여줍니다.
      </p>
    </GuideSection>

    <GuideSection eyebrow="02" title="5분 점검 순서를 고정합니다">
      <ol className="public-step-list">
        <li>
          <span>1</span>
          <div><strong>캐릭터를 먼저 확인합니다.</strong><p>여러 캐릭터를 키운다면 체크 전에 현재 대상 캐릭터가 맞는지 확인합니다. 캐릭터별 체크 상태가 섞이는 실수를 줄일 수 있습니다.</p></div>
        </li>
        <li>
          <span>2</span>
          <div><strong>오늘 즉시 처리할 항목을 훑습니다.</strong><p>무작위 임무, 납품, 전장처럼 접속 중 바로 끝낼 수 있는 항목을 먼저 보고, 오늘 꼭 필요한 것만 남깁니다.</p></div>
        </li>
        <li>
          <span>3</span>
          <div><strong>시간 기반 항목은 다음 확인 시점을 남깁니다.</strong><p>집사 수행이나 보물지도처럼 18시간 주기를 따르는 항목은 완료 표시만 하지 말고, 다시 확인할 시간을 메모나 알림과 함께 관리합니다.</p></div>
        </li>
        <li>
          <span>4</span>
          <div><strong>주간 항목은 하루에 몰아넣지 않습니다.</strong><p>공략수첩, 단골 거래, 주간 전투·레이드 보상은 주중에 작은 단위로 분산하고 주간 경계 직전에 남은 항목만 확인합니다.</p></div>
        </li>
      </ol>
    </GuideSection>

    <GuideSection eyebrow="03" title="현재 앱에서 다루는 리셋 규칙">
      <p>
        아래 표는 에오링고가 현재 저장하고 있는 루틴 모델을 설명한 것입니다. 게임의 공식 리셋이나 보상 조건을 대신하는 문서가 아닙니다. 패치 이후 값이 달라질 수 있으므로 실제 게임에서 다시 확인해 주세요.
      </p>
      <div className="public-table-wrap">
        <table className="public-table">
          <caption>에오링고 루틴 모델의 대표 예시</caption>
          <thead><tr><th scope="col">모델</th><th scope="col">앱의 예시</th><th scope="col">사용 방법</th></tr></thead>
          <tbody>
            <tr><th scope="row">고정 일일</th><td>무작위 임무, 전장</td><td>오늘 화면에서 접속 직후 우선순위를 확인합니다.</td></tr>
            <tr><th scope="row">KST 기준 시각</th><td>총사령부 조달·군수품 납품</td><td>저장된 KST 기준 리셋을 참고하고 실제 게임에서 다시 확인합니다.</td></tr>
            <tr><th scope="row">18시간 주기</th><td>집사 수행, 보물지도 채집</td><td>마지막 처리 시점 기준으로 다음 확인 시간을 기억합니다.</td></tr>
            <tr><th scope="row">주간 경계</th><td>단골 거래, 공략수첩, 주간 보상</td><td>주중에 분산하고 주간 마감 전에 남은 항목을 확인합니다.</td></tr>
          </tbody>
        </table>
      </div>
    </GuideSection>

    <GuideSection eyebrow="04" title="목록을 줄이는 것도 루틴 관리입니다">
      <p>
        모든 기본 항목을 켜 둔 채로 매일 0%를 보는 것은 좋은 기록이 아닙니다. 실제로 하지 않는 콘텐츠, 특정 캐릭터에서만 하는 콘텐츠, 패치 기간에 쉬는 콘텐츠는 <InternalLink to="/tasks/manage">숙제 상세 관리</InternalLink>에서 숨기거나 순서를 뒤로 보내세요.
      </p>
      <p>
        반대로 기본 목록에 없는 개인 목표는 커스텀 항목으로 추가할 수 있습니다. “이번 주에 한 번”, “파견 후 다시 확인”, “패치 당일 확인”처럼 행동이 분명한 이름을 쓰면 체크 후에도 기록의 의미가 남습니다.
      </p>
    </GuideSection>

    <div className="public-article-cta">
      <div><p className="public-section-eyebrow">실천 체크</p><h2>오늘은 세 가지만 남겨 보세요.</h2><p>앱의 숙제 화면에서 실제로 하는 항목 세 개를 위로 정리하면, 루틴이 오래 유지될 가능성이 높아집니다.</p></div>
      <a className="primary-button inline-flex items-center gap-2" href="/tasks">숙제 관리 열기 <ArrowRight aria-hidden size={16} /></a>
    </div>
  </GuideLayout>
);

export const GettingStartedGuidePage = () => (
  <GuideLayout
    path="/guide/getting-started"
    eyebrow="처음 사용하기"
    title="10분 만에 나에게 맞는 루틴 만들기"
    description="에오링고를 처음 열었을 때 무엇을 입력하고, 어떤 데이터가 어디에 저장되며, 언제 Google 계정을 연결하면 좋은지 단계별로 안내합니다."
    readingTime="5분 읽기"
  >
    <GuideCallout icon={<Database aria-hidden size={19} />} title="처음부터 계정을 만들 필요는 없습니다.">
      에오링고는 로컬 우선 앱입니다. 로그인하지 않아도 현재 브라우저에서 바로 사용할 수 있고, 중요한 기록을 백업한 뒤 기기 간 동기화가 필요할 때만 Google 계정을 연결하면 됩니다.
    </GuideCallout>

    <GuideSection eyebrow="1단계" title="대표 캐릭터를 먼저 정합니다">
      <p>
        앱을 열면 기본 캐릭터가 보입니다. 캐릭터를 여러 개 운영한다면 <InternalLink to="/settings#characters">설정의 내 캐릭터</InternalLink>에서 서버와 이름을 구분해 추가하고, 지금 플레이할 캐릭터를 대표로 지정합니다. 대표 캐릭터는 오늘 화면에서 가장 먼저 보이는 대상일 뿐, 다른 캐릭터의 기록을 삭제하지 않습니다.
      </p>
      <p>
        이름은 게임에서 실제로 구분할 수 있는 짧은 이름을 권합니다. “주캐”, “부캐”처럼 역할만 적기보다 서버와 직업 또는 목표를 함께 적으면 시간이 지난 뒤에도 어떤 기록인지 쉽게 알 수 있습니다.
      </p>
    </GuideSection>

    <GuideSection eyebrow="2단계" title="하지 않는 항목을 숨깁니다">
      <p>
        기본 루틴은 다양한 플레이스타일을 고려해 넓게 시작합니다. 하지만 하지 않는 항목까지 매일 보면 완료율이 낮아지고, 중요한 항목을 찾는 시간이 늘어납니다. <InternalLink to="/tasks/manage">숙제 상세 관리</InternalLink>에서 캐릭터별로 사용하지 않는 항목을 숨기고, 자주 하는 항목은 순서를 위로 옮기세요.
      </p>
      <div className="public-checklist-grid">
        <div><CheckCircle2 aria-hidden size={17} /><span>매일 하는 항목만 오늘 목록에 남기기</span></div>
        <div><CheckCircle2 aria-hidden size={17} /><span>캐릭터마다 다른 루틴은 캐릭터별로 조정하기</span></div>
        <div><CheckCircle2 aria-hidden size={17} /><span>주간 목표는 마감일이 가까운 순서로 보기</span></div>
      </div>
    </GuideSection>

    <GuideSection eyebrow="3단계" title="백업을 한 번 만들어 둡니다">
      <p>
        설정의 백업 및 복원에서 JSON 백업을 내려받으면 브라우저에 있는 캐릭터, 체크 상태, D-day, 메모, 테마와 캐릭터 사진 정보를 복원 가능한 형태로 보관할 수 있습니다. 기기 교체나 브라우저 초기화 전에는 반드시 새 백업을 만들어 주세요.
      </p>
      <p>
        백업 파일은 앱이 자동으로 외부에 보내지 않습니다. 사용자가 직접 내려받는 파일이므로 다른 사람과 공유하거나 공개 저장소에 올리지 말고, 자신이 관리하는 안전한 위치에 보관하세요.
      </p>
    </GuideSection>

    <GuideSection eyebrow="4단계" title="Google 연결은 목적이 있을 때만 사용합니다">
      <p>
        Google 연결은 게임 계정 로그인이 아닙니다. 에오링고의 동기화 대상 계정을 식별하고, 여러 기기에서 같은 루틴을 이어가기 위한 선택 기능입니다. 연결 전에는 <InternalLink to="/privacy">개인정보 안내</InternalLink>에서 저장 범위와 데이터 이동 흐름을 확인하세요.
      </p>
      <p>
        연결 후 기기 데이터와 계정 데이터가 모두 있으면 앱이 임의로 합치지 않고 선택을 요청합니다. 어느 쪽을 기준으로 할지 모르는 상태에서 무리하게 연결하지 말고, 먼저 두 기기의 백업을 확보하는 편이 안전합니다.
      </p>
    </GuideSection>

    <GuideSection title="시작 후 일주일 동안 확인할 것">
      <ul className="public-bullet-list">
        <li>실제로 하지 않는 기본 항목을 발견하면 바로 숨깁니다.</li>
        <li>18시간 주기 항목을 완료한 뒤 다시 확인할 시간을 메모합니다.</li>
        <li>주말에 주간 목록을 한 번 검토하고, 다음 주에 유지할 항목만 남깁니다.</li>
        <li>기기나 브라우저를 바꾸기 전에 JSON 백업을 새로 만듭니다.</li>
      </ul>
    </GuideSection>

    <div className="public-article-cta">
      <div><p className="public-section-eyebrow">준비됐나요?</p><h2>나의 모험가부터 설정해 보세요.</h2><p>저장과 동기화의 선택권은 사용자에게 있습니다. 필요한 만큼만 입력하고, 언제든 백업할 수 있습니다.</p></div>
      <a className="primary-button inline-flex items-center gap-2" href="/settings#characters">캐릭터 설정 <ArrowRight aria-hidden size={16} /></a>
    </div>
  </GuideLayout>
);

export const CalendarGuidePage = () => (
  <GuideLayout
    path="/guide/calendar"
    eyebrow="일정 해석"
    title="전장·하우징 달력을 읽는 방법"
    description="에오링고의 월간 달력이 어떤 기준으로 날짜를 계산하는지, 커뮤니티 기반 하우징 정보와 개인 일정을 어떻게 구분해 봐야 하는지 설명합니다."
    readingTime="4분 읽기"
  >
    <GuideCallout icon={<CalendarDays aria-hidden size={19} />} title="달력은 계획 도구이지 확정 공지가 아닙니다.">
      전장 순환과 하우징 단계는 앱에 저장된 기준일과 데이터로 계산됩니다. 패치, 운영 일정, 원본 데이터 갱신에 따라 실제 상황과 달라질 수 있으므로 신청·입찰·보상 직전에는 게임 내 정보를 최종 확인하세요.
    </GuideCallout>

    <GuideSection eyebrow="01" title="모든 날짜는 KST 기준으로 읽습니다">
      <p>
        에오링고의 일정 화면은 한국 이용자가 날짜를 혼동하지 않도록 한국 시간(KST)을 기준으로 표시합니다. 자정 전후에 접속했을 때 브라우저의 시간대가 다르면 화면의 오늘과 게임 안의 오늘이 달라 보일 수 있으므로, 달력 상단의 시간 기준을 먼저 확인하세요.
      </p>
      <p>
        달력의 날짜 칸은 단순히 이름만 나열하지 않습니다. 날짜, 짧은 별칭, 전체 모드명이 함께 제공되어 작은 화면에서도 어떤 전장인지 확인할 수 있습니다. 색상 범례를 펼치면 서로 다른 모드를 구분할 수 있습니다.
      </p>
    </GuideSection>

    <GuideSection eyebrow="02" title="세 가지 일정 영역을 구분합니다">
      <div className="public-calendar-guide-grid">
        <div className="public-calendar-guide-card"><span className="public-guide-card-icon"><Sparkles aria-hidden size={18} /></span><h3>전장 월간</h3><p>오늘 전장과 다음 전장을 빠르게 확인하고, 월간 순환을 계획합니다.</p></div>
        <div className="public-calendar-guide-card"><span className="public-guide-card-icon"><CalendarDays aria-hidden size={18} /></span><h3>하우징 월간</h3><p>신청 기간과 결과 발표 기간을 구분해 확인합니다. 매물 상태는 별도 원본을 함께 봅니다.</p></div>
        <div className="public-calendar-guide-card"><span className="public-guide-card-icon"><BookOpen aria-hidden size={18} /></span><h3>내 일정</h3><p>기념일을 직접 저장해 D-day로 관리합니다. 공식 게임 일정과 개인 약속을 섞지 않습니다.</p></div>
      </div>
    </GuideSection>

    <GuideSection eyebrow="03" title="하우징 정보는 출처와 한계를 함께 봅니다">
      <p>
        하우징 매물 현황은 에오링고가 직접 확인하는 공식 데이터가 아니라, 화면에 명시한 커뮤니티 제공 정보와 원본 시트를 연결해 보여주는 영역입니다. 앱은 정보 제공자를 표시하고 원본 시트로 이동할 수 있게 해 출처를 숨기지 않습니다.
      </p>
      <p>
        따라서 매물 상태나 경쟁 상황을 근거로 바로 행동하지 마세요. <a className="public-inline-link" href="https://x.com/ff14gingerS" target="_blank" rel="noreferrer">정보 제공자</a>와 <a className="public-inline-link" href="https://docs.google.com/spreadsheets/d/1RGvXw8fIwbY0F9xxZo-59cdtnJd80rWva5Z2ZYruEHY/edit?gid=935403919#gid=935403919" target="_blank" rel="noreferrer">원본 시트</a>를 확인하고, 청약이나 입찰 전에는 게임 내 상태를 다시 확인하는 것이 안전합니다.
      </p>
    </GuideSection>

    <GuideSection title="달력을 활용하는 짧은 순서">
      <ol className="public-step-list">
        <li><span>1</span><div><strong>오늘 요약을 확인합니다.</strong><p>월간 달력으로 이동하기 전에 오늘 전장과 하우징 단계가 무엇인지 먼저 봅니다.</p></div></li>
        <li><span>2</span><div><strong>이번 주에 필요한 날짜만 표시합니다.</strong><p>모든 날짜를 외우려 하지 말고, 실제로 접속할 수 있는 날을 중심으로 계획합니다.</p></div></li>
        <li><span>3</span><div><strong>개인 일정은 내 일정에 따로 적습니다.</strong><p>기념일과 게임 운영 일정을 분리하면 정보가 오래된 경우에도 무엇을 다시 확인해야 하는지 알 수 있습니다.</p></div></li>
      </ol>
    </GuideSection>

    <GuideCallout icon={<ShieldCheck aria-hidden size={19} />} title="출처를 숨기지 않는 것이 일정 콘텐츠의 기본입니다.">
      에오링고는 외부 데이터의 최신성을 보장한다고 말하지 않습니다. 화면에서 출처와 갱신 한계를 함께 설명하고, 사용자가 원본과 게임 안의 정보를 다시 확인할 수 있도록 연결합니다.
    </GuideCallout>

    <div className="public-article-cta">
      <div><p className="public-section-eyebrow">일정 확인</p><h2>이번 달 달력을 열어 보세요.</h2><p>전장, 하우징, 나만의 기념일을 서로 다른 영역에서 확인할 수 있습니다.</p></div>
      <a className="primary-button inline-flex items-center gap-2" href="/calendar">달력 열기 <ArrowRight aria-hidden size={16} /></a>
    </div>
  </GuideLayout>
);

const taskCatalogRows = [
  {
    group: "고정 일일",
    examples: "무작위 임무, 전장, 총사령부 납품",
    rule: "기본 일일 주기",
    count: "대부분 1회, 우호부족은 12회",
    meaning: "접속한 날 바로 처리할 수 있는 항목입니다. 하지 않는 임무는 캐릭터별로 숨기는 편이 정확한 진행률을 만듭니다.",
  },
  {
    group: "시각 지정",
    examples: "총사령부 조달·군수품, 무인도 목장",
    rule: "KST 05:00 또는 17:00",
    count: "1회",
    meaning: "완료 여부만 보지 말고 게임의 실제 리셋 시각과 앱 상단의 KST 기준을 함께 확인합니다.",
  },
  {
    group: "18시간 주기",
    examples: "집사 수행, 보물지도 채집",
    rule: "마지막 완료 후 18시간",
    count: "1회",
    meaning: "달력 날짜가 바뀌는 순간이 아니라 마지막 처리 시점에서 다시 가능해지는 항목입니다.",
  },
  {
    group: "주간 경계",
    examples: "단골 거래, 공략수첩, 주간 전투·레이드 보상",
    rule: "화요일 17:00 기준 주간 규칙",
    count: "항목에 따라 1~12회",
    meaning: "주중에 분산해 기록하고, 주간 경계 직전에 남은 항목을 확인합니다.",
  },
  {
    group: "요일·시각 주간",
    examples: "패션 체크, 골드소서 주간 복권",
    rule: "금요일 17:00 / 토요일 21:00",
    count: "1회",
    meaning: "일반 주간 항목과 같은 날에 열리지 않을 수 있어 별도 시각으로 관리합니다.",
  },
] as const;

export const TaskCatalogGuidePage = () => (
  <GuideLayout
    path="/guide/task-catalog"
    eyebrow="숙제 항목 사전"
    title="에오링고 숙제 항목의 리셋·횟수 기준표"
    description="에오링고 기본 목록이 어떤 주기, 횟수, 캐릭터 범위로 동작하는지 실제 코드에 기록된 모델과 사용자의 판단 기준을 함께 설명합니다."
    readingTime="7분 읽기"
  >
    <GuideCallout icon={<Database aria-hidden size={19} />} title="이 표는 게임 공지가 아니라 에오링고의 기록 모델입니다.">
      앱은 게임 서버를 읽어 실시간 보상을 확인하지 않습니다. 아래 기준은 에오링고가 기본 체크 항목을 분류하고 다음 확인 시점을 계산하기 위해 사용하는 모델이며, 패치·지역·운영 일정이 바뀌면 게임 안의 정보가 최종 기준입니다.
    </GuideCallout>

    <GuideSection eyebrow="읽는 법" title="항목을 추가하기 전에 주기를 먼저 고릅니다">
      <p>
        에오링고의 체크 상태는 단순한 메모가 아니라 “언제 다시 확인해야 하는가”와 연결됩니다. 그래서 기본 목록은 일일·주간·18시간 주기·수동 항목으로 나뉘고, 각 항목은 한 캐릭터의 진행으로 저장됩니다. 이 구분을 먼저 이해하면 완료율을 높이기 위해 실제로 하지 않는 항목을 억지로 남기는 일을 줄일 수 있습니다.
      </p>
      <p>
        아래 표의 “횟수”는 에오링고가 표시할 수 있는 기본 카운터입니다. 보상 조건이나 콘텐츠의 실제 제한을 보증하는 값이 아니며, 필요하면 숙제 상세 관리에서 사용하지 않는 항목을 끄거나 커스텀 항목으로 나만의 기준을 추가할 수 있습니다.
      </p>
    </GuideSection>

    <GuideSection eyebrow="기본 모델" title="현재 기본 목록의 대표 분류">
      <div className="public-table-wrap">
        <table className="public-table">
          <caption>2026년 8월 23일 검토 · 에오링고 기본 루틴 모델</caption>
          <thead>
            <tr>
              <th scope="col">분류</th>
              <th scope="col">대표 항목</th>
              <th scope="col">앱의 주기</th>
              <th scope="col">기본 횟수</th>
              <th scope="col">기록할 때의 의미</th>
            </tr>
          </thead>
          <tbody>
            {taskCatalogRows.map((row) => (
              <tr key={row.group}>
                <th scope="row">{row.group}</th>
                <td>{row.examples}</td>
                <td>{row.rule}</td>
                <td>{row.count}</td>
                <td>{row.meaning}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </GuideSection>

    <GuideSection eyebrow="캐릭터 범위" title="왜 캐릭터를 먼저 선택해야 하나요?">
      <p>
        기본 숙제는 캐릭터별 상태로 저장됩니다. 같은 계정에서 캐릭터를 바꾸더라도 한 캐릭터의 완료 표시가 다른 캐릭터의 오늘 목록을 지우지 않는 것이 에오링고의 중요한 경계입니다. 여러 캐릭터를 운영한다면 체크 전에 상단의 현재 캐릭터를 확인하고, 실제로 하지 않는 활동은 해당 캐릭터에서만 숨기세요.
      </p>
      <div className="public-principles-grid">
        <div className="public-principle-card">
          <span className="public-principle-number">01</span>
          <h3>기본 항목</h3>
          <p>새로 시작할 때 넓은 플레이스타일을 참고하도록 제공하며, 사용하지 않는 항목은 끌 수 있습니다.</p>
        </div>
        <div className="public-principle-card">
          <span className="public-principle-number">02</span>
          <h3>커스텀 항목</h3>
          <p>패치 목표, 개인 약속, 파티 준비처럼 게임 기본 목록에 없는 행동을 직접 기록합니다.</p>
        </div>
        <div className="public-principle-card">
          <span className="public-principle-number">03</span>
          <h3>기록의 한계</h3>
          <p>체크는 알림과 기억을 돕는 도구일 뿐, 게임 클라이언트의 보상·잠금·완료 상태를 검증하지 않습니다.</p>
        </div>
      </div>
    </GuideSection>

    <GuideSection eyebrow="수정 기준" title="규칙이 바뀌면 어떻게 고치나요?">
      <ol className="public-step-list">
        <li><span>1</span><div><strong>게임 안의 실제 변화를 먼저 확인합니다.</strong><p>공식 공지나 게임 클라이언트에서 리셋·횟수·개방 시점을 확인하고, 커뮤니티 제보만으로 단정하지 않습니다.</p></div></li>
        <li><span>2</span><div><strong>코드의 규칙과 공개 설명을 함께 수정합니다.</strong><p>앱의 reset rule, 기본 항목, 테스트, 항목 사전의 설명이 서로 다른 값을 말하지 않게 묶어서 검토합니다.</p></div></li>
        <li><span>3</span><div><strong>검토일과 변경 이유를 남깁니다.</strong><p>데이터가 오래된 사실을 숨기기 위해 날짜를 바꾸지 않고, 실제로 확인·수정한 날과 변경 범위를 기록합니다.</p></div></li>
      </ol>
    </GuideSection>

    <GuideCallout icon={<ShieldCheck aria-hidden size={19} />} title="정확하지 않을 수 있는 부분을 숨기지 않습니다.">
      전장 로테이션과 하우징 단계는 앱에 저장된 기준일과 커뮤니티 자료를 바탕으로 계산합니다. 오류나 패치 변경을 발견하면 <a className="public-inline-link" href="https://coner.luv3r.me/" target="_blank" rel="noreferrer">문의하기</a>로 항목과 확인한 원본을 함께 보내 주세요.
    </GuideCallout>

    <div className="public-article-cta">
      <div><p className="public-section-eyebrow">다음 단계</p><h2>내가 실제로 하는 항목만 남겨 보세요.</h2><p>기준표를 읽은 뒤 숙제 상세 관리에서 기본 목록을 줄이면 진행률과 다음 행동이 더 정직하게 보입니다.</p></div>
      <a className="primary-button inline-flex items-center gap-2" href="/tasks/manage">숙제 관리 열기 <ArrowRight aria-hidden size={16} /></a>
    </div>
  </GuideLayout>
);

export const AboutPage = () => (
  <GuideLayout
    path="/about"
    eyebrow="운영 원칙"
    title="에오링고는 무엇을 기록하고, 무엇을 주장하지 않는가"
    description="에오링고의 제작 목적, 데이터 계산 방식, 출처를 다루는 방법과 수정 요청 경로를 공개합니다. 기능 소개보다 먼저 서비스의 경계를 확인할 수 있는 페이지입니다."
    readingTime="6분 읽기"
    schemaType="AboutPage"
  >
    <GuideCallout icon={<ShieldCheck aria-hidden size={19} />} title="파이널판타지14 공식 서비스가 아닌 팬 메이드 도구입니다.">
      에오링고는 Square Enix와 제휴하거나 게임 계정에 접근하지 않습니다. 게임을 대신 플레이하지 않고, 이용자가 직접 정한 캐릭터와 루틴을 기억하기 쉽게 정리하는 데 목적이 있습니다.
    </GuideCallout>

    <GuideSection eyebrow="왜 만들었나요" title="반복되는 일을 다시 검색하지 않도록">
      <p>
        파이널판타지14를 여러 캐릭터로 플레이하면 “오늘 가능한 것”과 “이번 주 안에 하면 되는 것”이 섞입니다. 에오링고는 이 문제를 하나의 거대한 공략 데이터베이스로 해결하려 하지 않습니다. 사용자가 실제로 하는 활동을 선택하고, 캐릭터별로 체크하고, 다음에 확인할 시점을 기억하는 작은 운영판으로 해결하려고 합니다.
      </p>
      <p>
        따라서 제품의 핵심은 목록의 개수가 아니라 범위를 줄이는 기능입니다. 로컬 우선 저장, 캐릭터별 상태 분리, JSON 백업, 선택적 Google 동기화는 이용자가 기록을 오래 유지하고 필요할 때 복구할 수 있도록 설계한 실제 기능입니다.
      </p>
    </GuideSection>

    <GuideSection eyebrow="어떻게 계산하나요" title="코드에 있는 기준과 외부 사실을 구분합니다">
      <div className="public-table-wrap">
        <table className="public-table">
          <caption>에오링고가 직접 계산하는 것과 다시 확인해야 하는 것</caption>
          <thead><tr><th scope="col">영역</th><th scope="col">에오링고가 하는 일</th><th scope="col">사용자가 최종 확인할 것</th></tr></thead>
          <tbody>
            <tr><th scope="row">루틴</th><td>일일·주간·18시간·수동 주기를 기록하고 진행률을 계산합니다.</td><td>게임의 실제 완료·보상·개방 상태</td></tr>
            <tr><th scope="row">전장</th><td>앱에 저장한 기준일과 순환 패턴으로 날짜별 모드를 계산합니다.</td><td>패치·운영 일정에 따른 실제 로테이션</td></tr>
            <tr><th scope="row">하우징</th><td>기준일로 신청·결과 발표 단계를 표시하고 외부 원본으로 연결합니다.</td><td>실제 매물·경쟁·신청 가능 여부</td></tr>
            <tr><th scope="row">계정</th><td>브라우저 저장을 기본으로 하고, 선택한 경우에만 Google/Supabase 동기화를 시도합니다.</td><td>동의 화면의 요청 범위와 본인 백업</td></tr>
          </tbody>
        </table>
      </div>
      <p>
        게임의 공식 기준을 확인할 때는 <a className="public-inline-link" href="https://na.finalfantasyxiv.com/lodestone/" target="_blank" rel="noreferrer">FINAL FANTASY XIV 공식 Lodestone</a>와 게임 클라이언트를 우선하세요. 에오링고의 계산 결과는 계획을 돕는 참고값입니다.
      </p>
    </GuideSection>

    <GuideSection eyebrow="편집 원칙" title="정보를 업데이트할 때 지키는 네 가지 약속">
      <ol className="public-step-list">
        <li><span>1</span><div><strong>직접 확인 가능한 기능부터 씁니다.</strong><p>앱에서 실제로 동작하는 저장·주기·백업 흐름과 공개 설명이 어긋나지 않게 합니다.</p></div></li>
        <li><span>2</span><div><strong>외부 정보에는 원본과 한계를 붙입니다.</strong><p>커뮤니티 시트나 제공자 자료를 사용할 때는 출처를 숨기지 않고 최신성 보장을 약속하지 않습니다.</p></div></li>
        <li><span>3</span><div><strong>검토일을 실제 변경과 연결합니다.</strong><p>검색 노출을 위해 날짜만 바꾸지 않고 내용·코드·출처를 다시 확인한 경우에만 검토일을 갱신합니다.</p></div></li>
        <li><span>4</span><div><strong>오류를 발견하면 수정 경로를 엽니다.</strong><p>문의자는 문제의 항목, 재현 상황, 확인한 원본을 함께 보낼 수 있고 운영자는 다음 검토 때 변경 범위를 기록합니다.</p></div></li>
      </ol>
    </GuideSection>

    <GuideSection eyebrow="운영 주체" title="누가 관리하나요?">
      <p>
        에오링고는 GitHub 사용자 <a className="public-inline-link" href="https://github.com/ddthing/eoringo" target="_blank" rel="noreferrer">ddthing</a>가 관리하는 오픈소스 프로젝트입니다. 코드·테스트·운영 문서는 공개 저장소에서 확인할 수 있으며, 서비스 이용과 데이터 저장 범위는 <InternalLink to="/privacy">개인정보 안내</InternalLink>와 <InternalLink to="/terms">서비스 이용 안내</InternalLink>에 따릅니다.
      </p>
      <div className="public-checklist-grid">
        <div><CheckCircle2 aria-hidden size={17} /><span>공개 코드와 테스트로 계산 기준 확인</span></div>
        <div><CheckCircle2 aria-hidden size={17} /><span>개인 기록 화면과 공개 콘텐츠 분리</span></div>
        <div><CheckCircle2 aria-hidden size={17} /><span>오류 제보와 개인정보 문의 경로 공개</span></div>
      </div>
    </GuideSection>

    <div className="public-article-cta">
      <div><p className="public-section-eyebrow">직접 확인하기</p><h2>로그인 없이 핵심 흐름을 먼저 살펴보세요.</h2><p>체험 화면은 샘플 데이터만 사용하며 실제 브라우저 기록이나 계정 데이터를 변경하지 않습니다.</p></div>
      <a className="primary-button inline-flex items-center gap-2" href="/demo">체험 화면 열기 <ArrowRight aria-hidden size={16} /></a>
    </div>
  </GuideLayout>
);
