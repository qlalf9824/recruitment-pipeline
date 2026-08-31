# Board-Owned Query and Job Options Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 검색 중 필터 포커스를 유지하도록 지원자 조회 상태를 보드가 소유하고, 직무 선택지를 성공 전용 mock API로 분리한다.

**Architecture:** `App`은 `Toaster`와 `ContentComponent`만 렌더링하고, `ContentComponent`가 필터 상태를 소유한다. `ApplicantBoard`가 검색어별 applicant query와 보드 내부 상태 표시를 담당하며, `JobFilter`는 별도 `useJobOptionsQuery`를 통해 seed metadata를 조회한다.

**Tech Stack:** React 19, TypeScript, TanStack React Query 5, Vitest, Testing Library, Tailwind CSS

**Spec:** `docs/superpowers/specs/2026-09-01-board-owned-query-and-job-options-design.md`

## Global Constraints

- 직무 선택지를 이용한 실제 지원자 필터링은 이번 범위에서 제외한다.
- 직무 선택지 API에는 실패와 지연 시뮬레이션을 적용하지 않는다.
- 검색 조회는 localStorage 데이터를 변경하지 않는다.
- 로딩·오류·빈 상태에서도 다섯 채용 단계 헤더를 유지한다.
- 기존 단계 이동, 낙관적 rollback, snackbar, 가로 스크롤을 유지한다.

---

### Task 1: 성공 전용 직무 선택지 API

**Files:**
- Modify: `src/services/applicantApi.test.ts`
- Modify: `src/services/applicantApi.ts`

**Interfaces:**
- Consumes: `createApplicantSeed(): Applicant[]`
- Produces: `ApplicantApi.getJobOptions(): Promise<string[]>`

- [ ] **Step 1: Write the failing API tests**

```ts
it('returns unique seed job options in first-seen order', async () => {
  const api = createApplicantApi({ storage, behavior })

  await expect(api.getJobOptions()).resolves.toEqual([
    'Frontend Engineer',
    'Backend Engineer',
    'Product Designer',
    'Data Analyst',
    'Product Manager',
  ])
})

it('gets job options without behavior or storage dependencies', async () => {
  const api = createApplicantApi({ storage, behavior })

  await api.getJobOptions()

  expect(behavior.resolve).not.toHaveBeenCalled()
  expect(behavior.wait).not.toHaveBeenCalled()
  expect(storage.load).not.toHaveBeenCalled()
  expect(storage.save).not.toHaveBeenCalled()
})
```

- [ ] **Step 2: Run the API tests and verify RED**

Run: `npm test -- src/services/applicantApi.test.ts`

Expected: FAIL because `getJobOptions` is absent from `ApplicantApi` and the returned object.

- [ ] **Step 3: Add the minimal API implementation**

```ts
export interface ApplicantApi {
  getJobOptions(): Promise<string[]>
  // existing methods remain
}

async getJobOptions() {
  return [
    ...new Set(createApplicantSeed().map((applicant) => applicant.position)),
  ]
},
```

- [ ] **Step 4: Run the API tests and verify GREEN**

Run: `npm test -- src/services/applicantApi.test.ts`

Expected: PASS.

### Task 2: 직무 선택지 query와 필터 연결

**Files:**
- Create: `src/hooks/useJobOptionsQuery.ts`
- Create: `src/hooks/useJobOptionsQuery.test.tsx`
- Modify: `src/components/JobFilter.tsx`
- Modify: `src/components/ContentComponent.test.tsx`

**Interfaces:**
- Consumes: `ApplicantApi.getJobOptions(): Promise<string[]>`
- Produces: `useJobOptionsQuery()` with key `['applicant-job-options']`; `JobFilter` no longer accepts `jobs`

- [ ] **Step 1: Write failing hook and UI tests**

```tsx
it('loads job options from the applicant API', async () => {
  const getJobOptions = vi.fn(async () => ['Frontend Engineer'])
  const { result } = renderHook(() => useJobOptionsQuery(), { wrapper })

  await waitFor(() => expect(result.current.isSuccess).toBe(true))
  expect(result.current.data).toEqual(['Frontend Engineer'])
})

it('shows job options returned by the job-options API', async () => {
  renderContent({ getJobOptions: vi.fn(async () => ['QA Engineer']) })

  fireEvent.click(screen.getByRole('button', { name: '직무 전체' }))
  expect(await screen.findByRole('checkbox', { name: 'QA Engineer' })).toBeTruthy()
})
```

- [ ] **Step 2: Run tests and verify RED**

Run: `npm test -- src/hooks/useJobOptionsQuery.test.tsx src/components/ContentComponent.test.tsx`

Expected: FAIL because the hook is missing and `JobFilter` still consumes applicant-derived jobs.

- [ ] **Step 3: Implement the hook and connect `JobFilter`**

```ts
export const JOB_OPTIONS_QUERY_KEY = ['applicant-job-options'] as const

export const useJobOptionsQuery = () => {
  const applicantApi = useApplicantApi()
  return useQuery({
    queryKey: JOB_OPTIONS_QUERY_KEY,
    queryFn: () => applicantApi.getJobOptions(),
    staleTime: Infinity,
    retry: false,
  })
}
```

`JobFilter` calls the hook and maps `data ?? []`; its public props remain only `selectedJobs` and `onChange`.

- [ ] **Step 4: Run tests and verify GREEN**

Run: `npm test -- src/hooks/useJobOptionsQuery.test.tsx src/components/ContentComponent.test.tsx`

Expected: PASS.

