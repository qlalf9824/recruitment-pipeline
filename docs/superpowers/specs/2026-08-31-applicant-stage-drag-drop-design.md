# 지원자 단계 드래그 앤 드롭 설계

## 목표

`REQUIREMENTS.md` 2.3의 첫 구현으로 지원자 카드를 현재 단계에서 다른 채용 단계 컬럼으로 드래그해 저장할 수 있게 한다. 이번 범위는 포인터 기반 단계 간 이동과 저장 성공 후 화면 동기화까지만 포함한다.

## 범위

### 포함

- `@dnd-kit/react` 0.5.x 도입
- 지원자 카드를 draggable source로 연결
- 다섯 단계 컬럼 전체를 droppable target으로 연결
- 다른 단계에 드롭했을 때 `ApplicantApi.updateApplicantStage(id, stage)` 호출
- 저장 성공 후 `applicants` query 무효화 및 재조회
- 같은 단계, 보드 밖, 취소된 드롭 무시
- 저장 중인 동일 카드의 추가 드래그 차단
- 드래그 중인 카드와 현재 drop target의 시각적 피드백
- 성공 후 새로고침 시 localStorage에 저장된 단계 유지 검증

### 제외

- 같은 컬럼 내부 카드 순서 변경
- 단계 단위 키보드 이동
- 낙관적 업데이트
- 저장 실패 안내와 롤백 UI
- 연속 이동 경쟁 상태 처리

키보드 이동은 후속 작업에서 `Space → 좌우 방향키 → Enter`가 단계 단위로 동작하도록 별도로 설계한다. 이번 구현에서는 기본 센서 동작을 완료 조건으로 주장하거나 테스트하지 않는다.

## 라이브러리 선택

`@dnd-kit/react`를 사용하고 sortable 기능은 사용하지 않는다. 현재 기능은 순서 변경이 아니라 하나의 draggable을 다섯 droppable 컬럼 사이에서 이동하는 문제이므로 `DragDropProvider`, `useDraggable`, `useDroppable`만 사용한다.

라이브러리 API는 프로젝트 전용 컴포넌트 경계에 제한한다.

- `ApplicantBoard`: `DragDropProvider`와 drag-end orchestration
- `DraggableApplicantCard`: `useDraggable`
- `BoardColumn`: `useDroppable`

서비스와 query hook은 dnd-kit 타입을 알지 않는다.

## 컴포넌트와 데이터 흐름

```text
ContentComponent
  ├─ useUpdateApplicantStageMutation
  └─ ApplicantBoard
       ├─ DragDropProvider
       ├─ BoardColumn(useDroppable: stage)
       └─ DraggableApplicantCard(useDraggable: applicant.id)
            └─ ApplicantCard

drop
  → ApplicantBoard가 source id와 target stage 검증
  → ContentComponent의 onMoveApplicant 호출
  → updateApplicantStage mutation
  → ApplicantApi가 localStorage 저장
  → applicants query invalidate
  → getApplicants 재조회
  → 새 단계 컬럼에 카드 렌더
```

### Query 경계

`APPLICANT_QUERY_KEY`를 `useApplicantQuery.ts`에서 export해 조회와 mutation이 같은 key를 사용하게 한다. `useUpdateApplicantStageMutation`은 주입된 `ApplicantApi`를 사용하고 성공 시에만 `invalidateQueries({ queryKey: APPLICANT_QUERY_KEY })`를 호출한다.

이번 범위에서는 캐시를 drop 직후 직접 변경하지 않는다. 따라서 저장 응답 전과 실패 후에는 카드가 기존 컬럼에 유지된다.

### Drag 식별자

- draggable id: `Applicant.id`
- droppable id: `ApplicantStage`
- 현재 단계: `ApplicantBoard`가 전달받은 `applicants`에서 draggable id로 조회

drop 처리 순서:

