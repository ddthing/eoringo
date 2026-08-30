import { Check, CheckCircle2, Clock3, Info, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { getDocumentTitle, publicPageDefinitions } from "../../lib/publicPageMetadata";
import { setPageMetadata } from "../../lib/seo";

const demoTasks = [
  {
    id: "expert",
    title: "무작위 임무: 숙련자",
    detail: "고정 일일 · 1회",
    tone: "오늘 바로 처리",
  },
  {
    id: "frontline",
    title: "무작위 임무: 전장",
    detail: "고정 일일 · 1회",
    tone: "오늘 바로 처리",
  },
  {
    id: "retainer",
    title: "집사 수행 확인",
    detail: "마지막 처리 후 18시간",
    tone: "시간 기반",
  },
  {
    id: "weekly",
    title: "공략수첩",
    detail: "주간 · 화요일 17:00",
    tone: "이번 주 안에",
  },
] as const;

export const DemoPage = () => {
  const page = publicPageDefinitions.demo;
  const [completed, setCompleted] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    setPageMetadata({
      title: getDocumentTitle(page),
      description: page.description,
      canonicalPath: page.path,
      robots: page.robots,
      ogType: page.ogType,
    });
  }, [page]);

  const completedCount = useMemo(() => completed.size, [completed]);
  const progress = Math.round((completedCount / demoTasks.length) * 100);

  const toggleTask = (id: string) => {
    setCompleted((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <div className="public-demo-shell">
      <a className="ui-skip-link" href="#main-content">
        본문으로 바로가기
      </a>
      <header className="public-content-header">
        <div className="public-content-brand">
          <a className="ui-brand-mark no-underline" href="/" aria-label="에오링고 앱으로">
            에오링고
          </a>
          <span>로그인 없이 체험</span>
        </div>
        <nav className="public-content-nav" aria-label="체험 메뉴">
          <a href="/guide">가이드</a>
          <a href="/about">운영 원칙</a>
          <a href="/">앱 열기</a>
        </nav>
      </header>

      <main id="main-content" className="public-demo-main" tabIndex={-1}>
        <header className="public-demo-hero">
          <p className="public-eyebrow">작동 방식을 먼저 확인하세요</p>
          <h1>오늘 할 일을 고르고, 다음 확인 시점을 기억합니다.</h1>
          <p>
            아래는 실제 계정과 분리된 샘플 화면입니다. 체크를 눌러 진행률이 바뀌는 흐름과 일일·18시간·주간 항목이 한 화면에서 어떻게 구분되는지 확인해 보세요.
          </p>
          <div className="public-demo-trust-row">
            <span><ShieldCheck aria-hidden size={16} /> 실제 데이터 미사용</span>
            <span><Clock3 aria-hidden size={16} /> KST 기준 예시</span>
            <span><Info aria-hidden size={16} /> 체크는 저장되지 않음</span>
          </div>
        </header>

        <div className="public-demo-grid">
          <section className="public-demo-panel" aria-labelledby="demo-task-heading">
            <div className="public-demo-panel-heading">
              <div>
                <p className="public-section-eyebrow">샘플 캐릭터 · 빛의 전사</p>
                <h2 id="demo-task-heading">오늘의 루틴</h2>
              </div>
              <span className="public-demo-progress" aria-label={`완료율 ${progress}%`}>
                {progress}%
              </span>
            </div>
            <div className="public-demo-progress-bar" aria-hidden>
              <span style={{ width: `${progress}%` }} />
            </div>
            <div className="public-demo-task-list">
              {demoTasks.map((task) => {
                const isDone = completed.has(task.id);

                return (
                  <button
                    key={task.id}
                    type="button"
                    className={`public-demo-task ${isDone ? "is-complete" : ""}`}
                    aria-pressed={isDone}
                    onClick={() => toggleTask(task.id)}
                  >
                    <span className="public-demo-task-check" aria-hidden>
                      {isDone ? <Check size={16} /> : null}
                    </span>
                    <span className="public-demo-task-copy">
                      <strong>{task.title}</strong>
                      <small>{task.detail}</small>
                    </span>
                    <span className="public-demo-task-tone">{task.tone}</span>
                  </button>
                );
              })}
            </div>
            <p className="public-demo-hint">
              <CheckCircle2 aria-hidden size={16} /> 실제 앱에서는 이 목록을 캐릭터별로 줄이거나 커스텀 항목으로 바꿀 수 있습니다.
            </p>
          </section>

          <aside className="public-demo-side" aria-label="체험 안내">
            <div className="public-demo-side-card">
              <p className="public-section-eyebrow">이 체험에서 보이는 것</p>
              <h2>기능보다 판단 순서를 보여드립니다.</h2>
              <ul className="public-bullet-list">
                <li>오늘 바로 처리할 항목과 시간 기반 항목을 구분합니다.</li>
                <li>완료율은 실제로 하는 범위를 정했을 때 의미가 생깁니다.</li>
                <li>샘플 체크는 계정·브라우저·Supabase에 전송되지 않습니다.</li>
              </ul>
            </div>
            <div className="public-demo-side-card public-demo-side-card-accent">
              <h2>내 데이터로 시작할 때</h2>
              <p>앱에서는 캐릭터를 정하고, 필요한 항목만 남긴 뒤 JSON 백업을 만들 수 있습니다.</p>
              <a className="primary-button inline-flex items-center gap-2" href="/guide/getting-started">
                시작 안내 읽기
              </a>
            </div>
          </aside>
        </div>
      </main>

      <footer className="public-content-footer public-demo-footer">
        <div>
          <a className="font-black text-ink" href="/guide">에오링고 공개 가이드</a>
          <p>체험 데이터는 페이지를 벗어나면 사라집니다.</p>
        </div>
        <nav aria-label="체험 안내">
          <a href="/privacy">개인정보 안내</a>
          <a href="/terms">서비스 이용 안내</a>
          <a href="/about">운영 원칙</a>
        </nav>
      </footer>
    </div>
  );
};
