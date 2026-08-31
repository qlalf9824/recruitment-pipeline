# Applicant Mock API Design

## Scope

Build an in-app TypeScript applicant API for list reads and stage updates. The implementation uses immutable seed data until the first successful change, then persists the complete applicant array in `localStorage`. It separates domain data, persistence, API behavior simulation, API orchestration, and React delivery through dependency injection.

`Applicant` contains only fields needed by the board. `resume` and `memo` are removed; a detail model and detail API are deferred until `REQUIREMENTS.md` section `2.6` is designed. Board UI, optimistic-update state, search, and detail rendering remain outside this scope.

This design supports `REQUIREMENTS.md` sections `2.1`, `2.3`, `2.4`, and the deterministic verification expectations in `3.4`.

## Architecture

Application composition happens once, before React renders:

```text
main.tsx
  ├─ createLocalStorageApplicantStorage(() => window.localStorage)
  ├─ createMockApiBehaviorService()
  └─ createApplicantApi({ storage, behavior })
       ↓
ApplicantApiProvider
       ↓
useApplicantApi()
       ↓
UI components
```

The applicant API depends only on injected contracts:

```text
ApplicantApi -> ApplicantStorage interface
             -> MockApiBehaviorService interface
```

- `applicantSeed.ts` owns immutable initial list data and returns fresh copies.
- `applicantStorage.ts` owns the persistence contract, storage-data error, runtime validation, and the localStorage-backed implementation factory.
- `mockApiError.ts` owns public API status/error constants, their derived union types, and `MockApiError`.
- `mockApiBehavior.ts` owns outcome/delay constants, derived union types, random resolution, and waiting.
- `applicantApi.ts` owns the API contract and factory. It validates requests, chooses seed or stored data, applies error precedence, maps dependency errors, and persists successful changes.
- `ApplicantApiContext.ts`, `ApplicantApiProvider.tsx`, and `useApplicantApi.ts` transport an already-created `ApplicantApi`; they never construct dependencies. Provider and hook exports are separated to satisfy the repository's Fast Refresh rule.
- `main.tsx` is the composition root and creates one API instance outside React rendering. React StrictMode rerenders therefore do not recreate the service.
- UI components import only `useApplicantApi`, never seed, storage, behavior, or API factories.

## Domain Model

```ts
export interface Applicant {
  id: string;
  name: string;
  position: string;
  appliedAt: string;
  stage: ApplicantStage;
}
```

`ApplicantDetail` is intentionally not defined in this scope. The later detail design will decide whether details extend an applicant response or live as a separately keyed resource.

`APPLICANT_STAGE` remains the source of the `ApplicantStage` union. A shared `isApplicantStage(value)` runtime guard supports storage and API validation.

## Const-derived Public Types

Values used by callers are defined once as `as const` objects and unions are derived from them. TypeScript enums and duplicated string-literal unions are not used.

```ts
export const MOCK_API_STATUS = {
  BAD_REQUEST: 400,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
} as const;

export const MOCK_API_ERROR_CODE = {
  INVALID_STAGE: 'INVALID_STAGE',
  APPLICANT_NOT_FOUND: 'APPLICANT_NOT_FOUND',
  STORAGE_DATA_INVALID: 'STORAGE_DATA_INVALID',
  SIMULATED_FAILURE: 'SIMULATED_FAILURE',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

export const MOCK_API_OUTCOME = {
  RANDOM: 'random',
  SUCCESS: 'success',
  FAILURE: 'failure',
} as const;

export const MOCK_API_DELAY_MODE = {
  RANDOM: 'random',
  NONE: 'none',
} as const;
```

`MockApiStatus`, `MockApiErrorCode`, `MockApiOutcome`, and `MockApiDelayMode` are indexed-access unions derived from these objects. `MockApiDelay` is `MockApiDelayMode | number`.

## Injected Contracts

```ts
export interface ApplicantStorage {
  load(): Applicant[] | null;
  save(applicants: Applicant[]): void;
}

export interface ResolvedMockApiBehavior {
  shouldFail: boolean;
  delayMs: number;
}

export interface MockApiBehaviorService {
  resolve(options?: MockApiBehaviorOptions): ResolvedMockApiBehavior;
  wait(delayMs: number): Promise<void>;
}

export interface ApplicantApi {
  getApplicants(options?: MockApiBehaviorOptions): Promise<Applicant[]>;
  updateApplicantStage(
    id: string,
    stage: ApplicantStage,
    options?: MockApiBehaviorOptions,
  ): Promise<Applicant>;
}
```

