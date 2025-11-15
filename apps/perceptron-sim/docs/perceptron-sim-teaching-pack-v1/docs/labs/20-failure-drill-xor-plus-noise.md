# Lab 20 — Failure drill: XOR plus noise

**Goal:** Build intuition for non-linear problems and why a single line fails.

## Setup
- Dataset: **XOR**; optionally add mild noise by flipping a few labels.

## Actions
1. Train for several epochs; vary η.
2. Try moving τ (sigmoid), observe metrics.
3. Use overlays to show how the line keeps “chasing” but can’t separate.

## Observe
- Persistent error in at least one quadrant.

## Why it matters
- Shows limits of linear models and motivates feature engineering or multiple layers.

## Expected outcomes
- Accuracy improves somewhat but saturates well below 100%; snapshots show boundary bouncing between quadrants.
