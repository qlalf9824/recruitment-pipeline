# Applicant Mock API Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Provide an injected, persistent applicant API with independent success/failure/latency behavior and application-wide access through React Context.

**Architecture:** `main.tsx` constructs localStorage and behavior implementations, injects them into an applicant API factory once, and passes the resulting interface through Context. Domain, storage, behavior, API orchestration, and React delivery are independently testable; UI consumers depend only on `useApplicantApi`.

**Tech Stack:** React 19, TypeScript 6, Vite 8, Vitest, jsdom, React Testing Library, browser `localStorage`

**Spec:** `docs/superpowers/specs/2026-08-31-applicant-mock-api-design.md`

## Global Constraints

- Follow `REQUIREMENTS.md` sections `2.1`, `2.3`, `2.4`, and applicable deterministic checks from `3.4`.
- Remove `resume` and `memo` from `Applicant`; do not define `ApplicantDetail` in this scope.
- Define externally used value types from `as const` objects, not duplicated literal unions or enums.
- Inject both `ApplicantStorage` and `MockApiBehaviorService` into `createApplicantApi`.
- UI components must access the API through `useApplicantApi`, never through seed, storage, behavior, or API factories.
- An absent storage key falls back to seed without writing; only a successful data change writes.
- Corrupt stored data remains untouched and becomes a 500 API error.
- Random failure and delay probabilities are each exactly 10% and independent.
- Random delay is an inclusive integer from 300ms through 2,000ms.
- Explicit numeric delay controls are finite, non-negative integer milliseconds.
- Do not add board, search, detail-view, or optimistic-update UI behavior.
- Do not create Git commits unless the user explicitly requests them.

---

## File Map

| Path | Change | Responsibility |
| --- | --- | --- |
| `package.json` | Modify | Add test script and approved test dependencies. |
| `package-lock.json` | Modify | Lock Vitest, jsdom, and React Testing Library. |
| `vitest.config.ts` | Create | Configure co-located jsdom tests. |
| `tsconfig.node.json` | Modify | Include the Vitest configuration in project checking. |
| `src/models/applicant.ts` | Modify | Keep board fields only and add the stage guard. |
| `src/models/applicant.type-test.ts` | Modify | Remove detail fields from the compile-time example. |
| `src/models/applicant.test.ts` | Create | Verify the runtime stage guard. |
| `src/mocks/applicantSeed.ts` | Create | Own immutable board-list seed records. |
| `src/mocks/applicantSeed.test.ts` | Create | Verify stage coverage and copy isolation. |
| `src/services/applicantStorage.ts` | Create | Define storage contract/error and localStorage implementation. |
| `src/services/applicantStorage.test.ts` | Create | Verify persistence validation and preservation. |
| `src/services/mockApiError.ts` | Create | Define const-derived status/error codes and public API error. |
| `src/services/mockApiError.test.ts` | Create | Verify public error metadata. |
| `src/services/mockApiBehavior.ts` | Create | Define behavior constants/contracts and default implementation. |
| `src/services/mockApiBehavior.test.ts` | Create | Verify explicit/random outcome and delay behavior. |
| `src/services/applicantApi.ts` | Create | Define applicant API contract and injected factory. |
| `src/services/applicantApi.test.ts` | Create | Verify orchestration with injected fakes. |
| `src/contexts/ApplicantApiContext.ts` | Create | Own the nullable applicant API Context value. |
| `src/contexts/ApplicantApiProvider.tsx` | Create | Provide an injected applicant API to a React subtree. |
| `src/contexts/useApplicantApi.ts` | Create | Expose the API and enforce Provider presence. |
| `src/contexts/ApplicantApiContext.test.tsx` | Create | Verify Provider and hook behavior. |
| `src/main.tsx` | Modify | Construct dependencies once and install the Provider. |
| `AGENTS.md` | Modify | Document paths that actually exist after implementation. |
| `DECISIONS.md` | Modify | Record the approved architecture and trade-offs. |
| `PROMPTS.md` | Modify | Record only actual implementation and validation outcomes. |

