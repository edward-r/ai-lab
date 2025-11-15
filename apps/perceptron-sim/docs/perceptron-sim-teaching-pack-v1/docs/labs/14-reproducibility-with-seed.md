# Lab 14 — Reproducibility with RNG seed

**Goal:** Produce identical runs via the seed setting.

## Setup
- Pick a seed value (e.g., `42`). Dataset: **Separable** or **Noisy**.
- Activation: any.

## Actions
1. Set seed to your value; click **Reset** to regenerate data.
2. Train for a fixed number of steps/epochs; record metrics.
3. Refresh the page; repeat with the same seed and settings.

## Observe
- Datasets and training trajectories match across runs with the same seed.

## Why it matters
- Reproducibility enables fair comparisons and debugging.

## Expected outcomes
- Metrics match within tiny floating-point tolerance.
