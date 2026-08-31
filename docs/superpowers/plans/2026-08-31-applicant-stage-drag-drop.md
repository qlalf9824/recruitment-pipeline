# Applicant Stage Drag and Drop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move applicant cards between fixed recruitment-stage columns with pointer drag and drop, persist successful moves through the injected Applicant API, and refresh the applicant query after success.

**Architecture:** `ContentComponent` owns an injected update mutation and passes a domain callback into `ApplicantBoard`. The board contains the dnd-kit provider and validates drag results, `DraggableApplicantCard` adapts a card to `useDraggable`, and each `BoardColumn` adapts a stage to `useDroppable`. A pure resolver keeps domain validation independently testable from browser drag events.

**Tech Stack:** React 19, TypeScript 6, TanStack React Query v5, `@dnd-kit/react` 0.5.x, Tailwind CSS v4, Vitest, React Testing Library

**Spec:** `docs/superpowers/specs/2026-08-31-applicant-stage-drag-drop-design.md`

## Global Constraints

- Implement only `REQUIREMENTS.md` 2.3 pointer-based stage movement and persistence.
- Do not implement same-column ordering, stage-unit keyboard movement, optimistic updates, rollback feedback, or race handling.
- Use `@dnd-kit/react`; do not install or use legacy `@dnd-kit/core`, `@dnd-kit/sortable`, or `@dnd-kit/utilities`.
- Keep dnd-kit types inside applicant-board presentation adapters; services and query hooks remain library-independent.
- Update the UI only after API success and applicant-query invalidation/refetch.
- Preserve the five fixed stages, card fields, empty states, accessibility roles, and board-only horizontal scrolling.
- Follow TDD: every behavioral production change begins with a focused failing test.
- Do not create Git commits unless the user explicitly requests them during execution.

---

### Task 1: Update mutation and shared applicant query key

**Files:**
- Modify: `src/hooks/useApplicantQuery.ts`
- Create: `src/hooks/useUpdateApplicantStageMutation.ts`
- Create: `src/hooks/useUpdateApplicantStageMutation.test.tsx`
- Modify: `package.json`
- Modify: `package-lock.json`

**Interfaces:**
- Consumes: `ApplicantApi.updateApplicantStage(id: string, stage: ApplicantStage): Promise<Applicant>` and `useApplicantApi()`.
- Produces: exported `APPLICANT_QUERY_KEY` and `useUpdateApplicantStageMutation()` accepting `{ applicantId: string; stage: ApplicantStage }`.

- [ ] **Step 1: Install the selected drag-and-drop package**

Run:

```bash
npm install @dnd-kit/react@^0.5.0
```

Expected: `@dnd-kit/react` appears in dependencies and the lockfile records its DOM, state, geometry, collision, and helper dependencies. Do not install sortable or legacy packages.

- [ ] **Step 2: Write a failing mutation-hook success test**

Create a test wrapper with `QueryClientProvider` and `ApplicantApiProvider`. Seed the query cache under `APPLICANT_QUERY_KEY`, spy on `queryClient.invalidateQueries`, call:

```ts
await result.current.mutateAsync({
  applicantId: 'applicant-1',
  stage: APPLICANT_STAGE.INTERVIEW,
})
```

Assert:

```ts
expect(updateApplicantStage).toHaveBeenCalledWith(
  'applicant-1',
  APPLICANT_STAGE.INTERVIEW,
)
expect(invalidateQueries).toHaveBeenCalledWith({
  queryKey: APPLICANT_QUERY_KEY,
})
```

- [ ] **Step 3: Run the focused test and verify RED**

Run:

```bash
npm test -- src/hooks/useUpdateApplicantStageMutation.test.tsx
```

Expected: FAIL because `APPLICANT_QUERY_KEY` is not exported and the mutation hook does not exist.

- [ ] **Step 4: Implement the shared key and mutation hook**

Export the existing key:

```ts
export const APPLICANT_QUERY_KEY = ['applicants'] as const
```

Create the hook:

