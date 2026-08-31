# Applicant Query State Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Load applicants through the injected API with TanStack React Query and render accessible loading, error, and success states with explicit retry behavior.

**Architecture:** `main.tsx` owns one `QueryClient` and provides it outside the existing `ApplicantApiProvider`. `useApplicantQuery` is the sole adapter between React Query and the injected API, while `App` maps query state to four presentation-only components.

**Tech Stack:** React 19, TypeScript 6, TanStack React Query v5, Vitest, React Testing Library

**Spec:** `docs/superpowers/specs/2026-08-31-applicant-query-state-design.md`

## Global Constraints

- Implement only `REQUIREMENTS.md` section 2.1; board columns and cards remain outside this scope.
- Use `@tanstack/react-query` without Devtools or its ESLint plugin.
- Set `retry`, `refetchOnWindowFocus`, and `refetchOnReconnect` to `false`.
- One retry-button activation must cause exactly one API request.
- UI code must not access localStorage or construct the applicant API.

---

### Task 1: Query adapter and application states

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `src/hooks/useApplicantQuery.ts`
- Create: `src/components/LoadingComponent.tsx`
- Create: `src/components/ErrorComponent.tsx`
- Create: `src/components/ContentComponent.tsx`
- Modify: `src/App.tsx`
- Test: `src/App.test.tsx`

**Interfaces:**
- Consumes: `useApplicantApi(): ApplicantApi` and `ApplicantApi.getApplicants(): Promise<Applicant[]>`.
- Produces: `useApplicantQuery()`, `LoadingComponent()`, `ContentComponent({ applicants }: { applicants: Applicant[] })`, and `ErrorComponent({ isRetrying, onRetry }: { isRetrying: boolean; onRetry(): void })`.

- [ ] **Step 1: Install the production dependency**

Run: `npm install @tanstack/react-query`

Expected: `package.json` and `package-lock.json` record a React Query v5 version compatible with React 19.

- [ ] **Step 2: Write failing user-visible state tests**

Create `src/App.test.tsx` with a `renderApp(getApplicants)` helper that wraps the real `App` in a fresh `QueryClientProvider` and `ApplicantApiProvider`. Use a complete `ApplicantApi` double whose `updateApplicantStage` rejects if unexpectedly called. Add tests that assert:

```tsx
expect(screen.getByRole('status', { name: '지원자 정보를 불러오는 중입니다.' })).toBeTruthy()
expect(await screen.findByText('지원자 1명을 불러왔습니다.')).toBeTruthy()
expect(await screen.findByText('지원자 0명을 불러왔습니다.')).toBeTruthy()
expect((await screen.findByRole('alert')).textContent).toContain('지원자 정보를 불러오지 못했습니다.')
expect(screen.getByRole('button', { name: '다시 시도' })).toBeTruthy()
```

Use an unresolved promise for loading, one complete `Applicant` fixture for content, `[]` for the zero-count content path, and a rejected promise for error. The production changes each test catches are respectively a missing pending branch, wrong success branch/count, an incorrect standalone empty branch, and an error branch that leaks or omits recovery UI.

- [ ] **Step 3: Run the state tests to verify RED**

Run: `npm test -- src/App.test.tsx`

Expected: FAIL because `App` renders no status, content, or error UI.

- [ ] **Step 4: Implement the query adapter and minimal state components**

Create `src/hooks/useApplicantQuery.ts`:

```ts
import { useQuery } from '@tanstack/react-query'
import { useApplicantApi } from '../contexts/useApplicantApi'

const APPLICANT_QUERY_KEY = ['applicants'] as const

export function useApplicantQuery() {
  const applicantApi = useApplicantApi()

  return useQuery({
    queryKey: APPLICANT_QUERY_KEY,
    queryFn: () => applicantApi.getApplicants(),
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  })
}
```

Implement the three components with the exact Korean messages from Step 2. `LoadingComponent` uses `role="status"`; `ErrorComponent` uses `role="alert"`; `ContentComponent` derives its count from `applicants.length` for every successful response. Update `App` to use `isFetchedAfterMount` to distinguish the initial pending request from the pending state produced by retrying an errored query. In the error or retry-pending branch, pass `isFetching` and a handler that invokes `void refetch()`.

