# Applicant Board Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render the five-stage recruitment board from queried applicant data with readable cards, per-column counts, board-only horizontal scrolling, and correct column-level and whole-board empty states.

**Architecture:** `ContentComponent` owns the centered page shell and scroll viewport. `ApplicantBoard` derives stage groups from its `Applicant[]`, `BoardColumn` renders one fixed stage, and `ApplicantCard` renders one read-only applicant; presentation labels live in a small shared stage configuration module so cards and headers cannot disagree.

**Tech Stack:** React 19, TypeScript 6, TanStack React Query v5, plain CSS, Vitest, React Testing Library

**Spec:** `docs/superpowers/specs/2026-08-31-applicant-board-design.md`

## Global Constraints

- Implement only `REQUIREMENTS.md` section 2.2; do not add filtering, stage movement, optimistic updates, or applicant details.
- Use the `Applicant[]` already supplied to `ContentComponent`; no component in this scope may call Context, React Query, localStorage, or the API.
- Always render the stages in this order: `서류검토`, `면접`, `처우협의`, `최종합격`, `불합격`.
- Keep the `지원자 관리` title outside the horizontal scroll region; only the board viewport scrolls.
- When every stage is empty, render all five headers and exactly one shared `지원자가 없습니다` message.
- When the dataset is non-empty, render `지원자가 없습니다` inside each individually empty column.
- Do not create Git commits unless the user explicitly requests them.

---

### Task 1: Stage presentation contract and applicant card

**Files:**
- Create: `src/components/applicantBoardStages.ts`
- Create: `src/components/ApplicantCard.tsx`
- Test: `src/components/ApplicantCard.test.tsx`

**Interfaces:**
- Consumes: `APPLICANT_STAGE`, `ApplicantStage`, and `Applicant` from `src/models/applicant.ts`.
- Produces: `APPLICANT_BOARD_STAGES`, `getApplicantStageLabel(stage: ApplicantStage): string`, and `ApplicantCard({ applicant }: { applicant: Applicant })`.

- [ ] **Step 1: Write the failing card test**

Create `src/components/ApplicantCard.test.tsx` with a complete literal applicant and assert the real card's accessible article and visible fields:

```tsx
import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { APPLICANT_STAGE } from '../models/applicant'
import { ApplicantCard } from './ApplicantCard'

afterEach(cleanup)

describe('ApplicantCard', () => {
  it('shows the applicant card fields and stage label', () => {
    render(
      <ApplicantCard
        applicant={{
          id: 'applicant-card',
          name: '김민지',
          position: 'Frontend Engineer',
          appliedAt: '2026-08-20',
          stage: APPLICANT_STAGE.DOCUMENT_REVIEW,
        }}
      />,
    )

    const card = screen.getByRole('article', { name: '김민지 지원자' })
    expect(within(card).getByText('김민지')).toBeTruthy()
    expect(within(card).getByText('Frontend Engineer')).toBeTruthy()
    expect(within(card).getByText('2026-08-20')).toBeTruthy()
    expect(within(card).getByText('서류검토')).toBeTruthy()
  })
})
```

This test catches an omitted field or a raw internal stage value leaking into the UI.

- [ ] **Step 2: Run the card test to verify RED**

Run: `npm test -- src/components/ApplicantCard.test.tsx`

Expected: FAIL because `ApplicantCard` does not exist.

- [ ] **Step 3: Implement the stage presentation contract**

Create `src/components/applicantBoardStages.ts`:

```ts
import { APPLICANT_STAGE } from '../models/applicant'
import type { ApplicantStage } from '../models/applicant'

export const APPLICANT_BOARD_STAGES = [
  { stage: APPLICANT_STAGE.DOCUMENT_REVIEW, label: '서류검토' },
  { stage: APPLICANT_STAGE.INTERVIEW, label: '면접' },
  { stage: APPLICANT_STAGE.OFFER, label: '처우협의' },
  { stage: APPLICANT_STAGE.HIRED, label: '최종합격' },
  { stage: APPLICANT_STAGE.REJECTED, label: '불합격' },
] as const

export function getApplicantStageLabel(stage: ApplicantStage): string {
  return APPLICANT_BOARD_STAGES.find((item) => item.stage === stage)!.label
}
```

The non-null assertion is safe because `ApplicantStage` is derived from the same five-value `APPLICANT_STAGE` object represented exhaustively in this UI configuration.

- [ ] **Step 4: Implement the minimal applicant card**