### Task 1: Set up runtime testing and narrow the Applicant model

**Files:** `package.json`, `package-lock.json`, `vitest.config.ts`, `tsconfig.node.json`, `src/models/applicant.ts`, `src/models/applicant.type-test.ts`, `src/models/applicant.test.ts`

**Produces:** five-field `Applicant`; `isApplicantStage(value: unknown): value is ApplicantStage`

- [ ] Install approved dependencies with `npm install --save-dev vitest jsdom @testing-library/react` and add `"test": "vitest run"`.
- [ ] Create `vitest.config.ts` with jsdom, `clearMocks: true`, and `restoreMocks: true`; include it beside `vite.config.ts` in `tsconfig.node.json`.
- [ ] Write a failing table test accepting all `APPLICANT_STAGE` values and rejecting `'technicalInterview'`, `''`, `null`, `1`, and `{}`.
- [ ] Run `npx vitest run src/models/applicant.test.ts`; expect failure because the guard is absent.
- [ ] Remove `resume` and `memo` from `Applicant` and the compile-time example. Add:

```ts
const APPLICANT_STAGES = Object.values(APPLICANT_STAGE) as ApplicantStage[];

export function isApplicantStage(value: unknown): value is ApplicantStage {
  return APPLICANT_STAGES.some((stage) => stage === value);
}
```

- [ ] Run `npx vitest run src/models/applicant.test.ts` and `npm run build`; expect both to pass.

### Task 2: Implement immutable seed and injected storage

**Files:** `src/mocks/applicantSeed.ts`, `src/mocks/applicantSeed.test.ts`, `src/services/applicantStorage.ts`, `src/services/applicantStorage.test.ts`

**Produces:** `createApplicantSeed()`; `ApplicantStorage`; `ApplicantStorageDataError`; `createLocalStorageApplicantStorage(getStorage)`

- [ ] Write failing seed tests for all five stages and object-copy isolation; run them and confirm the module-missing failure.
- [ ] Create at least one unique record per stage using only board fields. Type the internal array with `as const satisfies readonly Applicant[]` and return `APPLICANT_SEED.map((item) => ({ ...item }))`.
- [ ] Write storage tests for absent key, round trip, invalid JSON, non-array root, every wrong/missing field, invalid stage, duplicate IDs, and invalid writes. Every corruption test must assert `ApplicantStorageDataError` and preservation of the previous raw value.
- [ ] Run the storage tests and confirm the module-missing failure.
- [ ] Implement:

```ts
export interface ApplicantStorage {
  load(): Applicant[] | null;
  save(applicants: Applicant[]): void;
}

export class ApplicantStorageDataError extends Error {
  constructor() {
    super('Stored applicant data is invalid.');
    this.name = 'ApplicantStorageDataError';
  }
}

export function createLocalStorageApplicantStorage(
  getStorage: () => Storage,
): ApplicantStorage {
  return {
    load() {
      const storage = getStorage();
      const rawValue = storage.getItem(APPLICANT_STORAGE_KEY);
      if (rawValue === null) return null;

      let parsedValue: unknown;
      try {
        parsedValue = JSON.parse(rawValue);
      } catch {
        throw new ApplicantStorageDataError();
      }

      assertApplicantArray(parsedValue);
      return parsedValue;
    },
    save(applicants) {
      assertApplicantArray(applicants);
      const storage = getStorage();
      storage.setItem(APPLICANT_STORAGE_KEY, JSON.stringify(applicants));
    },
  };
}
```

- [ ] Define `APPLICANT_STORAGE_KEY` as `'recruitment-pipeline:applicants'`. Implement `assertApplicantArray(value: unknown): asserts value is Applicant[]` using `Array.isArray`, a complete five-field `isApplicant` guard, and `new Set(ids).size === ids.length`. Apply it on reads and writes. Do not catch browser access/quota errors.
- [ ] Run both seed and storage tests; expect all to pass.

