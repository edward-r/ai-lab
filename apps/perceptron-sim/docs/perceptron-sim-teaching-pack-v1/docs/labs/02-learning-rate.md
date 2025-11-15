# Lab 2 — η (learning-rate) intuition

**Goal:** Feel the trade-off between speed and stability.

## Setup
- Same dataset as Lab 1 (**Separable**), Activation **step**.
- Start with **η = 0.05**.

## Actions
1. Train for **1 epoch**. Observe loss trend.
2. Set **η = 0.5**. Train for **1 epoch**.
3. Set **η = 1.0**. Train for **1 epoch**.

## Observe
- Small η: steady, gentle decline in loss; slow to reach high accuracy.
- Mid η (≈0.5): fast convergence on clean data.
- Large η (≈1.0+): faster early progress but possible oscillation; may miss the narrow optimum.

## Why it matters
- η controls step size in parameter space. Too small: crawl. Too big: ping-pong.

## Expected outcomes
- **η=0.05** reaches high accuracy but slowly.
- **η=0.5** reaches high accuracy quickly with stable loss.
- **η=1.0** may oscillate but still converges on separable data.