```ts
interface UpdateApplicantStageVariables {
  applicantId: string
  stage: ApplicantStage
}

export function useUpdateApplicantStageMutation() {
  const applicantApi = useApplicantApi()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ applicantId, stage }: UpdateApplicantStageVariables) =>
      applicantApi.updateApplicantStage(applicantId, stage),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: APPLICANT_QUERY_KEY })
    },
  })
}
```

- [ ] **Step 5: Add a failing mutation-hook failure test**

Make `updateApplicantStage` reject and assert that `mutateAsync` rejects and `invalidateQueries` is not called.

```ts
await expect(
  result.current.mutateAsync({
    applicantId: 'applicant-1',
    stage: APPLICANT_STAGE.INTERVIEW,
  }),
).rejects.toThrow('update failed')
expect(invalidateQueries).not.toHaveBeenCalled()
```

- [ ] **Step 6: Run the hook tests and full regression**

Run:

```bash
npm test -- src/hooks/useUpdateApplicantStageMutation.test.tsx
npm test
```

Expected: the new hook tests and all existing 71 tests pass.

---

### Task 2: Pure drag-result validation

**Files:**
- Create: `src/components/resolveApplicantStageDrop.ts`
- Create: `src/components/resolveApplicantStageDrop.test.ts`

**Interfaces:**
- Consumes: `Applicant[]`, `ApplicantStage`, and primitive dnd identifiers.
- Produces: `resolveApplicantStageDrop(input): ApplicantStageDrop | null` without importing dnd-kit.

- [ ] **Step 1: Write the failing valid-move test**

Define the expected interface in the test:

```ts
expect(
  resolveApplicantStageDrop({
    applicants: [interviewApplicant],
    isCanceled: false,
    sourceId: interviewApplicant.id,
    targetId: APPLICANT_STAGE.OFFER,
  }),
).toEqual({
  applicantId: interviewApplicant.id,
  stage: APPLICANT_STAGE.OFFER,
})
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
npm test -- src/components/resolveApplicantStageDrop.test.ts
```

Expected: FAIL because the resolver module does not exist.

- [ ] **Step 3: Implement the resolver contracts and valid path**

```ts
interface ResolveApplicantStageDropInput {
  applicants: Applicant[]
  isCanceled: boolean
  sourceId: string | number | undefined
  targetId: string | number | undefined
}

export interface ApplicantStageDrop {
  applicantId: string
  stage: ApplicantStage
}
```

Return the move only when the source applicant exists, `isApplicantStage(targetId)` succeeds, and the target differs from the applicant's current stage.

- [ ] **Step 4: Add table-driven ignored-drop tests**

Cover these exact cases, each expecting `null`:

```ts
[
  { isCanceled: true, sourceId: interviewApplicant.id, targetId: APPLICANT_STAGE.OFFER },
  { isCanceled: false, sourceId: undefined, targetId: APPLICANT_STAGE.OFFER },
  { isCanceled: false, sourceId: interviewApplicant.id, targetId: undefined },
  { isCanceled: false, sourceId: 'missing', targetId: APPLICANT_STAGE.OFFER },
  { isCanceled: false, sourceId: interviewApplicant.id, targetId: 'invalid-stage' },
  { isCanceled: false, sourceId: interviewApplicant.id, targetId: APPLICANT_STAGE.INTERVIEW },
]
```

- [ ] **Step 5: Run resolver tests and lint**

Run:

```bash
npm test -- src/components/resolveApplicantStageDrop.test.ts
npm run lint
```

Expected: all resolver cases pass and ESLint exits 0.

---

### Task 3: Draggable cards and droppable stage columns

**Files:**
- Create: `src/components/DraggableApplicantCard.tsx`
- Create: `src/components/DraggableApplicantCard.test.tsx`
- Modify: `src/components/ApplicantCard.tsx`
- Modify: `src/components/BoardColumn.tsx`
- Modify: `src/components/ApplicantBoard.tsx`
- Modify: `src/components/ApplicantBoard.test.tsx`

**Interfaces:**
- Consumes: `Applicant`, stage metadata, `useDraggable`, `useDroppable`, and `DragDropProvider`.
- Produces: `ApplicantBoard` props `onMoveApplicant(applicantId, stage)` and `movingApplicantId?: string`; draggable list items and stage drop targets.