Create `src/components/ApplicantCard.tsx` as an accessible `article` labeled with the applicant name. Use a heading for the name and a definition list or labeled text rows for position, applied date, and `getApplicantStageLabel(applicant.stage)`. Do not add click handlers or controls.

- [ ] **Step 5: Run the card test to verify GREEN**

Run: `npm test -- src/components/ApplicantCard.test.tsx`

Expected: PASS with no React accessibility or render warnings.

### Task 2: Stage column and grouped board behavior

**Files:**
- Create: `src/components/BoardColumn.tsx`
- Create: `src/components/ApplicantBoard.tsx`
- Test: `src/components/ApplicantBoard.test.tsx`

**Interfaces:**
- Consumes: `APPLICANT_BOARD_STAGES`, `ApplicantCard`, `Applicant[]`, and `ApplicantStage`.
- Produces: `BoardColumn({ applicants, isBoardEmpty, label, stage }: BoardColumnProps)` and `ApplicantBoard({ applicants }: { applicants: Applicant[] })`.

- [ ] **Step 1: Write failing grouping and empty-state tests**

Create `src/components/ApplicantBoard.test.tsx` using two literal applicants in different stages. Assert:

```tsx
const headings = screen.getAllByRole('heading', { level: 2 })
expect(headings.map((heading) => heading.textContent)).toEqual([
  '서류검토0',
  '면접1',
  '처우협의0',
  '최종합격0',
  '불합격1',
])

const interviewColumn = screen.getByRole('region', { name: '면접 단계' })
expect(within(interviewColumn).getByRole('article', { name: '이준호 지원자' })).toBeTruthy()
expect(screen.getAllByRole('article', { name: '이준호 지원자' })).toHaveLength(1)
```

Also add these two empty-state tests before production implementation:

```tsx
it('shows one empty message in an unpopulated column when the board has data', () => {
  render(<ApplicantBoard applicants={[interviewApplicant]} />)
  const documentColumn = screen.getByRole('region', { name: '서류검토 단계' })
  expect(within(documentColumn).getAllByText('지원자가 없습니다')).toHaveLength(1)
})

it('keeps five zero-count headers and shows one shared message when all data is empty', () => {
  render(<ApplicantBoard applicants={[]} />)
  expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(5)
  expect(screen.getAllByText('지원자가 없습니다')).toHaveLength(1)
})
```

Use complete applicant fixtures with literal expected labels. These tests catch wrong stage order, wrong counts, incorrect grouping, duplicate rendering, five empty messages for an empty dataset, and hidden fixed headers.

- [ ] **Step 2: Run the board grouping tests to verify RED**

Run: `npm test -- src/components/ApplicantBoard.test.tsx`

Expected: FAIL because `ApplicantBoard` does not exist.

- [ ] **Step 3: Implement `BoardColumn`**

Create a `section` with `role="region"` and `aria-label={`${label} 단계`}`. Render a level-two heading containing a decorative status dot (`aria-hidden="true"`), the visible label, and a count span. When `isBoardEmpty` is false, render a list of `ApplicantCard` items or one column-level `지원자가 없습니다` paragraph when `applicants.length === 0`. When `isBoardEmpty` is true, render only the header.

- [ ] **Step 4: Implement `ApplicantBoard` grouping**

Derive each stage's applicants without mutating input:

```tsx
const isBoardEmpty = applicants.length === 0

return (
  <div className="applicant-board" aria-label="채용 단계">
    {APPLICANT_BOARD_STAGES.map(({ label, stage }) => (
      <BoardColumn
        key={stage}
        applicants={applicants.filter((applicant) => applicant.stage === stage)}
        isBoardEmpty={isBoardEmpty}
        label={label}
        stage={stage}
      />
    ))}
    {isBoardEmpty && (
      <p className="applicant-board__empty">지원자가 없습니다</p>
    )}
  </div>
)
```

Use the `stage` value as a class or data attribute so CSS can assign each fixed stage its restrained accent color.

- [ ] **Step 5: Run grouping tests to verify GREEN**

Run: `npm test -- src/components/ApplicantBoard.test.tsx`

Expected: PASS for fixed header order, counts, matching columns, single rendering, column-level empty states, and the one shared whole-board empty state.

### Task 3: Centered page shell and board-only scrolling

**Files:**
- Modify: `src/components/ContentComponent.tsx`
- Create: `src/components/ApplicantBoard.css`
- Modify: `src/App.test.tsx`

**Interfaces:**
- Consumes: `ApplicantBoard({ applicants })` and the existing successful-query `ContentComponent` boundary.
- Produces: a centered `지원자 관리` page whose labeled, focusable board viewport alone owns horizontal scrolling.

