# 앱 전체 공통 UI 시스템 설계

## 상태

- 승인됨: 2026-08-09
- 범위: 앱 전체 공통 UI 개선
- 구현 방식: Material 3의 semantic token·state layer·shape·motion 원칙과 shadcn/ui의 조합 가능한 로컬 컴포넌트 방식을 결합한다.

## 목표

기존 기능·라우팅·스토어·데이터 구조를 변경하지 않고, 화면마다 흩어진 Tailwind 표현을 공통 UI 계층으로 정리한다.

핵심 목표:

- 공통 색상·surface·border·focus·danger 의미를 토큰으로 통일
- 버튼·아이콘 버튼·카드·입력·배지·선택 컨트롤의 상태를 일관되게 표현
- 최소 44px 터치 영역과 `focus-visible`, `disabled`, `aria-*` 상태 보장
- light/dark 및 accent theme에서 같은 컴포넌트가 자연스럽게 동작
- 기존의 차분한 게임 대시보드 분위기와 모바일 우선 레이아웃 유지

## 시각 방향

- 톤: 차분하고 정돈된 게임 대시보드
- 형태: 둥근 shape와 얕은 elevation, 과한 gradient·장식·모달 남용 금지
- 색상: accent를 action/selection/focus에 사용하고, 배경·surface·text·border는 semantic token으로 분리
- 타이포그래피: 현재 Pretendard 계열을 유지하고 heading/body/label 역할과 대비를 정리
- 모션: hover/press/focus와 panel enter 정도만 사용하고 reduced motion에서는 비활성화

## 공통 컴포넌트

`src/components/ui`에 다음 로컬 primitives를 둔다. 외부 UI 라이브러리를 추가하지 않고, 컴포넌트가 사용하는 className 조합을 열어 둔다.

- `Button`: primary, secondary, ghost, destructive, loading
- `IconButton`: label 필수, 44px 이상 터치 영역
- `Card`: surface, border, elevation, compact 옵션
- `SectionHeader`: overline, title, description, action 슬롯
- `Field`와 `Select`: label/help/error/disabled 상태, 기존 native control 유지
- `Badge`: neutral, accent, success, warning, danger
- `SegmentedControl`: 선택 상태를 `aria-pressed` 또는 radio semantics로 노출
- `EmptyState`와 `StatusMessage`: empty, info, success, error 상태
- `Dialog`와 `BottomSheet`: 기존 동작을 깨지 않는 공통 표면·focus·dismiss 스타일

각 primitive는 비즈니스 상태를 알지 않고 표현만 담당한다. 화면 컴포넌트는 기존 store/action을 계속 소유한다.

## 적용 순서

1. `src/styles/globals.css`에 semantic token, state layer, radius/elevation/motion 규칙을 보강한다.
2. `src/components/ui` primitives와 테스트를 추가한다.
3. `AppShell`과 `BottomNav`에 surface, active, focus, safe-area 규칙을 적용한다.
4. `SettingsPage`와 설정 폼에 `Card`, `SectionHeader`, `Button`, `Field`, `SegmentedControl`을 적용한다.
5. Home·Tasks·Calendar의 대표 action, card, empty/error 상태를 같은 primitives로 점진 전환한다.
6. 기존 특수 레이아웃과 도메인 색상은 의미가 있는 경우에만 유지하고, 공통 상태 표현은 primitives로 통합한다.

## 상태 규칙

- hover는 pointer가 있는 환경에서만 표시한다.
- press는 짧은 scale/색상 변화로 표현한다.
- focus-visible은 accent outline과 offset으로 항상 보인다.
- disabled는 opacity만으로 구분하지 않고 cursor·surface·text 대비를 함께 조정한다.
- destructive action은 danger token과 확인 UI를 사용한다.
- 선택 상태는 색상만으로 전달하지 않고 아이콘·텍스트·`aria-pressed`를 함께 사용한다.
- `prefers-reduced-motion`에서는 장식성 transition/animation을 줄인다.

## 제외 범위

- 기능·데이터·라우팅·스토어 구조 변경
- 모든 native select를 custom listbox로 교체
- 화면별 신규 테마 색상 추가
- 외부 component library 설치
- 이미지·브랜드 자산 교체

## 검증

- 기존 Vitest 전체 통과
- 새 primitives의 variant·disabled·focus·ARIA 테스트
- production build 통과
- 360px, 390px, 430px, 768px 대표 viewport에서 overflow 없음
- light/dark와 모든 accent theme에서 버튼·입력·선택·dialog 대비 확인
- reduced motion에서 비필수 애니메이션 비활성화 확인
- 브라우저 console error 없음
