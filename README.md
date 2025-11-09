[![CI](https://github.com/edward-r/perceptron-sim/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/edward-r/perceptron-sim/actions/workflows/ci.yml)
[![Deploy (GitHub Pages)](https://github.com/edward-r/perceptron-sim/actions/workflows/pages.yml/badge.svg?branch=main)](https://github.com/edward-r/perceptron-sim/actions/workflows/pages.yml)

# React Perceptron Simulator (Vite + TypeScript)

An interactive single-layer perceptron you can run in the browser. Adjust inputs xᵢ, weights wᵢ, and bias b; choose an activation φ ∈ {step, sigmoid}; define per-row targets; and train using the classic Perceptron learning rule:

- Weighted sum: **z = ∑ᵢ wᵢ·xᵢ + b**
- Step: **φ(z) = 1** if z ≥ 0 else **0**
- Sigmoid: **φ(z) = 1 / (1 + e^(−z))**
- Updates per row: **Δwᵢ = η·xᵢ·(yₜ − y)**, **Δb = η·(yₜ − y)**

## Quick Start

```bash
# 1) Unzip, then cd into the project
cd react-perceptron-simulator

# 2) Install deps (choose one)
pnpm i
# or: npm i
# or: yarn

# 3) Start dev server
pnpm dev
# then open the printed localhost URL in your browser
```

## Scripts

- `pnpm dev` – Run Vite dev server.
- `pnpm build` – Type-check and produce a production build.
- `pnpm preview` – Serve the production build locally.
- `pnpm test` – Run unit tests (Vitest + RTL).
- `pnpm lint` – ESLint.
- `pnpm format` – Prettier.

## Tech

- React 18 + TypeScript 5
- Vite 5
- Tailwind CSS 3
- Vitest 2 + @testing-library/react
- ESLint + Prettier

## Hosting (free): GitHub Pages

This project is preconfigured for **GitHub Pages** and **$0** hosting for public repos.

- **Vite base path** is read from `process.env.BASE_PATH` (see `vite.config.ts`).
- The Pages workflow computes `BASE_PATH` automatically for:
  - **User/Org pages** (`<owner>.github.io`) → `/`
  - **Project pages** → `/<repo>/`
  - **Custom domain** (optional): define `PAGES_CNAME` in **Settings → Secrets and variables → Actions → Variables**. The workflow will:
    - set `BASE_PATH=/`
    - write `dist/CNAME` automatically

### Enable Pages

1. Repository **Settings → Pages → Build and deployment → Source = GitHub Actions**.
2. Push to `main` (or run the workflow manually via **Actions → Deploy (GitHub Pages) → Run workflow**).

### Remove/disable AWS
If you previously added an AWS deploy workflow, remove it:

```bash
git rm .github/workflows/deploy-s3.yml
git commit -m "Remove AWS deploy workflow; Pages-only hosting"
```

## Project Layout

```
react-perceptron-simulator/
├─ src/
│  ├─ components/
│  │  ├─ Dial.tsx
│  │  └─ Led.tsx
│  ├─ features/
│  │  └─ Perceptron/
│  │     └─ PerceptronSimulator.tsx
│  ├─ lib/
│  │  ├─ activation.ts
│  │  └─ perceptron.ts
│  ├─ test/
│  │  └─ setup.ts
│  ├─ App.tsx
│  ├─ index.css
│  └─ main.tsx
├─ index.html
├─ tailwind.config.ts
├─ postcss.config.js
├─ vite.config.ts
├─ tsconfig.json
├─ tsconfig.node.json
├─ .eslintrc.cjs
├─ .prettierrc
└─ .editorconfig
```

## Deploy Options (alternative)

- **Vercel (Hobby)** or **Netlify (Free)** also work for $0 personal hosting.