- [ ] **Step 1: Write failing board adapter tests**

Update the board render helper to pass `onMoveApplicant={vi.fn()}`. Add assertions that:

```ts
expect(screen.getByRole('article', { name: '이준호 지원자' })).toBeTruthy()
expect(screen.getByRole('region', { name: '면접 단계' })).toBeTruthy()
```

Add a `DraggableApplicantCard` test rendered inside `DragDropProvider` and assert the wrapper has `aria-disabled="true"` when `isDisabled` is true while the nested article remains present exactly once.

- [ ] **Step 2: Run focused component tests and verify RED**

Run:

```bash
npm test -- src/components/ApplicantBoard.test.tsx src/components/DraggableApplicantCard.test.tsx
```

Expected: FAIL because the draggable adapter and new board props do not exist.

- [ ] **Step 3: Implement `DraggableApplicantCard`**

Use the applicant id as the draggable id and attach the returned ref to the semantic list item:

```tsx
const { isDragging, ref } = useDraggable({
  id: applicant.id,
  disabled: isDisabled,
})

return (
  <li
    ref={ref}
    aria-disabled={isDisabled || undefined}
    className={`min-w-0 cursor-grab ${
      isDragging ? 'cursor-grabbing opacity-50' : ''
    }`}
  >
    <ApplicantCard applicant={applicant} />
  </li>
)
```

Keep `ApplicantCard` focused on card content; do not import dnd-kit there.

- [ ] **Step 4: Make `BoardColumn` a drop target**

Add `stage: ApplicantStage` and `movingApplicantId?: string` props. Register:

```ts
const { isDropTarget, ref } = useDroppable({ id: stage })
```

Attach `ref` to the existing section and append a static conditional ring class when `isDropTarget` is true. Replace each list item and card pair with:

```tsx
<DraggableApplicantCard
  key={applicant.id}
  applicant={applicant}
  isDisabled={movingApplicantId === applicant.id}
/>
```

- [ ] **Step 5: Add the provider and drag-end handler to `ApplicantBoard`**

Extend props:

```ts
interface ApplicantBoardProps {
  applicants: Applicant[]
  movingApplicantId?: string
  onMoveApplicant(applicantId: string, stage: ApplicantStage): void
}
```

Wrap the existing fixed grid with `DragDropProvider`. In `onDragEnd`, call `resolveApplicantStageDrop` with `event.canceled`, `event.operation.source?.id`, and `event.operation.target?.id`; invoke `onMoveApplicant` only for a non-null result. Do not mutate applicants locally.

- [ ] **Step 6: Run focused and existing card tests**

Run:

```bash
npm test -- src/components/ApplicantBoard.test.tsx src/components/DraggableApplicantCard.test.tsx src/components/ApplicantCard.test.tsx
```

Expected: grouping, empty-state, card semantics, and disabled draggable tests all pass.

---

### Task 4: Connect drop results to persistence and query refresh

**Files:**
- Modify: `src/components/ContentComponent.tsx`
- Modify: `src/App.test.tsx`
- Create: `src/components/ContentComponent.test.tsx`

**Interfaces:**
- Consumes: `useUpdateApplicantStageMutation()` and `ApplicantBoard`'s domain callback.
- Produces: API-backed stage movement with `movingApplicantId` derived from mutation variables while pending.

- [ ] **Step 1: Write a failing content integration test**

Render `ContentComponent` with real `QueryClientProvider` and injected `ApplicantApiProvider`. Mock the board adapter boundary so the test can call:

```ts
onMoveApplicant('applicant-1', APPLICANT_STAGE.INTERVIEW)
```

Assert `updateApplicantStage` is called once with that pair and the active applicant query is invalidated. Keep the mock limited to drag delivery; do not mock the mutation hook.

- [ ] **Step 2: Run the content test and verify RED**

Run:

```bash
npm test -- src/components/ContentComponent.test.tsx
```

