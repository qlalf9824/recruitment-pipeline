# Applicant Board Design

## Scope

Implement `REQUIREMENTS.md` section `2.2 단계별 보드와 지원자 카드 표시`. Use the applicant array already returned by `useApplicantQuery`; do not add another API request, mock dataset, filtering, stage movement, optimistic updates, or applicant details in this scope.

The page contains a moderately sized `지원자 관리` title and a centered recruitment board inspired by the provided light kanban-board reference. The five fixed recruitment stages are always visible in their domain order.

## Page Layout

`ContentComponent` is the successful-query page boundary. It receives `Applicant[]` and renders:

```text
Centered page container
  ├─ 지원자 관리 title
  └─ Horizontally scrollable board viewport
      └─ ApplicantBoard
          ├─ Five column headers
          └─ Card area or whole-board empty state
```

The page content has a maximum width and is centered in the viewport. The title remains outside the horizontal scrolling region. Only the board viewport scrolls horizontally when the five columns cannot fit. The board keeps a minimum content width so columns do not collapse into unreadable narrow layouts.

## Component Boundaries

All board components live under `src/components/` and use the existing `Applicant` and `ApplicantStage` contracts.

### ContentComponent

```ts
interface ContentComponentProps {
  applicants: Applicant[]
}
```

- Renders the `지원자 관리` page title at approximately 24px, visually distinct without dominating the page.
- Places `ApplicantBoard` inside the board-only horizontal scroll viewport.
- Does not query, mutate, or persist applicant data.

### ApplicantBoard

```ts
interface ApplicantBoardProps {
  applicants: Applicant[]
}
```

- Uses the ordered stage definitions for `서류검토`, `면접`, `처우협의`, `최종합격`, and `불합격` from `applicantBoardStages.ts`.
- Passes each definition's complete static Tailwind color classes to `BoardColumn`; no runtime stage-to-class interpolation is allowed.
- Groups applicants by `stage` without modifying the source array.
- Renders each applicant exactly once in the column matching its current stage.
- Renders all five column headers even when the whole applicant array is empty.
- Decides between the shared whole-board empty state and per-column card areas.

### BoardColumn

```ts
interface BoardColumnProps {
  applicants: Applicant[]
  columnClassName: string
  countClassName: string
  isBoardEmpty: boolean
  label: string
  statusClassName: string
}
```

- Renders a colored status dot, stage label, and applicant count in its header.
- Applies the complete static color-class strings supplied by the stage presentation definition.
- Renders an `ApplicantCard` for every applicant assigned to the stage.
- When the whole dataset is non-empty but this column has no applicants, renders `지원자가 없습니다` inside this column's card area.
- Does not render its own card area when `isBoardEmpty` is true; `ApplicantBoard` renders the shared empty state beneath the five header-only columns instead.

### ApplicantCard

```ts
interface ApplicantCardProps {
  applicant: Applicant
}
```

- Displays name, position, applied date, and current stage.
- Is read-only and has no click, drag, selection, or stage-change behavior in this scope.

## Empty-State Rules

The board distinguishes two cases:

```text
applicants.length === 0
  -> keep all five headers with count 0
  -> render one shared "지원자가 없습니다" panel below the headers

applicants.length > 0 and one stage has no applicants
  -> render cards in populated columns
  -> render "지원자가 없습니다" once inside each empty column
```

The shared whole-board empty panel spans the visual width beneath all five headers. It is rendered once, not once per column. This completes the whole-dataset empty-state requirement that was intentionally deferred from the query-state UI.

## Visual Design

- Install Tailwind CSS v4 through the official `@tailwindcss/vite` plugin and import Tailwind once from `src/styles.css` in the application entry point.
- Express board layout and component styling with Tailwind utility classes in JSX; remove `ApplicantBoard.css` after migration.
- Keep only the Tailwind import and minimal application-wide base declarations in `src/styles.css`. Do not recreate board-specific component classes with `@apply`.
- Store complete, statically detectable stage color utility strings in `applicantBoardStages.ts`. Do not build Tailwind class names dynamically from `ApplicantStage` values.
- Use a light neutral page background and a centered content container.
- Use equal-width columns with soft tinted backgrounds, subtle borders, and rounded corners.
- Give each stage a restrained accent color used by its status dot and header details.
- Render cards on white surfaces with thin borders and modest spacing.
- Keep typography compact and readable; the page title is approximately 24px and column titles and card metadata use smaller sizes.
- Preserve a clear visual separation between column headers and card areas.
- Avoid adding toolbar controls, create buttons, menus, or icons from the reference image because they are not part of the recruitment-board requirements.

This migration establishes Tailwind as the project styling direction, but only the board is converted in this scope. Existing loading and error components retain their current markup and behavior and can be styled with Tailwind in a later task.

## Data Flow

```text
ApplicantApi.getApplicants
  -> useApplicantQuery
  -> App query-state selection
  -> ContentComponent(applicants)
  -> ApplicantBoard grouping
  -> BoardColumn(applicants for one stage)
  -> ApplicantCard(applicant)
```

No component below `ContentComponent` accesses Context, React Query, localStorage, or the Applicant API. Grouping is a pure derivation from query data.

## Accessibility

- Use a semantic heading for `지원자 관리`.
- Give the board and each column an accessible label connected to visible text.
- Use a list structure for applicant cards where appropriate.
- Keep text visible in addition to color; stage identity must not depend on status-dot color alone.
- Make the horizontal scroll region keyboard-focusable and label it so keyboard users can identify the board.
- Empty-state text remains readable text and is not conveyed only through decoration.

## Testing

Use React Testing Library against the real board components. Required tests:

- all five stage headers render in the fixed order;
- each header shows the correct applicant count;
- each applicant card shows name, position, applied date, and current stage;
- each applicant appears exactly once and in the matching stage column;
- a stage with zero applicants shows one column-level `지원자가 없습니다` message when other applicants exist;
- an entirely empty dataset keeps all five headers with count zero;
- an entirely empty dataset shows exactly one shared `지원자가 없습니다` message;
- the successful App path passes query data into the rendered board without adding another API request.

CSS layout details are verified through structure and class ownership rather than pixel snapshots. Run `npm test`, `npm run lint`, `npm run build`, and `git diff --check` after implementation.

After the Tailwind migration, repeat browser QA at the default viewport and at 390px. Confirm that the page body does not overflow horizontally, the title remains outside the scroll region, and the board viewport retains a 1200px minimum board width with its own horizontal overflow.

## Files

Expected implementation changes:

- Modify `src/components/ContentComponent.tsx`.
- Create `src/components/ApplicantBoard.tsx`.
- Create `src/components/BoardColumn.tsx`.
- Create `src/components/ApplicantCard.tsx`.
- Modify `src/components/applicantBoardStages.ts` to own statically detectable stage color utility strings.
- Modify `package.json`, `package-lock.json`, and `vite.config.ts` for Tailwind CSS v4 and its Vite plugin.
- Create `src/styles.css` and import it once from `src/main.tsx`.
- Remove the temporary `src/components/ApplicantBoard.css` stylesheet after its styles have been represented with Tailwind utilities.
- Add component and integration tests for board structure, grouping, cards, and empty states.
- Update `AGENTS.md`, `PROMPTS.md`, and `DECISIONS.md` only when their recorded responsibilities or decisions change.
