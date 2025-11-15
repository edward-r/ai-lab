# Lab 10 — Class imbalance reality check

**Goal:** See why accuracy can mislead with skewed class ratios.

## Setup
- Dataset: start with **Separable**, then manually **edit** to skew class counts 80/20 (e.g., in JSON tab or by drawing).
- Activation: **sigmoid**; train briefly.

## Actions
1. With skewed data, check **accuracy** vs **precision/recall**.
2. Try τ = 0.5, then adjust τ to improve the minority class recall.

## Observe
- Accuracy can stay high even if the minority class is poorly detected.
- Precision/recall reveal the imbalance cost.

## Why it matters
- Always check minority-class metrics when data is skewed.

## Expected outcomes
- A τ that raises minority recall will usually drop precision; choose the right balance for your use case.
