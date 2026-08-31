# Applicant Board Tailwind Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Install Tailwind CSS v4 with its official Vite plugin and migrate the completed applicant board from component CSS to statically detectable Tailwind utility classes without changing behavior.

**Architecture:** Vite owns Tailwind compilation through `@tailwindcss/vite`, while `src/styles.css` provides the single Tailwind import and minimal application-wide base styles. Board structure uses utility classes directly in JSX; the fixed stage configuration owns complete static color utilities and passes them into `BoardColumn`.

**Tech Stack:** React 19, TypeScript 6, Vite 8, Tailwind CSS v4, `@tailwindcss/vite`, Vitest, React Testing Library

**Spec:** `docs/superpowers/specs/2026-08-31-applicant-board-design.md`

## Global Constraints

- Use Tailwind CSS v4 through the official `@tailwindcss/vite` plugin; do not add PostCSS configuration or a Tailwind v3 configuration file.
- Migrate only the applicant board in this scope; loading and error components retain their current markup and behavior.
- Remove `src/components/ApplicantBoard.css` after all board styles are represented by utilities.
- Keep only `@import "tailwindcss";` and minimal application-wide base declarations in `src/styles.css`; do not recreate board classes with `@apply`.
- Store complete static stage color class strings in `applicantBoardStages.ts`; do not interpolate Tailwind class fragments from stage values.
- Preserve the approved title, five-stage order, counts, grouping, card fields, both empty-state levels, accessibility, and query request behavior.
- At 390px, the body must not overflow horizontally and only the board viewport may scroll its 1200px minimum-width board.
- Do not modify or revert the unrelated formatting-only change in `src/mocks/applicantSeed.ts`.
- Do not create Git commits unless the user explicitly requests them.

---

### Task 1: Tailwind v4 build integration

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `vite.config.ts`
- Create: `src/styles.css`
- Modify: `src/main.tsx`

**Interfaces:**
- Consumes: the existing React Vite plugin and application entry point.
- Produces: a Vite pipeline containing `tailwindcss()` and one application-wide `src/styles.css` import.

- [ ] **Step 1: Record the configuration baseline**

Run:

```bash
npm test
npm run lint
npm run build
```

Expected: 10 test files and 71 tests pass; lint and build exit 0 before the migration. This is a behavior-preserving configuration/refactor task, so existing green tests are the regression baseline rather than a new failing behavioral test.

- [ ] **Step 2: Install the official Vite integration**

Run: `npm install -D tailwindcss @tailwindcss/vite`

Expected: both packages are recorded in `devDependencies` and locked in `package-lock.json`.

- [ ] **Step 3: Configure the Vite plugin**

Update `vite.config.ts`:

```ts
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
})
```

- [ ] **Step 4: Add the global Tailwind entry stylesheet**

Create `src/styles.css`:

```css
@import "tailwindcss";

:root {
  color: #25282d;
  background: #f6f7f8;
  font-family: Inter, Pretendard, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  font-synthesis: none;
  text-rendering: optimizeLegibility;
}

body {
  min-width: 320px;
  min-height: 100vh;
  margin: 0;
  background: #f6f7f8;
}
```

Import `./styles.css` once from `src/main.tsx` after third-party imports and before application modules.

- [ ] **Step 5: Verify the Tailwind build integration**

Run: `npm run build`

Expected: TypeScript and Vite exit 0 and the emitted CSS contains Tailwind's base output. Do not change board markup yet.

### Task 2: Static stage utilities and board component migration

**Files:**
- Modify: `src/components/applicantBoardStages.ts`
- Modify: `src/components/ContentComponent.tsx`
- Modify: `src/components/ApplicantBoard.tsx`
- Modify: `src/components/BoardColumn.tsx`
- Modify: `src/components/ApplicantCard.tsx`
- Delete: `src/components/ApplicantBoard.css`
- Test: `src/App.test.tsx`
- Test: `src/components/ApplicantBoard.test.tsx`
- Test: `src/components/ApplicantCard.test.tsx`

**Interfaces:**
- Consumes: the Tailwind build integration from Task 1 and the reviewed board behavior.
- Produces: stage entries with `columnClassName`, `countClassName`, and `statusClassName`; `BoardColumn` accepts those three strings instead of `stage`.

- [ ] **Step 1: Run the focused regression baseline**

Run: `npm test -- src/App.test.tsx src/components/ApplicantBoard.test.tsx src/components/ApplicantCard.test.tsx`

Expected: 3 files and 12 tests pass before markup refactoring.

- [ ] **Step 2: Add complete static stage color utilities**

Extend every `APPLICANT_BOARD_STAGES` item with literal strings. Use these exact mappings:

```ts
{
  stage: APPLICANT_STAGE.DOCUMENT_REVIEW,
  label: '서류검토',
  columnClassName: 'border-slate-200 bg-slate-50',
  countClassName: 'text-slate-500',
  statusClassName: 'bg-slate-500',
}
```

Use blue (`border-blue-200 bg-blue-50`, `text-blue-500`, `bg-blue-500`) for 면접, amber for 처우협의, emerald for 최종합격, and purple for 불합격. Every utility must appear as a complete literal; do not construct `bg-${color}-50` or equivalent.

