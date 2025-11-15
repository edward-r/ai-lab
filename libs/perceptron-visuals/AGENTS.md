# Agent Guide for perceptron-visuals

## Commands

- Install deps at repo root: `npm install`.
- Lint only this lib: `npx nx lint perceptron-visuals`.
- Run tests from workspace libs as added (no dedicated test target yet).
- Example single test (workspace): `npx nx test perceptron-core -- --run src/lib/perceptron.test.ts`.

## Style

- React + TypeScript UI library; components in `src` with public exports from `index.ts`.
- Prefer function components and hooks; avoid classes and heavy internal state.
- Use workspace Prettier settings (100 cols, single quotes, no semicolons, trailing commas).
- Avoid `any`; type props and hooks precisely, with explicit return types for exported utilities.
- Imports: React/third-party first (e.g. `d3-interpolate`), then other workspace libs, then relative paths.
- Components PascalCase; hooks `useSomething`; keep UI pieces small and composable.
- Handle errors at the edges (e.g. invalid props/data) with clear messages and graceful fallbacks.
- Keep rendering predictable: avoid side effects in render; use hooks for subscriptions and cleanups.
