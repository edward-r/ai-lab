# Agent Guide for prompt-maker

## Commands

- Install deps at repo root: `npm install`.
- Dev server: `npx nx serve prompt-maker` (Next dev server).
- Build production bundle: `npx nx build prompt-maker`.
- Lint only this app: `npx nx lint prompt-maker`.
- Run all workspace tests as needed from root (no app-specific test target here).
- Example single test (workspace): `npx nx test perceptron-core -- --run src/lib/activation.test.ts`.

## Style

- Next.js 13+ app router (`app/`); React function components and hooks only.
- Use workspace Prettier settings (100 cols, single quotes, no semicolons, trailing commas).
- Avoid `any`; prefer strict, explicit types and clear return types on exported APIs.
- Keep server code in `app/api` and shared logic in `lib`; avoid mixing UI and data access.
- Imports: Node/third-party first, then workspace libs, then relative paths.
- Components PascalCase; hooks `useSomething`; keep files small and feature-focused.
- Handle errors with descriptive messages; log sparingly and avoid leaking secrets in responses.
- Clean up async tasks, subscriptions, and event listeners; keep React effects minimal and deterministic.
