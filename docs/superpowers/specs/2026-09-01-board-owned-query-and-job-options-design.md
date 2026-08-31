# 보드 소유 지원자 조회와 직무 선택지 API 설계

## 배경

현재 `App`이 검색어별 applicant query 상태를 기준으로 로딩·오류·콘텐츠 화면을 교체한다. 검색어가 변경되면 새 query가 pending 상태가 되고 `ContentComponent` 전체가 언마운트되어 검색 input의 포커스가 사라진다.

필터 UI는 지원자 응답에서 직무 목록을 추출하므로 지원자 조회를 보드 내부로 옮기면 직무 선택지 데이터 원천도 분리해야 한다.

## 목표

- 검색어가 변경되어도 타이틀과 필터 UI를 계속 마운트해 input 포커스를 유지한다.
- `App`은 application-level snackbar와 콘텐츠 진입점만 렌더링한다.
- 지원자 API 호출과 조회 상태 표시는 `ApplicantBoard` 내부에서 처리한다.
- 로딩·오류·전체 빈 상태·검색 빈 상태에서도 다섯 컬럼 헤더를 유지한다.
- 직무 선택지는 별도 mock API에서 가져오고 지원자 검색 결과와 독립적으로 유지한다.
- 조회와 필터링은 localStorage의 지원자 데이터를 변경하지 않는다.

## 범위

### 포함

- `App`의 query 상태 분기 제거
- `ContentComponent`의 검색어·선택 직무 상태 소유
- `ApplicantBoard`의 applicant query와 재시도 소유
- 검색 query 전환 중 이전 결과 유지
- 보드 내부 초기 로딩·오류·빈 상태 표시
- `ApplicantApi.getJobOptions()` 추가
- 직무 선택지 전용 query hook 추가
- 관련 API·hook·App·Content·Board 테스트 변경

### 제외

- 선택 직무를 applicant API에 전달하는 실제 직무 필터링
- 직무 선택지 API의 실패·지연 시뮬레이션
- 검색 debounce
- 단계 단위 키보드 이동

## 컴포넌트와 데이터 소유권

```text
App
├─ Toaster
└─ ContentComponent
   ├─ title
   ├─ ApplicantFilter
   │  ├─ ApplicantSearch
   │  └─ JobFilter
   │     └─ useJobOptionsQuery
   └─ ApplicantBoard
      ├─ useApplicantQuery(searchTerm)
      ├─ stage headers
      └─ success / loading / error / empty body
```

### `App`

`App`은 `<Toaster />`와 `<ContentComponent />`만 렌더링한다. applicant query를 호출하거나 조회 상태를 분기하지 않는다.

### `ContentComponent`

props 없이 렌더링되며 다음 UI 상태를 소유한다.

- `searchTerm: string`
- `selectedJobs: string[]`

타이틀, `ApplicantFilter`, `ApplicantBoard` 순서로 렌더링한다. `searchTerm`과 변경 함수를 필터에 전달하고 `searchTerm`을 보드에 전달한다. 직무 선택 상태는 이번 범위에서 UI에만 반영한다.

### `ApplicantFilter`와 `JobFilter`

직무 선택지 조회는 직무 드롭다운 경계에서 수행한다. `JobFilter`가 `useJobOptionsQuery`를 사용해 항상 성공하는 직무 목록을 받는다. `ApplicantFilter`와 `ContentComponent`는 지원자 응답에 접근하지 않는다.

### `ApplicantBoard`

`searchTerm`을 받아 `useApplicantQuery(searchTerm)`을 호출한다. 보드가 query의 `data`, `isPending`, `isError`, `isFetching`, `refetch`를 해석하고 다음 상태를 표시한다.

| 상태 | 컬럼 헤더 | 카드 영역 |
| --- | --- | --- |
| 최초 로딩 | 다섯 개 표시, 건수 0 | `지원자 정보를 불러오는 중입니다.` 한 번 표시 |
| 검색 재조회 | 이전 결과 유지 | 이전 카드 유지, 보드에 `aria-busy="true"` 적용 |
| 오류 | 다섯 개 표시, 건수 0 | 안전한 오류 문구와 `다시 시도` 버튼 표시 |
| 전체 0건 | 다섯 개 표시, 건수 0 | `지원자가 없습니다` 한 번 표시 |
| 검색 결과 0건 | 다섯 개 표시, 건수 0 | `검색 조건에 맞는 지원자가 없습니다.` 한 번 표시 |
| 성공 | 단계별 실제 건수 | 단계별 카드 또는 컬럼 빈 상태 표시 |