- [ ] **Step 1: Replace count-only App expectations with failing board integration expectations**

In `src/App.test.tsx`, change the successful request test to assert the page heading, board viewport, and queried applicant card:

```tsx
expect(await screen.findByRole('heading', { level: 1, name: '지원자 관리' })).toBeTruthy()
expect(screen.getByRole('region', { name: '채용 단계 보드' })).toBeTruthy()
expect(screen.getByRole('article', { name: 'Kim Codex 지원자' })).toBeTruthy()
expect(getApplicants).toHaveBeenCalledTimes(1)
```

Change the zero-result test to assert five level-two headers and exactly one `지원자가 없습니다` message. Update retry-success expectations to wait for the applicant card instead of the removed count sentence. These changes catch a disconnected board, an extra query, and retention of the temporary count-only success UI.

- [ ] **Step 2: Run App integration tests to verify RED**

Run: `npm test -- src/App.test.tsx`

Expected: FAIL because `ContentComponent` still renders only `지원자 N명을 불러왔습니다.`.

- [ ] **Step 3: Implement the page shell and scroll viewport**

Update `ContentComponent`:

```tsx
import { ApplicantBoard } from './ApplicantBoard'
import './ApplicantBoard.css'

export function ContentComponent({ applicants }: ContentComponentProps) {
  return (
    <main className="applicant-page">
      <h1 className="applicant-page__title">지원자 관리</h1>
      <div
        aria-label="채용 단계 보드"
        className="applicant-page__board-viewport"
        role="region"
        tabIndex={0}
      >
        <ApplicantBoard applicants={applicants} />
      </div>
    </main>
  )
}
```

- [ ] **Step 4: Implement the approved visual system in CSS**

Create `ApplicantBoard.css` with:

- a light neutral `body` background and zero default margin;
- `.applicant-page` centered with `width: min(100% - 32px, 1440px)` and vertical padding;
- `.applicant-page__title` near `24px`, medium weight, and compact bottom margin;
- `.applicant-page__board-viewport { overflow-x: auto; }` with visible focus styling;
- `.applicant-board` as a five-column grid with `min-width` around `1200px`, equal columns, and a consistent gap;
- softly tinted column surfaces, subtle borders, rounded corners, and stage-specific accent colors selected by `data-stage`;
- white applicant cards with thin borders, rounded corners, compact metadata spacing, and readable contrast;
- `.applicant-board__empty { grid-column: 1 / -1; }` styled as one shared panel beneath the five header-only columns.

Do not add toolbar controls or reference-image actions.

- [ ] **Step 5: Run App and board tests to verify GREEN**

Run: `npm test -- src/App.test.tsx src/components/ApplicantBoard.test.tsx src/components/ApplicantCard.test.tsx`

Expected: PASS for real query-to-board data flow, title, fixed columns, cards, and both empty-state levels.

### Task 4: Repository documentation and full verification

**Files:**
- Modify: `AGENTS.md`
- Modify: `PROMPTS.md`
- Modify: `DECISIONS.md` only if implementation changes or confirms a significant design decision not already recorded in the approved spec.

**Interfaces:**
- Consumes: the completed board implementation and fresh verification results.
- Produces: accurate repository structure and collaboration records without fabricating unperformed validation or decisions.

- [ ] **Step 1: Update the current structure and collaboration record**

In `AGENTS.md`, change `src/components/` responsibility to include the stage board and applicant cards. In `PROMPTS.md`, record the actual reference-image request, approved `지원자 관리` title, board-only horizontal scrolling, stage counts, data connection, column-level empty state, and shared whole-board empty state. Do not record a commit hash until a commit exists.

- [ ] **Step 2: Review whether `DECISIONS.md` needs a new decision**

Add a decision only if implementation introduces a project-wide choice beyond the approved component responsibilities and layout. The presentational split alone can remain in the design spec; do not duplicate it merely to fill the document.

- [ ] **Step 3: Run full fresh verification**

Run:

```bash
npm test
npm run lint
npm run build
git diff --check
```

Expected: all commands exit 0, all prior query and mock API tests remain green, TypeScript and Vite production build succeed, and no whitespace errors are reported.

- [ ] **Step 4: Inspect the final change scope**

Run: `git status --short` and `git diff --stat`

Expected: only the approved board implementation, its tests and stylesheet, the design/plan documents, and required repository records are changed. Leave the working tree uncommitted unless the user explicitly requests commits.
