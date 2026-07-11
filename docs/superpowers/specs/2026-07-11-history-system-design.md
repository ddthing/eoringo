# History 시스템 설계

## 목표

- 일일 reset 이후에도 이전 날짜의 숙제·메모·진행률·D-day 상태를 보존한다.
- 현재 UI와 현재 날짜 데이터 흐름은 기존 store만 사용하도록 유지한다.
- 향후 통계, Habit, 캘린더 기능이 날짜와 캐릭터를 기준으로 과거 상태를 조회할 수 있게 한다.
- 기존 사용자 데이터와 backup version 1~4를 손실 없이 지원한다.
- History UI는 이번 범위에 포함하지 않는다.

## 접근 방식

- 기존 task, memo, D-day store와 분리된 `HistoryStore`를 추가한다.
- History는 모든 변경 이벤트를 재생하는 event log가 아니라 날짜별 완성 스냅샷을 저장한다.
- 기존 store에 history 필드를 분산하지 않는다. 향후 소비자는 HistoryStore 한 곳만 조회한다.

## 데이터 구조

```ts
type HistoryState = {
  entriesByDate: Record<string, HistoryDay>;
};

type HistoryDay = {
  date: string;
  capturedAt: string;
  characters: Record<string, CharacterHistory>;
};

type CharacterHistory = {
  character: {
    id: string;
    name: string;
    server: string;
    isMain: boolean;
  };
  tasks: HistoryTask[];
  memo: string;
  progress: {
    daily: TaskProgress;
    weekly: TaskProgress;
    other: TaskProgress;
    total: TaskProgress;
  };
  ddayEvents: DdayEvent[];
};

type HistoryTask = {
  id: string;
  title: string;
  category: TaskCategory;
  group: TaskGroup;
  resetType: ResetType;
  maxCount: number;
  count: number;
  completed: boolean;
};
```

- 날짜 키는 KST `yyyy-MM-dd`만 허용한다.
- 숙제는 ID와 count뿐 아니라 당시 제목, 분류, reset 종류, 최대 횟수를 함께 복사한다.
- 캐릭터 이름과 서버도 복사해 이후 캐릭터가 삭제돼도 과거 기록을 해석할 수 있게 한다.
- D-day 이벤트는 이후 수정·삭제와 무관하게 당시 상태를 재현하도록 날짜별 복사본을 저장한다.
- progress는 당시 보이던 활성 기본 숙제와 커스텀 숙제를 기준으로 계산한 결과를 저장한다.

## 캡처 및 reset 순서

- 앱 시작 시와 기존 1분 reset 검사 시점에 History 동기화를 먼저 실행한다.
- 현재 KST 날짜와 task store의 `dailyResetKey`가 다르면 기존 상태를 `dailyResetKey` 날짜로 캡처한다.
- 캡처가 끝난 뒤 기존 `ensureCurrentResets`를 실행한다.
- History 캡처가 실패해도 현재 데이터가 조용히 유실되지 않도록 reset 실행 전에 캡처 결과를 확정한다.
- 같은 날짜가 이미 존재하면 reset 전 최종 스냅샷으로 교체하고, 날짜가 지난 뒤에는 다시 수정하지 않는다.
- 앱을 여러 날 열지 않았다면 마지막으로 데이터가 존재했던 날짜만 저장한다.
- 중간 미접속 날짜는 자동 생성하지 않으며 향후 Habit 기능에서 `기록 없음`으로 해석한다.
- 주간 숙제도 각 일자 스냅샷에 포함하되 기존 주간 reset 규칙은 변경하지 않는다.
- 현재 화면과 hook은 History를 읽지 않는다.

## 스냅샷 생성 경계

- 스냅샷 조립은 UI 컴포넌트가 아닌 history 도메인 함수가 담당한다.
- 함수 입력은 캐릭터, 숙제 상태·템플릿·비활성 기본 숙제, 메모, D-day 상태와 캡처 날짜다.
- 각 캐릭터의 보이는 숙제 목록을 계산하고 count와 progress를 만들어 순수 데이터로 반환한다.
- Store orchestration은 각 기존 store의 `getState()` 결과를 읽고 HistoryStore에 완성된 스냅샷을 저장한다.
- 기존 task store가 memo 또는 D-day store를 직접 import하지 않도록 해 순환 의존성을 방지한다.

## 영속화와 마이그레이션

- storage key `ff14-daily-board/history`를 추가한다.
- HistoryStore는 persist version 1을 사용한다.
- `normalizeHistoryState`는 알 수 없는 값, 잘못된 날짜, 잘못된 캐릭터·숙제·D-day 필드를 안전하게 제거하거나 기본값으로 정규화한다.
- History가 없는 기존 사용자는 빈 `entriesByDate`로 시작한다.
- 업데이트 첫 실행에서 task store의 `dailyResetKey`가 과거라면 reset 전에 남아 있는 마지막 상태를 해당 날짜로 캡처한다.
- 과거 데이터를 역추정해 가짜 History를 만들지 않는다.

## 백업 및 복원

- backup payload version을 5로 올린다.
- `storageKeys`에 History가 포함되므로 새 백업에는 History가 자동 포함된다.
- import validation은 version 1~5를 허용한다.
- version 1~4 백업에는 History가 없어도 정상 복원된다.
- version 5 History는 restore 후 HistoryStore migration을 거친다.
- 모든 데이터 초기화는 기존 `Object.values(storageKeys)` 경로를 통해 History도 함께 제거한다.

## 보존 정책

- History는 자동 삭제하거나 기간 제한을 적용하지 않는다.
- 삭제된 캐릭터와 삭제된 커스텀 숙제의 History도 유지한다.
- 현재 캐릭터 삭제 동작은 기존 live store 데이터만 제거하고 History는 제거하지 않는다.
- 장기 사용 시 localStorage 사용량이 증가할 수 있다. 압축, 용량 표시, 선택 삭제는 후속 작업으로 남긴다.

## 테스트

- 날짜 변경 시 reset 전에 이전 날짜 스냅샷이 생성되는지 검증한다.
- 캡처 후 live daily 데이터만 초기화되고 History는 유지되는지 검증한다.
- 주간 숙제, 다회 count, 메모, D-day와 progress가 정확히 복사되는지 검증한다.
- 커스텀 숙제와 삭제된 캐릭터 데이터가 History 안에서 독립적으로 유지되는지 검증한다.
- 여러 날 미접속 시 마지막 날짜만 생성되고 중간 날짜가 생성되지 않는지 검증한다.
- 동일 날짜 캡처가 중복 항목을 만들지 않는지 검증한다.
- 잘못된 persisted History 정규화를 검증한다.
- backup version 1~5 validation과 History 포함 export를 검증한다.
- 전체 test와 production build를 실행한다.

## 범위 밖 후속 작업

- History 조회 UI
- 통계 및 Habit 계산
- 캘린더 History 표시
- History 용량 측정, 압축, 선택 삭제 및 보존 기간 설정
- cloud sync 또는 서버 저장
