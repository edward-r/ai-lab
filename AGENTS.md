# Agent Guide for ai-lab

## Commands

- Install deps via `npm install`.
- Build Vite sim with `npx nx build perceptron-sim`.
- Build Next app with `npx nx build prompt-maker`.
- Lint everything using `npx nx lint`; project lint with `npx nx lint <project>`.
- Run Vitest suites: `npx nx test perceptron-sim` / `npx nx test perceptron-core`.
- Single test example: `npx nx test perceptron-core -- --run src/lib/activation.test.ts`.
- Preview static bundles: `npx nx run perceptron-sim:preview`.

## Style

- Format with Prettier (100 cols, single quotes, no semicolons, trailing commas).
- Honor ESLint defaults plus React Hooks rules; fix lint before merging.
- Keep code functional: prefer functions/hooks over classes and mutable state.
- Do not use `any`; lean on strict TS, generics, and `unknown` when needed.
- Exported APIs need explicit return types; avoid implicit `any` inference.
- Imports: use module paths first (`@perceptron/core`), then relative, grouping by type.
- Components and hooks live near features; name components PascalCase, hooks start with use.
- Variables camelCase, constants UPPER_SNAKE_CASE, test files end with `.test.ts`.
- Handle errors with descriptive messages; throw standard Errors or return Result-style objects.
- Keep effects pure, favor small units, and clean up subscriptions/timeouts explicitly.