### Task 3: Board-owned applicant query and board state UI

**Files:**
- Modify: `src/hooks/useApplicantQuery.ts`
- Modify: `src/components/ApplicantBoard.test.tsx`
- Modify: `src/components/ApplicantBoard.tsx`

**Interfaces:**
- Consumes: `useApplicantQuery(searchTerm: string)` and `useUpdateApplicantStageMutation()`
- Produces: `ApplicantBoard({ searchTerm: string })` that owns loading, error, retry, empty, success, and stage movement

- [ ] **Step 1: Write failing board-state tests**

```tsx
it('keeps five headers and shows one loading message during the initial request', () => {
  renderBoard({ getApplicants: () => new Promise(() => undefined) })
  expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(5)
  expect(screen.getByRole('status', { name: '지원자 정보를 불러오는 중입니다.' })).toBeTruthy()
})

it('keeps five headers and retries from an error inside the board', async () => {
  const getApplicants = vi.fn().mockRejectedValueOnce(new Error('private')).mockResolvedValueOnce([applicant])
  renderBoard({ getApplicants })
  fireEvent.click(await screen.findByRole('button', { name: '다시 시도' }))
  expect(await screen.findByRole('article', { name: 'Kim Codex 지원자' })).toBeTruthy()
})
```

Add assertions for total empty and searched-empty messages, `aria-busy`, drag delivery, mutation pending ID, and existing drop-animation configuration.

- [ ] **Step 2: Run board tests and verify RED**

Run: `npm test -- src/components/ApplicantBoard.test.tsx`

Expected: FAIL because `ApplicantBoard` still requires applicants and callbacks instead of querying.

- [ ] **Step 3: Preserve previous query data during search transitions**

```ts
return useQuery({
  queryKey: [...APPLICANT_QUERY_KEY, searchTerm],
  queryFn: () => applicantApi.getApplicants({ searchTerm }),
  placeholderData: (previousData) => previousData,
  retry: false,
  refetchOnWindowFocus: false,
  refetchOnReconnect: false,
})
```

- [ ] **Step 4: Implement query and state rendering in `ApplicantBoard`**

Use a five-column shell in every state. Initial pending renders one `role="status"` body, errors render one safe `role="alert"` body with retry, and empty success renders one shared empty body. Successful data retains the existing `DragDropProvider`, columns, mutation handling, and disabled moving applicant state.

- [ ] **Step 5: Run board tests and verify GREEN**

Run: `npm test -- src/components/ApplicantBoard.test.tsx src/hooks/useUpdateApplicantStageMutation.test.tsx`

Expected: PASS.

### Task 4: Stable content ownership and minimal App

**Files:**
- Modify: `src/components/ContentComponent.test.tsx`
- Modify: `src/components/ContentComponent.tsx`
- Modify: `src/App.test.tsx`
- Modify: `src/App.tsx`
- Modify: `AGENTS.md`

**Interfaces:**
- Consumes: `ApplicantBoard({ searchTerm })`, `ApplicantFilter` and query provider context
- Produces: prop-free `ContentComponent`; `App` with only `Toaster` and `ContentComponent`

- [ ] **Step 1: Write failing focus and ownership tests**

```tsx
it('keeps the same focused search input while a searched request is pending', async () => {
  renderApp(getApplicants)
  const search = await screen.findByRole('searchbox', { name: '지원자 이름 검색' })
  search.focus()
  fireEvent.change(search, { target: { value: 'Kim' } })
  expect(screen.getByRole('searchbox', { name: '지원자 이름 검색' })).toBe(search)
  expect(document.activeElement).toBe(search)
})
```

Update content tests to render `<ContentComponent />`, assert title/filter/board order, and verify controlled search state is passed to the board through observable API calls.

- [ ] **Step 2: Run integration tests and verify RED**

Run: `npm test -- src/App.test.tsx src/components/ContentComponent.test.tsx`

Expected: FAIL because `App` swaps the entire content on pending and `ContentComponent` requires applicant/search props.

- [ ] **Step 3: Move state into `ContentComponent` and simplify `App`**

```tsx
export function ContentComponent() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedJobs, setSelectedJobs] = useState<string[]>([])
  return (
    <main>
      <h1>지원자 관리</h1>
      <ApplicantFilter searchTerm={searchTerm} onSearchTermChange={setSearchTerm} selectedJobs={selectedJobs} onSelectedJobsChange={setSelectedJobs} />
      <ApplicantBoard searchTerm={searchTerm} />
    </main>
  )
}
```

```tsx
function App() {
  return <><Toaster position="bottom-center" richColors /><ContentComponent /></>
}
```

Update `AGENTS.md` current responsibilities so they match the resulting files and ownership.

- [ ] **Step 4: Run integration tests and verify GREEN**

Run: `npm test -- src/App.test.tsx src/components/ContentComponent.test.tsx`

Expected: PASS with the same search input DOM node focused during the pending searched request.

### Task 5: Full regression verification

**Files:**
- Verify only; fix only failures caused by Tasks 1–4 in their owning files.

**Interfaces:**
- Consumes: completed implementation
- Produces: verified repository state

- [ ] **Step 1: Run the full test suite**

Run: `npm test`

Expected: all tests pass with no warnings.

- [ ] **Step 2: Run lint**

Run: `npm run lint`

Expected: exit code 0.

- [ ] **Step 3: Run production build**

Run: `npm run build`

Expected: TypeScript and Vite build exit code 0.

- [ ] **Step 4: Check diff hygiene**

Run: `git diff --check`

Expected: no whitespace errors.