### Task 3: Implement shared API errors and behavior service

**Files:** `src/services/mockApiError.ts`, `src/services/mockApiError.test.ts`, `src/services/mockApiBehavior.ts`, `src/services/mockApiBehavior.test.ts`

**Produces:** const-derived status/error/outcome/delay types; `MockApiError`; `MockApiBehaviorService`; `createMockApiBehaviorService(random?)`

- [ ] Write a failing error test covering `Error` inheritance and exact `status`, `code`, `message`, and `name`.
- [ ] Implement `MOCK_API_STATUS` and `MOCK_API_ERROR_CODE` exactly as specified in the design, with indexed-access types. Implement `MockApiError` with explicit fields rather than parameter properties because `erasableSyntaxOnly` is enabled.
- [ ] Write failing behavior tests for explicit success/failure, none/numeric delay, 10% boundaries, 300/2,000ms duration endpoints, independent delayed failure, and fake-timer settlement at 300ms but not 299ms.
- [ ] Use this deterministic helper in tests:

```ts
function createRandomSequence(...values: number[]) {
  let index = 0;
  return () => values[index++] ?? 1;
}
```

- [ ] Implement `MOCK_API_OUTCOME` and `MOCK_API_DELAY_MODE` exactly as specified, with derived types, plus:

```ts
export interface MockApiBehaviorOptions {
  outcome?: MockApiOutcome;
  delay?: MockApiDelay;
}

export interface ResolvedMockApiBehavior {
  shouldFail: boolean;
  delayMs: number;
}

export interface MockApiBehaviorService {
  resolve(options?: MockApiBehaviorOptions): ResolvedMockApiBehavior;
  wait(delayMs: number): Promise<void>;
}
```

- [ ] In `createMockApiBehaviorService(random = Math.random)`, sample outcome first, delay occurrence second, and duration only when selected. Use `< 0.1` and `Math.floor(random() * 1_701) + 300`.
- [ ] Run both focused test files; expect all to pass.

### Task 4: Implement the injected Applicant API factory

**Files:** `src/services/applicantApi.ts`, `src/services/applicantApi.test.ts`

**Produces:** `ApplicantApi`; `ApplicantApiDependencies`; `createApplicantApi(dependencies)`

- [ ] Create in-test `ApplicantStorage` and `MockApiBehaviorService` fakes using `vi.fn`, copied arrays, and `{ shouldFail: false, delayMs: 0 }`.
- [ ] Write failing tests for seed reads without writes, first-change full persistence, exactly one changed applicant, and returned destination stage.
- [ ] Add precedence tests: resolve before wait; invalid stage after wait and before load; storage-data mapping; missing ID before simulated failure; simulated failure without save; unexpected dependency error; one save on success.
- [ ] Run `npx vitest run src/services/applicantApi.test.ts`; confirm the module-missing failure.
- [ ] Implement:

```ts
export interface ApplicantApi {
  getApplicants(options?: MockApiBehaviorOptions): Promise<Applicant[]>;
  updateApplicantStage(
    id: string,
    stage: ApplicantStage,
    options?: MockApiBehaviorOptions,
  ): Promise<Applicant>;
}

export interface ApplicantApiDependencies {
  storage: ApplicantStorage;
  behavior: MockApiBehaviorService;
}

export function createApplicantApi({
  storage,
  behavior,
}: ApplicantApiDependencies): ApplicantApi {
  return {
    async getApplicants(options) {
      try {
        const resolved = behavior.resolve(options);
        await behavior.wait(resolved.delayMs);
        throwIfSimulatedFailure(resolved.shouldFail);
        return cloneApplicants(storage.load() ?? createApplicantSeed());
      } catch (error) {
        throw normalizeApiError(error);
      }
    },
    async updateApplicantStage(id, stage, options) {
      try {
        const resolved = behavior.resolve(options);
        await behavior.wait(resolved.delayMs);
        if (!isApplicantStage(stage)) {
          throw new MockApiError(
            MOCK_API_STATUS.BAD_REQUEST,
            MOCK_API_ERROR_CODE.INVALID_STAGE,
            'Applicant stage is invalid.',
          );
        }

        const applicants = storage.load() ?? createApplicantSeed();
        const applicantIndex = applicants.findIndex((item) => item.id === id);
        if (applicantIndex === -1) {
          throw new MockApiError(
            MOCK_API_STATUS.NOT_FOUND,
            MOCK_API_ERROR_CODE.APPLICANT_NOT_FOUND,
            'Applicant was not found.',
          );
        }

        throwIfSimulatedFailure(resolved.shouldFail);
        const updatedApplicant = { ...applicants[applicantIndex], stage };
        const nextApplicants = applicants.map((item, index) =>
          index === applicantIndex ? updatedApplicant : { ...item },
        );
        storage.save(nextApplicants);
        return { ...updatedApplicant };
      } catch (error) {
        throw normalizeApiError(error);
      }
    },
  };
}
```

- [ ] Add `cloneApplicants`, `throwIfSimulatedFailure`, and `normalizeApiError` helpers. `normalizeApiError` must pass through `MockApiError`, map `ApplicantStorageDataError` to `500/STORAGE_DATA_INVALID`, and map all other values to `500/INTERNAL_ERROR` without exposing the original message.
- [ ] Run the API tests; expect all to pass without real storage, timers, or randomness.

### Task 5: Provide one application-wide API through React Context

**Files:** `src/contexts/ApplicantApiContext.ts`, `src/contexts/ApplicantApiProvider.tsx`, `src/contexts/useApplicantApi.ts`, `src/contexts/ApplicantApiContext.test.tsx`, `src/main.tsx`

**Produces:** `ApplicantApiProvider`; `useApplicantApi()`; one production API instance

- [ ] Write a failing React Testing Library `renderHook` test proving the hook returns the exact injected fake API across rerenders. Add a missing-Provider error test.
- [ ] Run the Context test; confirm the module-missing failure.
- [ ] Implement the nullable Context, Provider, and hook in separate modules so the Provider file exports only a component. Require `api: ApplicantApi` and throw `useApplicantApi must be used within ApplicantApiProvider.` when the hook has no value.
- [ ] In `main.tsx`, before rendering, construct:

```ts
const applicantStorage = createLocalStorageApplicantStorage(
  () => window.localStorage,
);
const mockApiBehavior = createMockApiBehaviorService();
const applicantApi = createApplicantApi({
  storage: applicantStorage,
  behavior: mockApiBehavior,
});
```

- [ ] Wrap `App` with `<ApplicantApiProvider api={applicantApi}>` inside `StrictMode`. Keep all construction outside components and the render call.
- [ ] Run the Context test and `npm run build`; expect both to pass.

### Task 6: Update records and run full verification

**Files:** `AGENTS.md`, `DECISIONS.md`, `PROMPTS.md`

- [ ] Update Current Structure with only source/config paths that actually exist after implementation.
- [ ] Record the approved internal API choice, board/detail model split, const-derived unions, injected storage/behavior, persistence/error rules, behavior probabilities, composition root, Context delivery, and approved test tools in `DECISIONS.md`. Include MSW and direct imports as rejected alternatives and their actual trade-offs.
- [ ] Append only actual request, implementation, and command results to `PROMPTS.md`; do not claim unexecuted validation.
- [ ] Run:

```bash
npm test
npm run lint
npm run build
git diff --check
git status --short
```

- [ ] Confirm all commands pass and only in-scope files changed.
- [ ] Confirm `Applicant` and seed have no detail fields; no detail model exists; API has no direct storage/random/timer dependency; all public value unions derive from constants; only successful changes write; error precedence matches the design; `main.tsx` creates the API outside React; and UI access is available only through Context.