1. 취소된 이벤트이면 종료한다.
2. source 또는 target이 없으면 종료한다.
3. source id에 해당하는 지원자가 없으면 종료한다.
4. target id가 `ApplicantStage`가 아니면 종료한다.
5. 현재 단계와 target 단계가 같으면 종료한다.
6. `onMoveApplicant(applicantId, targetStage)`를 한 번 호출한다.

## 상호작용과 시각 상태

- 카드 전체를 포인터 drag source로 사용하고 `cursor-grab`, drag 중 `cursor-grabbing`을 표시한다.
- drag 중 원본 카드의 불투명도를 낮춘다.
- drop 가능한 컬럼 위에서는 border/ring을 강조한다.
- 저장 중인 카드에는 `aria-disabled="true"`를 제공하고 같은 카드의 drag를 비활성화한다.
- 빈 컬럼의 빈 상태 문구가 있어도 컬럼 section 전체가 drop target이므로 drop할 수 있다.
- 보드의 기존 가로 스크롤, 시맨틱 section/list/article 구조, 전체·컬럼 빈 상태를 유지한다.

## 오류 처리

- API 실패 시 query를 무효화하지 않는다.
- 낙관적 캐시 변경이 없으므로 카드 위치는 기존 단계에 남는다.
- 실패 메시지와 롤백 피드백은 `REQUIREMENTS.md` 2.4에서 구현한다.
- 같은 단계와 보드 밖 drop은 정상적인 무동작으로 처리하며 API 오류를 만들지 않는다.

## 테스트 전략

### Mutation hook

- 올바른 `id`, `stage`로 `updateApplicantStage`를 한 번 호출한다.
- 성공하면 `APPLICANT_QUERY_KEY`를 무효화한다.
- 실패하면 query를 무효화하지 않고 오류를 호출자에게 전달한다.

### Board orchestration

dnd-kit DOM 이벤트 자체에 의존하지 않도록 drag-end 판단을 `resolveApplicantStageDrop` 순수 함수로 분리한다.

- 다른 단계 drop은 `{ applicantId, stage }`를 반환한다.
- 같은 단계, 잘못된 target, 없는 applicant, 보드 밖, 취소는 `null`을 반환한다.
- provider handler가 유효한 결과에서 callback을 한 번 호출한다.

### Component behavior

- 다섯 컬럼은 droppable 연결 후에도 기존 순서와 건수를 유지한다.
- draggable wrapper 도입 후에도 카드가 정확히 한 번 렌더된다.
- 저장 중인 카드만 비활성 상태를 받는다.
- drag/drop 시각 class는 동작 테스트의 주요 계약으로 삼지 않는다.

### Integration and persistence

- mutation 성공 후 활성 applicant query가 재조회되어 이동한 카드가 목적지 컬럼에 표시된다.
- 저장 성공 후 새 서비스 graph로 다시 조회해도 변경된 단계가 유지된다.
- 기존 mock API storage 테스트를 재사용하고, UI 통합 테스트는 다른 지원자가 변경되지 않는지 확인한다.

## Acceptance Criteria

- 카드가 다른 단계 컬럼에 drop되면 update API가 정확히 한 번 호출된다.
- 같은 단계 또는 보드 밖에 drop하면 update API가 호출되지 않는다.
- 저장 응답 전에는 카드가 기존 컬럼에 유지된다.
- 저장 성공 후 카드는 목적지 컬럼에 한 번만 표시되고 기존 컬럼에서 사라진다.
- 카드의 현재 단계 문구가 목적지 컬럼과 일치한다.
- 다른 지원자의 단계와 위치는 변경되지 않는다.
- 저장 성공 후 새로고침에 해당하는 재조회에서도 이동 결과가 유지된다.
- 저장 중 같은 카드를 다시 이동해 중복 요청을 만들 수 없다.
- 기존 로딩·오류·빈 상태·보드 전용 가로 스크롤이 유지된다.