오류 재시도 중에는 버튼을 비활성화하고 기존 오류 상태를 유지한다.

## API 계약

### 지원자 검색

```ts
interface GetApplicantsParams {
  searchTerm?: string
}

getApplicants(
  params?: GetApplicantsParams,
  behaviorOptions?: MockApiBehaviorOptions,
): Promise<Applicant[]>
```

API는 저장소에서 읽은 데이터를 복제하고, trim한 검색어를 이름에 부분 일치시켜 새 배열을 반환한다. 영문 비교는 대소문자를 구분하지 않는다. 빈 검색어는 전체 복제본을 반환한다. 조회 중 `storage.save`를 호출하지 않는다.

### 직무 선택지

```ts
getJobOptions(): Promise<string[]>
```

`getJobOptions`는 mock seed의 `position`을 최초 등장 순서로 중복 제거해 새 배열로 반환한다. 항상 즉시 성공하며 `MockApiBehaviorService`의 랜덤 실패·지연을 사용하지 않는다. 저장소를 읽거나 변경하지 않는다.

직무 선택지는 현재 mock dataset의 metadata로 간주한다. 이후 동적 직무 관리가 필요해지면 별도 저장소 또는 API resource로 확장한다.

## React Query

### 지원자 query

- base key: `['applicants']`
- search key: `['applicants', searchTerm]`
- 검색어 변경 시 이전 데이터를 placeholder로 유지한다.
- retry, focus refetch, reconnect refetch는 기존과 같이 비활성화한다.

단계 mutation은 base key 하위의 모든 검색 query cache를 snapshot하고 낙관적으로 갱신한다. 실패하면 각 query key의 snapshot을 복원하고, settled 후 base key를 무효화한다.

### 직무 선택지 query

- key: `['applicant-job-options']`
- query function: `applicantApi.getJobOptions`
- API가 항상 성공하므로 별도 오류·재시도 UI를 두지 않는다.
- application lifetime 동안 변경되지 않는 metadata이므로 `staleTime: Infinity`를 사용한다.

## 접근성

- 검색 input은 query 상태와 무관하게 DOM에 유지한다.
- 보드 조회 중 보드 region에 `aria-busy="true"`를 적용한다.
- 최초 로딩 문구는 `role="status"`와 polite live semantics를 사용한다.
- 오류 문구는 `role="alert"`를 사용한다.
- 다시 시도 버튼은 재시도 중 disabled 상태와 `다시 시도 중` 이름을 제공한다.
- 다섯 단계 헤더와 각 단계 region label은 모든 조회 상태에서 유지한다.

## 테스트 전략

### API

- 이름 부분 검색과 영문 대소문자 무시
- 빈 문자열·공백 검색 시 전체 반환
- 검색 전후 저장 데이터 불변과 `storage.save` 미호출
- 직무 선택지 중복 제거·순서 유지
- 직무 선택지 조회가 behavior와 storage를 호출하지 않음

### Query hook

- 검색어가 API params와 query key에 포함됨
- 검색어 변경 중 이전 데이터 유지
- 직무 query가 고정 key와 무기한 fresh 설정을 사용

### UI 통합

- `App`이 Toaster와 Content만 렌더링
- 최초 로딩 중 타이틀·필터·다섯 헤더와 보드 내부 로딩 표시
- 검색어 변경 중 input 포커스 유지
- 검색 성공 후 올바른 카드 표시
- 오류 시 보드 내부 오류와 재시도 동작
- 전체 빈 상태와 검색 빈 상태 구분
- 단계 이동 성공·실패·낙관적 rollback 회귀 유지

## 완료 기준

- 검색어 입력 전후 동일한 search input DOM node가 유지되고 focus가 사라지지 않는다.
- 지원자 query의 로딩·오류가 전체 화면을 대체하지 않는다.
- 로딩·오류·빈 상태에서 다섯 컬럼 헤더가 표시된다.
- 직무 드롭다운은 별도 성공 전용 API의 선택지를 사용한다.
- 검색·직무 선택지 조회는 저장 데이터를 변경하지 않는다.
- 기존 단계 이동, rollback, snackbar, 가로 스크롤 동작이 유지된다.
