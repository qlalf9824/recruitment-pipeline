# AGENTS.md

This document defines how AI coding agents must analyze and modify this repository. Use `REQUIREMENTS.md` for product requirements, `PROMPTS.md` for AI collaboration records, and `DECISIONS.md` for significant decisions and their rationale.

## Working Principles

1. Before starting work, review `REQUIREMENTS.md` as the source of truth and identify the sections relevant to the request.
2. Handle one feature or one clearly defined scope at a time. Do not implement unrequested features or add behavior that is absent from the requirements.
3. Do not resolve ambiguous requirements by assumption. Explain the available options and trade-offs, then wait for the user's decision.
4. Before modifying code, inspect the current project structure and relevant code. Present the understood scope and proposed change plan first.
5. Do not immediately apply large structural changes, introduce new libraries, or change the state-management approach. Explain the need, alternatives, and impact, then wait for the user's decision.
6. Preserve the existing code style and project structure whenever possible. Do not modify unrelated files or code.
7. After implementation, verify the result against the relevant `REQUIREMENTS.md` sections.
8. Run applicable validation commands such as lint, type check, tests, and build. Report any validation that could not be run and explain why.
9. Do not hide or bypass errors. Analyze the symptom and root cause before proposing a solution.
10. Consider applicable accessibility requirements and loading, error, empty, and user-feedback states during implementation.
11. Do not fabricate decisions, conversations, or validation results in `PROMPTS.md` or `DECISIONS.md`.
12. When a significant design decision is needed, identify it as a candidate for `DECISIONS.md`. Do not finalize or record it as decided before the user makes the decision.
13. When an AI usage record is useful, propose content for `PROMPTS.md`. Base it only on actual requests, proposals, reviews, validation, and decisions.
14. Create Git commits only when the user explicitly requests them. Do not mix separate features or independent scopes in one commit.

## Current Structure

Document only paths that currently exist.

| Path | Current responsibility |
| --- | --- |
| `AGENTS.md` | Defines working rules and baseline code conventions for AI coding agents. |
| `REQUIREMENTS.md` | Defines feature scope, required behavior, failure cases, acceptance criteria, and dependencies for the recruitment pipeline. |
| `PROMPTS.md` | Records significant AI requests, proposals, user reviews and validation, and final outcomes. |
| `DECISIONS.md` | Records significant project decisions, considered options, rationale, and trade-offs. |
| `README.md` | Contains the current React, TypeScript, and Vite starter-template guidance. |
| `src/main.tsx` | Creates the application-lifetime QueryClient and default applicant service graph, installs both providers, and renders the root component. |
| `src/App.tsx` | Selects loading, error, or content UI from the applicant query state. |
| `src/models/` | Contains domain data models, compile-time contracts, and shared runtime guards. |
| `src/mocks/` | Contains immutable mock seed data factories. |
| `src/services/` | Contains injected applicant persistence, API behavior, error, and orchestration services. |
| `src/contexts/` | Contains the applicant API Context, Provider, consumer hook, and their tests. |
| `src/hooks/` | Contains query hooks that adapt injected services for UI consumers. |
| `src/components/` | Contains Tailwind-based presentation components for applicant loading, error, content, the recruitment-stage board, its columns, and applicant cards. |
| `src/styles.css` | Imports Tailwind CSS and defines the minimal application-wide base styles. |
| `docs/superpowers/specs/` | Contains reviewed technical design specifications. |
| `docs/superpowers/plans/` | Contains executable implementation plans. |
| `public/` | Contains the `favicon.svg` and `icons.svg` static files. |
| `index.html` | Provides the Vite application's HTML entry point. |
| `package.json` | Defines package metadata, dependencies, and the `dev`, `build`, `lint`, `test`, and `preview` scripts. |
| `package-lock.json` | Locks installed npm dependency versions. |
| `vite.config.ts` | Defines the Vite configuration with the React and Tailwind plugins. |
| `vitest.config.ts` | Configures Vitest to run browser-facing tests in jsdom. |
| `eslint.config.js` | Configures ESLint rules for TypeScript and React. |
| `tsconfig.json` | References the application and Vite TypeScript configurations. |
| `tsconfig.app.json` | Defines TypeScript and JSX checks for `src`. |
| `tsconfig.node.json` | Defines TypeScript checks for the Vite and Vitest configuration files. |

When a path is added, removed, or moved, or when a file's primary responsibility changes, update this section in the same commit. Do not list planned directories or structures before they exist.

## Code Conventions

- Follow patterns in the existing code and adjacent files first.
- Use PascalCase for components and the `use` prefix for hooks.
- Name event handlers with the `handleXxx` pattern.
- Prefer `isXxx`, `hasXxx`, or `canXxx` for boolean values.
- Do not place complex business logic inside JSX.
- Avoid complex conditions and deeply nested ternaries.
- Do not create unnecessary abstractions or reuse solely for the sake of reuse.
- Do not modify unrelated files.
- Write comments only when the code cannot explain why something is done.
- Prefer `interface` for object shapes and `type` for unions.
- Use `as const`-based constants instead of TypeScript `enum`.
- Do not turn undecided technology or implementation choices into conventions. Once a technical choice is decided, record its rationale in `DECISIONS.md` and update this document in the same scope when needed.

## Response Guidelines

Before modifying code, briefly report:

- Understood scope
- Relevant `REQUIREMENTS.md` sections
- Files to modify
- Implementation plan
- Decisions that require confirmation

After modifying code, briefly report:

- Changes made
- Validation commands and results
- Remaining issues or items requiring user confirmation
