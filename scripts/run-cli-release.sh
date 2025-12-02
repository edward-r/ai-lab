#!/usr/bin/env bash
set -euo pipefail

# Sequential helper to rebuild, reinstall, and validate prompt-maker-cli.
# Usage: bash scripts/run-cli-release.sh

step() {
  echo
  echo "[cli-release] $1"
}

step "Building prompt-maker-cli (skip Nx cache)..."
npx nx build prompt-maker-cli --skip-nx-cache

step "Removing any existing global install..."
npm uninstall -g @perceptron/prompt-maker-cli >/dev/null 2>&1 || true

step "Installing freshly built CLI globally..."
npm install -g apps/prompt-maker-cli/dist

step "Running TypeScript type-check..."
npx tsc --noEmit

step "Running prompt-maker-cli unit tests..."
npx jest apps/prompt-maker-cli/src/__tests__ --runInBand

step "All done!"
