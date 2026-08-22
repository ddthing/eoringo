export const HomeLegalLinks = () => (
  <footer
    className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 px-2 pb-1 pt-2 text-xs font-semibold text-ink-muted"
    aria-label="법적 안내"
  >
    <a className="underline underline-offset-4 hover:text-ink" href="/guide">
      사용 가이드
    </a>
    <span aria-hidden className="text-faint">
      ·
    </span>
    <a className="underline underline-offset-4 hover:text-ink" href="/about">
      운영 원칙
    </a>
    <span aria-hidden className="text-faint">
      ·
    </span>
    <a className="underline underline-offset-4 hover:text-ink" href="/demo">
      로그인 없이 체험
    </a>
    <span aria-hidden className="text-faint">
      ·
    </span>
    <a className="underline underline-offset-4 hover:text-ink" href="/privacy">
      개인정보 처리방침
    </a>
    <span aria-hidden className="text-faint">
      ·
    </span>
    <a className="underline underline-offset-4 hover:text-ink" href="/terms">
      서비스 이용약관
    </a>
  </footer>
);