- [ ] **Step 3: Migrate `ContentComponent` and `ApplicantBoard`**

Remove the `ApplicantBoard.css` import. Apply these structural utilities:

```tsx
<main className="mx-auto w-[min(calc(100%-2rem),90rem)] py-8 max-sm:w-[min(calc(100%-1.5rem),90rem)] max-sm:py-6">
  <h1 className="mb-[18px] text-2xl font-semibold leading-[1.3] tracking-[-0.02em] text-zinc-800 max-sm:mb-3.5">
```

The board viewport uses `overflow-x-auto rounded-[14px] focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-blue-600`. The board uses `grid min-w-[1200px] grid-cols-5 gap-3`. Its shared empty panel uses `col-span-5 rounded-xl border border-dashed border-zinc-300 bg-white px-4 py-10 text-center text-[13px] leading-6 text-zinc-500`.

Destructure and pass the three static stage class strings from `ApplicantBoard` into `BoardColumn`.

- [ ] **Step 4: Migrate `BoardColumn`**

Replace `stage: ApplicantStage` with:

```ts
columnClassName: string
countClassName: string
statusClassName: string
```

Use stable structural utilities plus the passed complete color strings:

- section: ``min-w-0 rounded-xl border p-3 ${columnClassName}``;
- heading: `mb-3 flex items-center gap-2 text-sm font-semibold leading-[1.4] text-zinc-700`;
- dot: ``size-2 shrink-0 rounded-full ${statusClassName}``;
- count: `tabular-nums` plus `countClassName`;
- empty column: `rounded-[10px] border border-dashed border-zinc-300 bg-white/55 px-2 py-7 text-center text-[13px] leading-6 text-zinc-500`;
- populated list: `grid list-none gap-2.5 p-0 m-0` and each list item `min-w-0`.

- [ ] **Step 5: Migrate `ApplicantCard`**

Use these utilities while preserving semantic markup:

- article: `rounded-[10px] border border-zinc-200 bg-white p-3.5 shadow-sm`;
- h3: `mb-3 text-[15px] font-semibold leading-[1.4] text-zinc-800`;
- dl: `m-0 grid grid-cols-[max-content_minmax(0,1fr)] gap-x-2.5 gap-y-1.5 text-xs leading-6`;
- dt: `text-zinc-500`;
- dd: `m-0 min-w-0 break-words text-zinc-700`.

- [ ] **Step 6: Delete the temporary stylesheet and verify behavior**

Delete `src/components/ApplicantBoard.css`, then run:

```bash
npm test -- src/App.test.tsx src/components/ApplicantBoard.test.tsx src/components/ApplicantCard.test.tsx
npm run lint
npm run build
git diff --check
```

Expected: all focused tests pass, lint/build exit 0, and no whitespace errors are reported. If Tailwind reports an unknown utility, replace it with a supported v4 equivalent that preserves the specified visual result.

### Task 3: Documentation, browser QA, and final verification

**Files:**
- Modify: `AGENTS.md`
- Modify: `PROMPTS.md`
- Modify: `DECISIONS.md`
- Modify: `docs/superpowers/specs/2026-08-31-applicant-board-design.md`

**Interfaces:**
- Consumes: the migrated board and fresh command/browser evidence.
- Produces: truthful project-wide Tailwind adoption rationale and verified responsive behavior.

- [ ] **Step 1: Record the significant styling-system decision**

Add a `DECISIONS.md` entry comparing plain component CSS, Tailwind utilities, and `@apply`-based class retention. Record the selected Tailwind v4 Vite plugin, board-first migration, static stage utility strings, faster consistent UI development rationale, and the cost of utility-heavy JSX and new build dependency.

Update `PROMPTS.md` with the actual user request to adopt Tailwind for development speed and consistency, the decision to migrate the board first while planning a later full UI conversion, and the selected Vite-plugin/static-class approach. Update `AGENTS.md` so current structure mentions `src/styles.css` and Tailwind-based board presentation without claiming loading/error migration is complete.

- [ ] **Step 2: Run browser QA at default width**

Start the existing Vite development server, reload the local page, and inspect the semantic tree and screenshot. Confirm the `지원자 관리` title, five styled columns, stage counts, cards, and no toolbar/actions.

- [ ] **Step 3: Run 390px overflow QA**

At a 390×844 viewport, measure and record:

```text
document.body.scrollWidth === document.body.clientWidth
boardViewport.scrollWidth > boardViewport.clientWidth
board minimum rendered width is 1200px
```

Reset the temporary viewport after the check.

- [ ] **Step 4: Run final fresh verification and inspect scope**

Run:

```bash
npm test
npm run lint
npm run build
git diff --check
git status --short
```

Expected: 10 files and 71 tests pass; lint/build/diff exit 0. The scope includes Tailwind dependencies/configuration, global stylesheet, board utility migration, deleted temporary CSS, board docs, and the pre-existing unrelated `src/mocks/applicantSeed.ts` formatting-only change. Do not alter that unrelated file and do not commit.

