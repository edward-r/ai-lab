# Agent Guide for perceptron-core

## Commands

- Install deps at repo root: `npm install`.
- Run all tests (Vitest): `npx nx test perceptron-core`.
- Single test example: `npx nx test perceptron-core -- --run src/lib/activation.test.ts`.
- Lint only this lib: `npx nx lint perceptron-core`.

## Style

- Pure TypeScript library; keep code framework-free and side-effect-light.
- Prefer functional style and small pure helpers; avoid classes and shared mutable state.
- No `any`; use precise types and generics, plus explicit return types on exported APIs.
- Keep public API surface in `src/index.ts`; internal helpers in `src/lib/*`.
- Imports: standard libs, then third-party, then internal paths (no circular deps).
- Use descriptive names (camelCase vars, UPPER_SNAKE_CASE constants); tests `*.test.ts` beside source.
- Handle errors with clear `Error` messages or Result-style return types; do not silently swallow failures.
- Maintain deterministic, testable behavior; avoid hidden global configuration or I/O in core functions.
