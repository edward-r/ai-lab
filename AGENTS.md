# Agent Guide for ai-lab

## Commands

- Install deps once: `npm install` (Nx workspace tooling).
- Build & run CLI: `npx nx build prompt-maker-cli` bundles to `apps/prompt-maker-cli/dist`; run via `npx nx serve prompt-maker-cli -- --help`.
- Lint CLI files: `npx nx lint prompt-maker-cli`.
- Jest suite: `npx jest --runInBand`; target a file via `npx jest apps/prompt-maker-cli/src/__tests__/token-counter.test.ts --runInBand`.
- Format sources: `npx prettier -w apps/prompt-maker-cli/src`.

## Style

- Prettier config: 100 cols, single quotes, trailing commas, no semicolons.
- TS `strict` + `noUncheckedIndexedAccess`; never use `any`, lean on `unknown` + narrowing.
- Keep imports ordered: Node builtins, npm deps, workspace aliases (`@prompt-maker/core`), then relative modules.
- React + CLI modules stay functional; hooks named `useX`, components PascalCase, files kebab/Pascal per feature.
- Exports declare explicit return types; favor small pure helpers over shared mutable singletons.
- Constants UPPER_SNAKE_CASE, other identifiers camelCase; place tests in `src/__tests__` beside the code they cover.
- Handle failures with descriptive `Error` messages or typed results; never swallow exceptions or rely on logs only.
- Clean up timers/listeners, avoid implicit globals, prefer dependency injection, and reuse `tests/mocks` for CLI adapters.

## Atomic Prompt Standards

- **Self-contained**: Every atomic prompt must include all context needed to execute the step without referencing previous prompts. Restate critical assumptions rather than pointing “as above”.
- **Specific, verifiable change**: Scope each atomic prompt to one concrete outcome (e.g., “Implement auth API tests”), avoiding multi-goal bundles.
- **Validation section**: End every atomic prompt with a `Validation` section describing manual checks a human can perform to confirm success.
- **Series alignment**: Planning Mode (`/series`) enforces these rules by generating one overview prompt plus the atomic sequence. Keep steps logically ordered but independently executable.
