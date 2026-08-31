# Applicant Query State Design

## Scope

Implement the query-state portion of `REQUIREMENTS.md` section `2.1 지원자 데이터 조회와 초기 상태 처리` with TanStack React Query v5. The screen loads applicants through the existing injected `ApplicantApi`, displays separate loading, error, and success components, and allows one explicit API request per retry click.

The success component only reports the number of loaded applicants. Stage columns and applicant cards remain in the later `2.2` scope.

## Architecture

`main.tsx` creates one `QueryClient` outside React rendering and provides it alongside the existing applicant API instance:

```text
QueryClientProvider
  └─ ApplicantApiProvider
      └─ App
          └─ useApplicantQuery
              ├─ useApplicantApi
              └─ useQuery
```

`useApplicantQuery` lives under `src/hooks/` and is the only place that joins React Query to `ApplicantApi.getApplicants`. UI components do not import the API service, query client, query key, or localStorage implementation.

## Query Contract

```ts
const APPLICANT_QUERY_KEY = ['applicants'] as const

function useApplicantQuery() {
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

Automatic retry is disabled because one retry-button click must create exactly one new API request. Window-focus and reconnect refetches are disabled so external browser events do not create requests outside the required initial-load and user-retry paths. The query function still uses the mock API's default independent failure and delay behavior in production.

The query key is owned by the hook module. `QueryClient` is created once in `main.tsx`, outside components and `StrictMode` rendering.

## State Components

All components live directly under `src/components/`.

### LoadingComponent

- Takes no props.
- Renders an initial-loading message with `role="status"` and polite live announcement semantics.

### ErrorComponent

```ts
interface ErrorComponentProps {
  isRetrying: boolean
  onRetry(): void
}
```

- Renders a fixed user-safe failure message with `role="alert"`.
- Does not display the internal API error message.
- Calls `onRetry` once for one enabled button activation.
- Disables the button while `isRetrying` is true and changes the button label to indicate progress.

### ContentComponent

```ts
interface ContentComponentProps {
  applicants: Applicant[]
}
```

- Renders `지원자 N명을 불러왔습니다.` from `applicants.length`.
- Receives every successful response, including an empty array.
- Does not group applicants or render cards in this scope.
- The board introduced in section 2.2 will own whole-board and per-column empty states.

## App State Selection

`App.tsx` owns no request state itself. It selects one state component from the query result:

```text
isPending before any completed request -> LoadingComponent
isError -> ErrorComponent
isPending after an error and explicit retry -> ErrorComponent (retrying)
success -> ContentComponent
```

`ErrorComponent.onRetry` calls `refetch()` once. TanStack Query v5 returns to `pending` while an errored query is explicitly refetched, so `isFetchedAfterMount` distinguishes this retry from the initial pending request. `isFetching` is passed as `isRetrying`, preventing another button activation while the retry is in flight. A successful retry replaces the error state with content state; a failed retry leaves the error state available for another attempt.

## Testing

Install `@tanstack/react-query` as a production dependency. Devtools and the TanStack Query ESLint plugin are outside this scope.

Tests create a fresh `QueryClient` per case to avoid cache leakage and set logging behavior through normal test expectations rather than shared global state. They inject a controlled `ApplicantApi` through the existing Provider and verify user-visible behavior with React Testing Library.

Required tests:

- initial unresolved request displays `LoadingComponent`;
- resolved non-empty data displays the exact applicant count;
- resolved empty data reaches `ContentComponent` with a count of zero;
- rejected request displays `ErrorComponent` and retry button;
- one retry click adds exactly one API call;
- retry success transitions from error to content;
- retry failure keeps the error state and retry path;
- retry button is disabled while refetching, preventing duplicate calls;
- focus and reconnect events do not trigger extra requests;
- hook/provider integration uses the injected Applicant API and does not bypass Context.

Verification commands remain:

```bash
npm test
npm run lint
npm run build
git diff --check
```
