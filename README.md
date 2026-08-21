# 에오링고

> 파이널판타지14 플레이어가 매일·매주 해야 할 일을 잊지 않고, 캐릭터별 루틴을 가볍게 기록하는 로컬 우선 대시보드입니다.

[운영 페이지](https://eoringo.pages.dev/) · [개인정보 안내](https://eoringo.pages.dev/privacy) · [서비스 이용 안내](https://eoringo.pages.dev/terms) · [문의하기](https://coner.luv3r.me/)

## 제품 한 문장

에오링고는 “오늘 무엇을 해야 하지?”를 다시 검색하는 시간을 줄이고, 지금 체크할 숙제와 중요한 일정을 한 화면에 보여주는 개인용 루틴 도구입니다.

## 제품과 기술의 기준

| 질문 | 제품·기술의 답 |
| --- | --- |
| 사용자는 왜 다시 방문하는가? | 일일·주간 숙제, 18시간 주기 항목, 전장·하우징 일정이 오늘의 화면에 모여 있기 때문입니다. |
| 처음부터 계정이 필요한가? | 아닙니다. 로컬 우선으로 시작하고, 필요한 사용자만 Google 계정을 연결해 기기 간 동기화를 선택합니다. |
| 무엇을 신뢰할 수 있는가? | KST 기준 리셋 규칙, 캐릭터별 상태 분리, 백업·복원, 명시적 데이터 이전 절차를 코드와 테스트로 관리합니다. |
| 어떤 표현을 피해야 하는가? | 게임 공식 데이터·실시간 API를 제공한다고 말하지 않습니다. 전장 로테이션과 하우징 단계는 앱에 포함된 규칙과 설정을 기반으로 계산합니다. |

## 주요 기능

- **오늘 대시보드**: 현재 캐릭터, 오늘 완료율, 남은 숙제, 이번 주 진행도, 주간 메모, D-day를 한눈에 확인합니다.
- **캐릭터별 루틴**: 캐릭터를 전환하면 체크 상태와 관리 대상이 캐릭터 범위에 맞게 바뀝니다.
- **숙제 관리**: 기본 일일·주간 숙제를 켜고 끄며, 커스텀 숙제를 추가하고 검색·상태·초기화 주기로 필터링합니다.
- **초기화 규칙**: 수동, 일일, 주간, 18시간 주기와 특정 요일·시간 규칙을 지원합니다.
- **순서와 횟수 관리**: 숙제 표시 순서와 완료 횟수, 레벨링·길드 의뢰 등 횟수형 진행을 관리합니다.
- **전장·하우징 달력**: KST 기준 오늘의 전장과 하우징 단계를 월간 달력으로 확인합니다.
- **기념일과 메모**: 다가오는 기념일을 등록하고 매주 메모를 남깁니다.
- **알림**: 브라우저 알림으로 미완료 숙제를 확인할 수 있으며, 운영 환경과 브라우저가 준비된 경우 앱이 닫혀 있어도 Web Push를 사용할 수 있습니다.
- **테마**: 시스템 설정·라이트·다크 모드와 포인트 컬러를 선택합니다.
- **백업·복원**: 브라우저에 저장된 루틴 데이터와 캐릭터 사진을 JSON으로 백업하고 복원합니다.
- **선택적 계정 동기화**: Supabase와 Google 로그인 연결을 사용할 수 있습니다. 기존 로컬 데이터와 계정 데이터가 충돌하면 자동으로 합치거나 삭제하지 않고 사용자의 선택을 받습니다.

## 화면과 경로

| 경로 | 역할 |
| --- | --- |
| `/` | 오늘의 루틴과 진행 현황 |
| `/tasks` | 캐릭터별 숙제 체크 |
| `/tasks/manage` | 기본·커스텀 숙제, 초기화 규칙, 순서 관리 |
| `/calendar` | 전장·하우징·기념일 달력 |
| `/settings` | 캐릭터, 테마, 알림, 계정, 백업·복원 |
| `/privacy` | 개인정보 안내 |
| `/terms` | 서비스 이용 안내 |
| `/auth/callback` | Google OAuth 콜백 |

## 사용자 흐름

```text
브라우저에서 시작
      ↓
로컬에 캐릭터·숙제·일정 기록
      ↓ (선택)
Google 계정 연결 및 데이터 이전 확인
      ↓
Supabase 기기 간 동기화
      ↓ (선택)
Web Push로 앱이 닫힌 뒤에도 미완료 숙제 알림
```

계정 연결은 로컬 기록을 덮어쓰는 동작이 아닙니다. 기존 계정 데이터가 있으면 백업 후 불러오기 같은 명시적 선택을 거치며, 네트워크나 이전이 실패해도 로컬 데이터는 보존하는 것을 기본 경계로 둡니다.

## 기술 스택

- React 18 + TypeScript
- Vite 6
- React Router 7
- Zustand 기반 로컬 상태 관리
- Tailwind CSS와 자체 UI 컴포넌트
- Vitest 테스트
- Supabase Auth, Postgres/RLS, Storage, Edge Functions, Scheduler(선택 기능)
- Cloudflare Pages 정적 배포

## 로컬 개발

### 사전 요구사항

- Node.js
- pnpm
- Supabase 기능을 로컬에서 실행하려면 Docker와 Supabase CLI

### 설치와 실행

```bash
pnpm install

# macOS/Linux
cp .env.example .env.local

# PowerShell에서는 위 대신 다음을 사용합니다.
# Copy-Item .env.example .env.local

pnpm dev
```

기본 `.env.example`은 안전한 로컬 우선 모드입니다. 이 상태에서는 원격 동기화와 이미지 원격 업로드가 꺼져 있습니다.

### 환경 변수

| 변수 | 기본값 | 용도 |
| --- | --- | --- |
| `VITE_REMOTE_SYNC_ENABLED` | `false` | Supabase 계정·원격 동기화 활성화 |
| `VITE_IMAGE_UPLOADS_ENABLED` | `false` | 캐릭터 이미지의 비공개 Storage 동기화 활성화 |
| `VITE_SUPABASE_URL` | 비어 있음 | 원격 동기화가 켜졌을 때의 Supabase URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | 비어 있음 | 브라우저에 노출 가능한 publishable key |
| `VITE_TURNSTILE_SITE_KEY` | 비어 있음 | 게스트 가입 CAPTCHA의 공개 site key |
| `VITE_WEB_PUSH_PUBLIC_KEY` | 비어 있음 | 브라우저에 노출 가능한 Web Push VAPID 공개 키 |

`VITE_*` 변수에는 service-role key, OAuth secret, DB 비밀번호, CAPTCHA secret, VAPID private key를 넣지 않습니다. 서버 전용 값은 `supabase/functions/.env.example`을 참고해 Supabase secrets로 관리합니다.

## 테스트와 품질 게이트

```bash
# 애플리케이션 단위 테스트
pnpm test

# 운영 빌드
pnpm run build

# 전체 릴리스 게이트
pnpm run check
```

`pnpm run check`는 다음을 포함합니다.

- 애플리케이션 테스트
- Codex orchestrator 타입 검사·테스트·빌드
- 소스·Supabase·스크립트·문서의 비밀값 검사
- 무료 요금제 보호 검사
- TypeScript 타입 검사와 Vite 운영 빌드
- `dist` 번들 비밀값 검사

선택 기능을 포함한 로컬 Supabase 검증은 다음 순서로 실행합니다.

```bash
pnpm run supabase:start
pnpm run supabase:reset
pnpm run test:db
pnpm run test:migration-local
pnpm run supabase:stop
```

`supabase:reset`은 로컬 데이터베이스를 초기화하므로 로컬 개발 데이터가 필요한 경우 먼저 백업합니다.

## Supabase 구성

`supabase/`에는 다음 기능이 포함되어 있습니다.

- Auth와 사용자별 문서 동기화
- RLS 기반 사용자 데이터 격리
- 기존 로컬 데이터의 검증·이전
- 비공개 캐릭터 이미지 동기화
- Web Push 구독 등록·해제
- 미완료 숙제 알림 발송

Edge Function은 다음 경로에 있습니다.

| 함수 | 역할 |
| --- | --- |
| `migrate-local-data` | 로컬 데이터의 검증된 계정 이전 |
| `sync-character-images` | 인증된 사용자의 캐릭터 이미지 동기화 |
| `manage-push-subscription` | Web Push 구독 관리 |
| `send-daily-task-notifications` | 미완료 숙제 알림 발송 |

운영에 연결하기 전에는 [`docs/operations/security-release-checklist.md`](docs/operations/security-release-checklist.md)와 [`docs/operations/free-tier-runbook.md`](docs/operations/free-tier-runbook.md)를 읽고, RLS·Storage·Auth·Edge Function·비용 경계를 각각 확인합니다.

## 배포

현재 운영 주소는 [https://eoringo.pages.dev/](https://eoringo.pages.dev/)이며 Cloudflare Pages가 이 저장소의 `main` 변경을 받아 운영 빌드를 생성합니다.

기본 배포 계약은 다음과 같습니다.

- Build command: `pnpm run build`
- Output directory: `dist`
- 정적 자산 소스: `public/`
- SPA fallback: `public/_redirects`
- 보안 헤더: `public/_headers`

배포 전 최소 절차:

```bash
pnpm run check
git diff --check
git push origin main
```

Google 소유권 확인과 AdSense 준비 파일도 `public/`에서 관리합니다.

- `public/google96c42eb007c2a9a8.html`
- `public/ads.txt`

배포 후 다음 주소가 HTML·일반 텍스트 원문을 각각 반환하는지 확인합니다.

- `https://eoringo.pages.dev/google96c42eb007c2a9a8.html`
- `https://eoringo.pages.dev/ads.txt`

Supabase Edge Function과 데이터베이스 마이그레이션은 Cloudflare Pages 정적 배포와 별도의 운영 작업입니다. 운영 비밀값과 provider 설정은 Git에 커밋하지 않습니다.

## 프로젝트 구조

```text
src/
├─ app/          라우팅과 앱 셸
├─ components/   화면·도메인 UI·공통 UI
├─ data/         기본 숙제·전장·하우징 규칙
├─ domain/       리셋·진행도·기념일·알림 등 순수 도메인 로직
├─ stores/       Zustand 로컬 상태
├─ sync/         로컬 스냅샷·큐·Supabase 동기화·데이터 이전
├─ lib/          날짜·색상·백업·Storage·Supabase 클라이언트
└─ styles/       전역 디자인 토큰과 스타일
supabase/
├─ migrations/   스키마·RLS·Storage·스케줄러 마이그레이션
├─ functions/    Edge Functions
└─ tests/        데이터베이스 테스트
public/          favicon, manifest, Service Worker, headers, redirects, SEO 자산
docs/            운영 런북과 기능 설계 문서
scripts/         보안·무료 요금제·마이그레이션 검증 스크립트
tools/           Codex orchestrator
```

## 운영상 중요한 원칙

1. **로컬 데이터를 먼저 보존합니다.** 계정 연결, 네트워크 오류, 동기화 실패가 브라우저 기록을 조용히 삭제하지 않아야 합니다.
2. **사용자 간 데이터 경계를 지킵니다.** 원격 데이터는 인증된 Supabase 클라이언트와 RLS를 통해서만 접근합니다.
3. **브라우저에는 공개값만 둡니다.** publishable key와 public VAPID key 외의 비밀값은 서버에만 둡니다.
4. **무료 요금제 경계를 넘지 않습니다.** 유료 애드온·자동 과금·Realtime·이미지 변환을 임의로 활성화하지 않습니다.
5. **게임 규칙 변경을 운영 이벤트로 봅니다.** 전장 로테이션, 하우징 단계, 숙제 리셋 규칙은 패치에 맞춰 코드와 테스트를 함께 검토합니다.

## 알려진 범위와 다음 검토

- 월간 달성도·Habit Tracker는 아직 구현하지 않았습니다. 검토 메모는 [`src/docs/roadmap.md`](src/docs/roadmap.md)에 있습니다.
- 원격 동기화, 비공개 이미지 업로드, 백그라운드 Push는 provider 설정과 feature flag가 모두 준비된 환경에서만 사용할 수 있습니다.
- 앱의 전장·하우징 정보는 현재 코드에 포함된 규칙과 설정으로 계산됩니다. 실시간 공식 데이터 연동을 의미하지 않습니다.

## 추가 문서

- [무료 요금제 운영 런북](docs/operations/free-tier-runbook.md)
- [보안 릴리스 체크리스트](docs/operations/security-release-checklist.md)
- [백업과 복원 운영 문서](docs/operations/backup-and-restore.md)
- [Web Push 알림 운영 문서](docs/web-push-notifications.md)
- [기능 설계 문서](docs/superpowers/specs/)

## 현재 운영 기준

운영 설정은 저장소 코드와 Supabase Dashboard가 함께 구성합니다. 아래 값은 2026-08-21 운영 점검 기준입니다.

| 항목 | 상태 | 이유 |
| --- | --- | --- |
| Anonymous sign-ins | 활성화 | 계정 없이 시작하고 로컬 데이터를 선택적으로 동기화 |
| Google provider | 활성화 | 게스트 세션에 영구 identity 연결 |
| Manual linking | 활성화 | 익명 사용자와 Google identity의 안전한 연결 |
| Email provider | 비활성화 | 사용하지 않는 비밀번호 인증 표면 제거 |
| Turnstile CAPTCHA | 활성화 | 익명 가입 남용 방지 |
| Anonymous rate limit | IP당 시간당 30회 | Auth endpoint burst 제한 |

운영 provider와 rate limit은 Supabase Dashboard에서 확인합니다. 로컬 <code>supabase/config.toml</code>은 개발·CI 재현성을 위한 설정이며, 운영 secret을 담지 않습니다.

## 오픈소스 고지와 출처

아래 목록은 <code>package.json</code>에 선언된 직접 의존성 기준입니다. 설치 버전은 <code>package.json</code>과 <code>pnpm-lock.yaml</code>을 기준으로 하며, 간접 의존성은 lockfile과 각 패키지의 라이선스를 따릅니다.

### 런타임

| 패키지 | 사용 목적 | 라이선스 | 공식 출처 |
| --- | --- | --- | --- |
| React / React DOM | UI 렌더링과 컴포넌트 | MIT | [react/react](https://github.com/facebook/react) |
| React Router DOM | 클라이언트 라우팅 | MIT | [remix-run/react-router](https://github.com/remix-run/react-router) |
| Zustand | 로컬 상태 관리 | MIT | [pmndrs/zustand](https://github.com/pmndrs/zustand) |
| <code>@supabase/supabase-js</code> | Auth·Postgres·Storage·Edge Function client | MIT | [supabase/supabase-js](https://github.com/supabase/supabase-js) |
| date-fns | 날짜·주기 계산 | MIT | [date-fns/date-fns](https://github.com/date-fns/date-fns) |
| date-fns-tz | IANA timezone 계산 | MIT | [marnusw/date-fns-tz](https://github.com/marnusw/date-fns-tz) |
| Zod | 입력·데이터 schema 검증 | MIT | [colinhacks/zod](https://github.com/colinhacks/zod) |
| Lucide React | 아이콘 | ISC | [lucide-icons/lucide](https://github.com/lucide-icons/lucide) |

### 빌드·테스트·개발 도구

| 패키지 | 사용 목적 | 라이선스 | 공식 출처 |
| --- | --- | --- | --- |
| Vite / <code>@vitejs/plugin-react</code> | 개발 서버·번들·React transform | MIT | [vitejs/vite](https://github.com/vitejs/vite) · [vitejs/vite-plugin-react](https://github.com/vitejs/vite-plugin-react) |
| TypeScript | 정적 타입 검사 | Apache-2.0 | [microsoft/TypeScript](https://github.com/microsoft/TypeScript) |
| Vitest | 단위·통합 테스트 | MIT | [vitest-dev/vitest](https://github.com/vitest-dev/vitest) |
| Tailwind CSS | utility-first 스타일링 | MIT | [tailwindlabs/tailwindcss](https://github.com/tailwindlabs/tailwindcss) |
| PostCSS / Autoprefixer | CSS 변환·브라우저 prefix | MIT | [postcss/postcss](https://github.com/postcss/postcss) · [postcss/autoprefixer](https://github.com/postcss/autoprefixer) |
| Supabase CLI | 로컬 DB·migration·Edge Function 도구 | MIT | [supabase/cli](https://github.com/supabase/cli) |
| <code>@types/node</code>, <code>@types/react</code>, <code>@types/react-dom</code> | TypeScript 타입 정의 | MIT | [DefinitelyTyped/DefinitelyTyped](https://github.com/DefinitelyTyped/DefinitelyTyped) |

Cloudflare Pages, Supabase, Cloudflare Turnstile, Google OAuth와 Web Push는 오픈소스 패키지와 구분되는 외부 서비스·플랫폼입니다. 운영 약관과 서비스 문서는 각 공급자의 공식 문서를 따릅니다.

오픈소스 라이선스 원문은 각 공식 저장소와 설치된 패키지의 <code>LICENSE</code> 파일을 기준으로 합니다. 패키지를 업데이트하거나 배포 방식을 바꿀 때는 라이선스와 보안 공지를 함께 재검토합니다.
