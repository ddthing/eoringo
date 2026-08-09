# Google identity 충돌 복구 설계

## 문제

익명 게스트 세션에서 `linkIdentity({ provider: "google" })`를 실행했는데 해당 Google identity가 이미 다른 에오링고 Auth 사용자에게 연결되어 있으면 Supabase가 `identity_already_exists`를 반환한다. 이때 현재 게스트 세션은 유지되지만 Google 계정 연결은 완료되지 않으므로 데이터는 계속 브라우저 로컬 저장소에 남는다.

## 목표

- 충돌을 계정 연결 성공으로 오해하지 않도록 명확히 안내한다.
- 현재 익명 세션만 종료하고 브라우저의 게스트 로컬 데이터는 보존한다.
- 사용자가 기존 Google 계정으로 로그인할 수 있는 명확한 복구 경로를 제공한다.
- 로그인 후 기존 로컬 데이터와 원격 계정 데이터를 안전하게 선택·이전하게 한다.
- Google 계정 또는 Supabase의 민감한 원본 오류 메시지를 UI에 노출하지 않는다.

## 비목표

- 서로 다른 Supabase 사용자 사이의 자동 데이터 병합
- 사용자의 확인 없이 `localStorage` 삭제
- 기존 원격 계정 데이터 자동 덮어쓰기
- 데이터베이스 스키마 또는 RLS 정책 변경

## 권장 흐름

1. 게스트가 Google 연결을 시도한다.
2. `identity_already_exists`가 발생하면 콜백 화면에 `기존 Google 계정으로 로그인` CTA를 표시한다.
3. CTA는 익명 Supabase 세션만 `signOut`하고, 로컬 저장소는 건드리지 않은 채 Google OAuth 로그인으로 이동한다.
4. OAuth 콜백이 성공하면 영구 Google 세션으로 전환한다.
5. 설정 화면에서 로컬 데이터 이전 안내를 표시한다.
   - 원격 문서가 이미 있으면 로컬 데이터를 먼저 백업하고 원격 데이터를 불러온다.
   - 원격 문서가 없으면 로컬 데이터를 백업한 뒤 계정으로 이전한다.
6. 사용자가 동기화에 동의한 뒤에만 `user_documents` 원격 동기화를 시작한다.

## 구현 경계

- `AuthClient`에 현재 세션을 끝내는 `signOut` 연산을 추가한다.
- `AuthProvider`에 게스트 세션에서 기존 Google 로그인으로 전환하는 명시적 동작을 추가한다.
- `AuthCallbackPage`의 identity 충돌 상태에 로그인 CTA와 설정 복귀 보조 경로를 제공한다.
- 기존 `LocalMigrationLauncher`, `useRemoteSync`, `syncConsent` 흐름은 재사용한다.
- 계정 전환 중 오류가 나면 게스트 로컬 데이터가 남아 있어 재시도할 수 있어야 한다.

## 테스트 및 완료 기준

- `identity_already_exists`가 계정 연결 성공으로 처리되지 않고 충돌 상태로 표시된다.
- `signOut` 호출은 Supabase 세션만 종료하며 로컬 데이터 삭제 API를 호출하지 않는다.
- 기존 Google 로그인 CTA가 렌더링되고 OAuth 전환 동작을 호출한다.
- 영구 계정 로그인 후 동기화 동의 전에는 원격 동기화가 시작되지 않는다.
- 기존 앱 테스트, 타입 검사, 보안 검사, 프로덕션 빌드가 통과한다.
- 320/390/768/1280px에서 콜백 화면과 설정 화면에 가로 넘침이 없다.
