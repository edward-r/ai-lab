# Agent Guide for ai-lab

## Commands

- Install deps: `npm install`.
- Build Vite sim: `npx nx build perceptron-sim`.
- Build Next app: `npx nx build prompt-maker`.
- Lint all: `npx nx lint`; per-project: `npx nx lint <project>`.
- Run tests: `npx nx test perceptron-sim` / `npx nx test perceptron-core`.
- Single test example: `npx nx test perceptron-core -- --run src/lib/activation.test.ts`.
- Preview sim bundle: `npx nx run perceptron-sim:preview`.

## Style

- Format with Prettier (100 cols, single quotes, no semicolons, trailing commas).
- Honor ESLint + React Hooks rules; keep lint clean before merging.
- Prefer functional style: React function components and hooks over classes/mutable state.
- Avoid `any`; use strict TypeScript, generics, and `unknown` where needed.
- Give exported APIs explicit return types; avoid implicit `any` and broad `unknown`.
- Imports: library/alias modules first (e.g. `@perceptron/core`), then relative paths, grouped by type.
- Components/hooks live near features; components PascalCase, hooks `useSomething`, tests `*.test.ts`.
- Variables camelCase; constants UPPER_SNAKE_CASE; files kebab-case or PascalCase for components.
- Handle errors with descriptive messages; throw `Error` or return Result-style objects instead of swallowing.
- Keep effects pure and focused; clean up subscriptions, timers, and listeners explicitly.
