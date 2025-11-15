# Agent Guide for perceptron-sim

## Commands

- Install deps at repo root: `npm install`.
- Dev server: `npx nx serve perceptron-sim` (Vite @ port 5173).
- Build: `npx nx build perceptron-sim`.
- Preview built bundle: `npx nx run perceptron-sim:preview`.
- Lint only this app: `npx nx lint perceptron-sim`.
- Run tests (Vitest): `npx nx test perceptron-sim`.
- Single test example: `npx nx test perceptron-sim -- --run tests/perceptron-sim.test.ts` (adjust path).

## Style

- React + TypeScript; prefer function components and hooks, no classes.
- Follow workspace Prettier (100 cols, single quotes, no semicolons, trailing commas).
- No `any`; use precise types, generics, and `unknown` where needed.
- Local UI/feature components live under `src/app`, `src/components`, or `src/features`.
- Imports: workspace libs (e.g. `@perceptron/core`, `@perceptron/visuals`) first, then relative.
- Components PascalCase; hooks `useSomething`; tests `*.test.ts(x)` under the app.
- Handle errors with clear messages; throw `Error` or bubble failures instead of silent catch.
- Side effects in hooks only; clean up timers, event listeners, and subscriptions explicitly.