`createApplicantApi({ storage, behavior })` returns closures implementing `ApplicantApi`. Tests inject in-memory fakes without browser storage or global randomness. The default behavior factory accepts an optional random-number function, allowing probability tests without mocking `Math.random`.

## Seed and Persistence

- If the storage key is absent, reads return a fresh seed copy without writing.
- The first successful update changes a seed copy and writes the complete resulting array.
- Once stored data exists, all later reads and updates use it.
- Failed updates never call `save`.
- Seed arrays and objects are never returned by reference.
- Corrupt stored data is never overwritten or silently replaced with seed data.
- The localStorage implementation receives a `() => Storage` getter through its factory rather than reading the global directly. It evaluates the getter only inside `load` or `save`, so blocked browser storage becomes an API operation error instead of preventing application bootstrap.

Data is valid only if it is an array, every item has the complete five-field `Applicant` shape, every stage is valid, and IDs are unique. The storage boundary validates both parsed reads and values supplied to writes. `appliedAt` is a string because the domain model currently provides no stronger format contract.

## Error Contract and Precedence

The public API rejects with `MockApiError`, exposing `status`, `code`, and `message`.

| Condition | Status | Code |
| --- | ---: | --- |
| Invalid stage input at runtime | 400 | `INVALID_STAGE` |
| Applicant ID does not exist | 404 | `APPLICANT_NOT_FOUND` |
| Stored JSON or applicant structure is corrupt | 500 | `STORAGE_DATA_INVALID` |
| Simulated server failure | 500 | `SIMULATED_FAILURE` |
| Any other unexpected failure | 500 | `INTERNAL_ERROR` |

The storage contract exposes `ApplicantStorageDataError` so injected implementations can report invalid persisted data without exposing localStorage details. The applicant API converts this error to `STORAGE_DATA_INVALID`; unexpected dependency errors become `INTERNAL_ERROR`.

Stage updates use this order:

```text
resolve behavior -> wait -> validate stage -> storage/seed load
-> locate applicant -> apply simulated failure -> immutable update -> save
```

List reads use:

```text
resolve behavior -> wait -> apply simulated failure -> storage/seed load
```

Thus invalid stages consistently produce 400, missing IDs produce 404, corrupt storage takes precedence over not-found or simulated failure during updates, and simulated failure never persists a change.

## Failure and Delay Behavior

- Random failure probability: exactly 10%.
- Random delay probability: exactly 10%.
- Random delay: an inclusive integer from 300ms through 2,000ms.
- Outcome and delay are independent; delayed failure is valid.
- Outcome is sampled first, followed by delay occurrence and duration, giving injected random sequences stable semantics.
- Explicit settings replace randomness only on their own axis.
- `outcome: 'success'` suppresses only simulated failure, not validation or dependency failures.
- `outcome: 'failure'` guarantees simulated failure at the API flow's designated precedence point.
- `delay: 'none'` resolves without a timer.
- Numeric delay is a finite, non-negative integer test/developer control and waits exactly that many milliseconds.

## React Context

`ApplicantApiProvider` requires an `api: ApplicantApi` prop and renders its children through a context whose default is `null`. `useApplicantApi()` returns the exact injected interface and throws a clear error when used outside the provider. The Context value, Provider component, and hook are separate modules so component-only Fast Refresh exports remain valid.

The Provider does not own service lifetime. This permits production composition in `main.tsx` and fake API injection in component tests. Hot-module replacement can reevaluate a module during development, but normal application startup creates one service instance; React renders do not recreate it.

## Verification

Vitest and jsdom verify domain guards, seed isolation, storage behavior, API orchestration, error precedence, probability boundaries, and delays. React Testing Library verifies Provider delivery, hook identity, and the missing-provider error. Functional API tests use injected storage and behavior fakes; localStorage and behavior implementations each receive focused contract tests.

Validation commands:

```bash
npm test
npm run lint
npm run build
```