Expected: FAIL because `ContentComponent` does not create or pass the mutation callback.

- [ ] **Step 3: Connect the mutation in `ContentComponent`**

```ts
const updateStageMutation = useUpdateApplicantStageMutation()

const handleMoveApplicant = (
  applicantId: string,
  stage: ApplicantStage,
) => {
  if (updateStageMutation.isPending) return
  updateStageMutation.mutate({ applicantId, stage })
}
```

Pass `handleMoveApplicant` and this pending variable to the board:

```ts
const movingApplicantId = updateStageMutation.isPending
  ? updateStageMutation.variables?.applicantId
  : undefined
```

- [ ] **Step 4: Add a successful move/refetch App integration test**

Use an API fake where the first `getApplicants` returns an applicant in document review, `updateApplicantStage` resolves an interview-stage copy, and the invalidation-driven second `getApplicants` returns the updated list. Deliver the board move through the adapter boundary and assert:

```ts
expect(updateApplicantStage).toHaveBeenCalledTimes(1)
expect(getApplicants).toHaveBeenCalledTimes(2)
expect(
  within(screen.getByRole('region', { name: '면접 단계' })).getByRole(
    'article',
    { name: 'Kim Codex 지원자' },
  ),
).toBeTruthy()
```

Also assert the document-review column no longer contains that article and a second applicant remains in its original column.

- [ ] **Step 5: Add pending and failure integration tests**

- Pending: leave `updateApplicantStage` unresolved, deliver the same move twice, and assert only one API call is made and the card stays in the source column.
- Failure: reject `updateApplicantStage`, assert `getApplicants` remains at one call and the card stays in the source column. Suppress the expected mutation rejection only at the test boundary; do not hide production errors.

- [ ] **Step 6: Run the query-state and content integration tests**

Run:

```bash
npm test -- src/components/ContentComponent.test.tsx src/App.test.tsx
```

Expected: the new move flows and all existing loading, error, empty, and retry tests pass.

---

### Task 5: Persistence, responsive QA, and project records

**Files:**
- Modify: `AGENTS.md`
- Modify: `PROMPTS.md`
- Modify: `DECISIONS.md` only if the user explicitly requests a decision record

**Interfaces:**
- Consumes: the completed stage movement, injected localStorage service graph, and responsive board.
- Produces: verified persistence/browser behavior and truthful project records.

- [ ] **Step 1: Add or extend a persistence integration test**

Use the existing in-memory `ApplicantStorage` and successful behavior service. Update one applicant through the API, create a fresh API graph over the same storage, call `getApplicants`, and assert the applicant remains in the new stage while every other applicant is unchanged.

- [ ] **Step 2: Run the persistence and full automated suites**

Run:

```bash
npm test -- src/services/applicantApi.test.ts src/components/ContentComponent.test.tsx src/App.test.tsx
npm test
npm run lint
npm run build
git diff --check
```

Expected: all focused and full tests pass; lint, build, and whitespace checks exit 0.

- [ ] **Step 3: Run desktop browser drag QA**

On the local app, drag one card from `서류검토` to `면접` and verify:

- the target column highlights while hovered;
- the card remains in the source column until the request succeeds;
- after success it appears exactly once in `면접` with current stage `면접`;
- all other cards remain in their prior columns.

Reload the page and verify the moved card remains in `면접`.

- [ ] **Step 4: Run narrow-viewport QA**

At 390×844, verify the body still has no horizontal overflow, the board viewport retains horizontal scrolling, and a card can be dragged to a column reached by scrolling. Reset the viewport after the check.

- [ ] **Step 5: Update truthful repository records**

Update `AGENTS.md` current structure for the new mutation hook and draggable adapter. Add the actual user request, selected library, implemented scope, and fresh validation results to `PROMPTS.md`. Do not add `DECISIONS.md` unless the user asks for it.

- [ ] **Step 6: Inspect final scope**

Run:

```bash
git status --short
git diff --stat
```

Expected: only dnd-kit dependency files, stage-movement hooks/components/tests, the two approved design/plan files, and requested project records are changed. Do not commit unless the user explicitly asks.
