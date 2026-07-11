# 캐릭터 사진 편집 트랜잭션 설계

## 문제

- 기존 캐릭터 사진 편집기는 부모 프로필 폼보다 먼저 이미지 저장소를 변경한다.
- 새 사진 편집 저장 시 기존 사진을 즉시 삭제하고 draft의 image ID만 바꾼다.
- 이후 부모 프로필 폼을 취소하면 캐릭터 store는 기존 image ID를 유지하지만 실제 기존 Blob은 이미 삭제되어 프로필 사진이 초기화된다.
- 사진 삭제도 부모 프로필 저장 전에 실제 Blob을 삭제해 같은 문제가 발생한다.

## 목표

- 프로필 `수정 저장` 전 사진 변경을 임시 상태로 취급한다.
- 부모 프로필 취소 시 기존 캐릭터 데이터와 기존 사진을 모두 유지한다.
- 부모 프로필 저장 성공 후에만 교체되거나 삭제된 기존 사진을 정리한다.
- 새 캐릭터 추가와 Home Bottom Sheet의 사진 추가도 같은 규칙을 사용한다.

## 이미지 트랜잭션 상태

```ts
type CharacterImageTransaction = {
  initialImageId?: string;
  currentImageId?: string;
  temporaryImageIds: string[];
};
```

- `initialImageId`는 폼이 열릴 때 캐릭터 store가 참조하던 사진이다.
- `currentImageId`는 현재 draft가 미리보기로 사용하는 사진이다.
- `temporaryImageIds`는 현재 폼에서 새로 생성했지만 아직 프로필에 커밋되지 않은 사진이다.

## 사진 선택 및 교체

- 사진 위치 조정 창에서 저장하면 새 Blob을 IndexedDB에 임시 저장한다.
- 기존 커밋 사진은 삭제하지 않는다.
- 새 image ID를 draft의 `currentImageId`로 바꾼다.
- 같은 폼에서 다시 사진을 선택하면 더 이상 사용하지 않는 이전 임시 image ID를 즉시 삭제한다.
- 위치 조정 창의 취소는 새 Blob을 만들지 않고 위치 조정 창만 닫는다.

## 사진 삭제

- 기존 커밋 사진 삭제 버튼은 draft의 `currentImageId`만 비운다.
- 부모 프로필 저장 전에는 기존 Blob을 삭제하지 않는다.
- 삭제 대상이 임시 사진이면 해당 임시 Blob은 즉시 정리한다.
- 확인 문구는 실제 삭제가 프로필 저장 시 확정된다는 의미로 맞춘다.

## 부모 프로필 저장

- 이름, 서버, 대표 상태와 최종 `currentImageId`를 먼저 캐릭터 store에 저장한다.
- store 저장이 성공한 후 `initialImageId`와 최종 ID가 다르면 기존 Blob을 삭제한다.
- 최종 선택된 임시 image ID는 커밋된 사진이므로 삭제하지 않는다.
- 최종 선택되지 않은 임시 Blob은 모두 삭제한다.
- 새 캐릭터는 initial image가 없으므로 최종 임시 이미지만 커밋한다.

## 부모 프로필 취소

- 폼에서 생성된 모든 임시 Blob을 삭제한다.
- 기존 `initialImageId` Blob은 삭제하지 않는다.
- 캐릭터 store를 변경하지 않고 폼을 닫는다.
- 이름, 서버, 대표 상태와 사진 모두 편집 전 상태로 남는다.

## 컴포넌트 경계

- 이미지 트랜잭션 계산은 UI와 IndexedDB에서 분리된 순수 모듈로 작성한다.
- `CharacterForm`이 initial, current, temporary image 수명주기를 소유한다.
- `CharacterImagePicker`는 새 Blob을 저장하고 새 image ID를 알리지만 기존 image ID를 직접 삭제하지 않는다.
- `CharacterManager`와 `CharacterBottomSheet`의 기존 submit/cancel 역할은 유지한다.
- 다른 캐릭터가 같은 image ID를 공유하지 않는다는 현재 데이터 계약을 유지한다.

## 오류 처리

- 임시 이미지 저장 실패 시 기존 사진과 draft를 변경하지 않고 기존 오류 메시지를 표시한다.
- 임시 이미지 정리 실패는 프로필 데이터 저장을 되돌리지 않는다. 사용자가 보는 프로필 일관성을 우선하고 고아 Blob 정리는 후속 진단 대상으로 남긴다.
- 부모 저장 함수가 실패하면 기존 사진을 삭제하지 않는다.

## 테스트

- 기존 사진 A에서 임시 사진 B로 바꾼 뒤 취소하면 B만 삭제하고 A를 유지하는지 검증한다.
- A에서 B, 다시 C를 선택하면 B를 정리하고 C만 임시 상태로 남기는지 검증한다.
- A 삭제를 선택한 뒤 취소하면 A가 유지되는지 검증한다.
- A를 B로 바꾸고 저장하면 A를 삭제하고 B를 유지하는지 검증한다.
- 새 캐릭터 B를 취소하면 B를 삭제하는지 검증한다.
- 일반 이름·서버 편집 취소가 폼을 닫고 store를 변경하지 않는지 브라우저에서 확인한다.
- 전체 test와 production build를 실행한다.
