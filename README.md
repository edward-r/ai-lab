[![CI](https://github.com/edward-r/perceptron-sim/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/edward-r/perceptron-sim/actions/workflows/ci.yml)
[![Deploy (GitHub Pages)](https://github.com/edward-r/perceptron-sim/actions/workflows/pages.yml/badge.svg?branch=main)](https://github.com/edward-r/perceptron-sim/actions/workflows/pages.yml)

# Perceptron Simulator (Nx + React + Vite)

An interactive single-layer perceptron you can tweak in the browser. Adjust inputs xᵢ, weights wᵢ, and bias b; switch activation φ ∈ {step, sigmoid}; define per-row targets; and train with the classic perceptron learning rule.

- Weighted sum: **z = ∑ᵢ wᵢ·xᵢ + b**
- Step: **φ(z) = 1** if z ≥ 0 else **0**
- Sigmoid: **φ(z) = 1 / (1 + e^(−z))**
- Updates per row: **Δwᵢ = η·xᵢ·(yₜ − y)**, **Δb = η·(yₜ − y)**

## Quick Start

```bash
# 1) Use the workspace Node version (Node 22.15)
nvm use # or: volta install node@22.15

# 2) Install dependencies (npm workspace)
npm install

# 3) Run the Vite dev server through Nx
npm run dev
# open http://localhost:5173
```

## Perceptron Lab

![Perceptron Lab demo](docs/perceptron-lab-demo.gif)

- Interactive dataset presets (linearly separable, XOR, noisy, custom drawing)
- Live decision boundary, margin band overlays, and saved snapshot comparisons
- Loss tracking per step/epoch with ROC, confusion matrix, and threshold controls
- Keyboard-driven workflow with snapshot management and quick reset options

Live demo (GitHub Pages): https://edward-r.github.io/perceptron-lab

### Keyboard Shortcuts

- `Space` – Toggle start/pause training
- `N` – Step once while paused
- `R` – Reset training and stats
- `S` – Save the current snapshot parameters

### Threshold Logit Note

When shifting the decision boundary by a probability threshold τ, the effective bias becomes

```
b′ = b - logit(τ)
```

Adjusting τ inside the simulator applies this offset automatically.

## Scripts (Nx powered)

| Command               | Description                                                                         |
| --------------------- | ----------------------------------------------------------------------------------- |
| `npm run dev`         | `nx serve perceptron-sim` – Vite dev server with HMR.                               |
| `npm run build`       | `nx build perceptron-sim` – Production bundle in `dist/apps/perceptron-sim`.        |
| `npm run preview`     | `nx run perceptron-sim:preview` – Preview the production build.                     |
| `npm run test`        | `nx test perceptron-sim` – Vitest (jsdom) + Testing Library (includes shared libs). |
| `npm run lint`        | `nx lint perceptron-sim` – ESLint with Nx presets.                                  |
| `npm run nx -- graph` | Visualise dependencies between apps/libs.                                           |
| `npm run format`      | Prettier format.                                                                    |

All commands can also be invoked with `npx nx <target> <project>`. Use `npx nx list` to explore generators/executors.

## Workspace Layout

```
perceptron-sim/
├─ apps/
│  └─ perceptron-sim/
│     ├─ index.html
│     ├─ project.json
│     ├─ tsconfig.json
│     ├─ vite.config.ts
│     ├─ vitest.config.ts
│     ├─ public/
│     │  └─ CNAME.example
│     └─ src/
│        ├─ components/
│        │  ├─ Dial.tsx
│        │  └─ Led.tsx
│        ├─ features/
│        │  └─ Perceptron/
│        │     └─ PerceptronSimulator.tsx
│        ├─ test/
│        │  └─ setup.ts
│        ├─ App.tsx
│        ├─ index.css
│        └─ main.tsx
├─ libs/
│  └─ perceptron-core/
│     ├─ project.json
│     ├─ tsconfig.json
│     ├─ vitest.config.ts
│     └─ src/
│        ├─ index.ts
│        └─ lib/
│           ├─ activation.ts
│           ├─ activation.test.ts
│           ├─ perceptron.ts
│           └─ perceptron.test.ts
├─ nx.json
├─ tsconfig.base.json
├─ tsconfig.json
├─ tsconfig.node.json
├─ tailwind.config.ts
├─ postcss.config.js
├─ eslint.config.mjs
├─ .eslintrc.cjs (legacy stub)
├─ .prettierrc
└─ package.json
```

## Runbook

### Environment & Tooling

1. **Node** – Install `v22.15` (see `.nvmrc`). Prefer `nvm use` or `volta install node@22.15`.
2. **Dependencies** – Run `npm install` after pulling new commits to ensure Nx plugins are available.
3. **IDE setup** – Enable TypeScript project references and ESLint integration; both apps and libs share `tsconfig.base.json` path aliases (`@perceptron/core`).
4. **ESLint** – Flat config lives at `eslint.config.mjs`; leave `.eslintrc.cjs` untouched (stub for older tooling).

### Day-to-day Development

- `npm run dev`: launches the Vite dev server. Hot reload works across apps and libraries.
- `npm run test`: Vitest (jsdom) executes app tests and shared library tests (`libs/**`). Use `npm run test -- --watch` for watch mode.
- `npm run lint`: ESLint via Nx with React hooks rules + refresh guard.
- `npm run build`: creates a production bundle under `dist/apps/perceptron-sim`.
- `npm run preview`: serves the above bundle for quick manual QA.
- `npm run nx -- graph`: renders the dependency graph. Useful before large refactors to understand impact.
- `npx nx affected -t lint,test,build`: run only the targets impacted by your branch relative to `main`.

### Adding New Projects

- **Additional React app (Vite bundler):**

  ```bash
  npx nx g @nx/react:app new-app --bundler=vite --directory=apps --tags=scope:web
  ```

  Replace generated source with your own code (or reuse shared libs). Targets will live in `apps/new-app/project.json`.

- **Shared library:**
  ```bash
  npx nx g @nx/js:lib new-lib --directory=libs --bundler=tsc --unit-test-runner=vitest
  ```
  Export through `libs/new-lib/src/index.ts`, then import via the generated alias (edit `tsconfig.base.json` if you need a custom path).

After generating, remember to:

1. Update `nx.json` or project `tags` if you rely on conventions (`scope:*`, `type:*`).
2. Wire new libs into consuming apps via `implicitDependencies` when appropriate.
3. Extend CI to run new targets if they represent deployable artifacts.

### Publishing & Deployment

- `npx nx build perceptron-sim --configuration=production` is what CI/Pages workflow runs.
- GitHub Pages workflow uploads `dist/apps/perceptron-sim`. Custom domains are still written to `dist/apps/perceptron-sim/CNAME` when `PAGES_CNAME` is supplied.
- The Vite base path lives in `apps/perceptron-sim/vite.config.ts` (`BASE_PATH` env var). CI automatically computes the correct value for project vs. user/org pages.

### Maintenance Tips

- **Shared math utilities** stay in `libs/perceptron-core`. Import with `@perceptron/core`.
- **Testing** – Library tests run via `nx test perceptron-core`; app tests include library specs by default.
- **Caching** – Nx caches build/test/lint output (see `nx.json`). Clear with `npx nx reset` if tooling acts up.
- **Graph explorer** – Run `npm run nx -- graph` and open the generated URL to inspect dependencies.
- **Housekeeping** – When bumping major dependencies, regenerate `npm install` to refresh Nx executors and plugin versions.

## Hosting (GitHub Pages)

The workflow in `.github/workflows/pages.yml` deploys the production bundle to Pages for free.

- `BASE_PATH` is injected during the build step to support user/org pages, project pages, or custom domains.
- To enable a custom domain, add `PAGES_CNAME` as a repo secret/variable. The workflow writes `dist/apps/perceptron-sim/CNAME` automatically.
- Pages source must be set to **GitHub Actions** in repository settings.

## Alternative Deployment Options

The static bundle in `dist/apps/perceptron-sim` works on Vercel, Netlify, Cloudflare Pages, etc. Point the host at that directory (or keep using GitHub Pages for $0 hosting).