- [ ] **Step 5: Run the state tests to verify GREEN**

Run: `npm test -- src/App.test.tsx`

Expected: PASS for loading, non-empty content, zero-count content, and error tests with no React warnings.

- [ ] **Step 6: Write failing retry and automatic-refetch tests**

Extend `src/App.test.tsx` with tests using deferred promises and sequential responses. Verify observable behavior:

```tsx
fireEvent.click(screen.getByRole('button', { name: '다시 시도' }))
expect(getApplicants).toHaveBeenCalledTimes(2)
expect(await screen.findByText('지원자 1명을 불러왔습니다.')).toBeTruthy()

expect(screen.getByRole<HTMLButtonElement>('button', { name: '다시 시도 중' }).disabled).toBe(true)

window.dispatchEvent(new Event('focus'))
window.dispatchEvent(new Event('online'))
expect(getApplicants).toHaveBeenCalledTimes(1)
```

Also verify a failed retry keeps the alert and re-enables `다시 시도`. The production changes these tests catch are duplicate retry calls, failure to transition after success, an enabled button during an in-flight retry, removal of the retry path after a second failure, and accidental automatic refetch configuration.

- [ ] **Step 7: Run retry tests to verify RED**

Run: `npm test -- src/App.test.tsx`

Expected: FAIL until the error button forwards retry state and action correctly.

- [ ] **Step 8: Complete retry behavior and refactor test setup**

Implement `ErrorComponent` with:

```tsx
<button type="button" onClick={onRetry} disabled={isRetrying}>
  {isRetrying ? '다시 시도 중' : '다시 시도'}
</button>
```

Keep deferred-promise and provider setup helpers inside the test file. Do not add test-only methods to production services.

- [ ] **Step 9: Run the complete focused test file**

Run: `npm test -- src/App.test.tsx`

Expected: PASS for all state, retry, and focus/reconnect cases with no warnings.

### Task 2: Root provider integration and repository documentation

**Files:**
- Modify: `src/main.tsx`
- Modify: `AGENTS.md`
- Test: `src/App.test.tsx`

**Interfaces:**
- Consumes: `QueryClient`, `QueryClientProvider`, existing `applicantApi`, and the Task 1 `App` tree.
- Produces: one application-lifetime QueryClient wrapping the existing Applicant API provider.

- [ ] **Step 1: Verify provider integration through the application test boundary**

Confirm `src/App.test.tsx` renders `App` through both real providers, supplies a distinct complete applicant fixture from the injected API, and asserts `지원자 1명을 불러왔습니다.`. This catches replacing Context consumption with a directly imported or newly constructed API.

- [ ] **Step 2: Run the integration test before root configuration**

Run: `npm test -- src/App.test.tsx`

Expected: PASS, demonstrating the exact provider composition required by the production root. `main.tsx` is composition-root configuration, so its matching declarative wrapper is verified later by type-check and build rather than framework mocking.

- [ ] **Step 3: Install the application-lifetime QueryClient provider**

In `src/main.tsx`, create `const queryClient = new QueryClient()` alongside the existing service graph and render:

```tsx
<QueryClientProvider client={queryClient}>
  <ApplicantApiProvider api={applicantApi}>
    <App />
  </ApplicantApiProvider>
</QueryClientProvider>
```

Keep the instance outside `StrictMode` and component rendering.

- [ ] **Step 4: Update the documented current structure**

Update `AGENTS.md` so `src/main.tsx` mentions both application-lifetime providers, `src/App.tsx` describes query-state selection, and add existing `src/hooks/` and `src/components/` rows with their actual responsibilities.

- [ ] **Step 5: Run focused and full verification**

Run:

```bash
npm test -- src/App.test.tsx
npm test
npm run lint
npm run build
git diff --check
```

Expected: every command exits 0; all prior mock API tests remain green; the production bundle type-checks and builds.
