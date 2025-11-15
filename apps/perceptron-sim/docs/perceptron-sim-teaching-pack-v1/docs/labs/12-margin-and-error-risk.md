# Lab 12 — Margin band and error risk

**Goal:** Relate margin to misclassification likelihood.

## Setup
- Dataset: **Noisy separable**.
- Activation: **sigmoid**; enable **Show margin band**.

## Actions
1. Train 2–3 epochs.
2. Inspect points **near** the band vs **far** from it.
3. Toggle τ slightly and observe which points flip.

## Observe
- Points near the boundary flip more easily with τ and carry higher error risk.

## Why it matters
- Margin is a quick heuristic for uncertainty under linear models.

## Expected outcomes
- Most flips happen inside/near the band; far-away points remain stable.
