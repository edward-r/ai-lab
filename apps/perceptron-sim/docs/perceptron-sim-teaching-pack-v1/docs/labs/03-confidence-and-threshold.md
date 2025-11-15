# Lab 3 — Confidence & τ (sigmoid mode)

**Goal:** Understand σ(z) as confidence, and τ as the decision cutoff.

## Setup
- Dataset: **Separable** (or your saved set).
- Activation: **sigmoid**.
- τ (threshold): start at **0.50**.

## Actions
1. Click **Play τ sweep** to animate τ from 0→1→0.
2. Watch the **ROC** dot glide and the confusion counts change.
3. Pause when **F₁** is near its peak. Note the τ value.

## Observe
- Raising τ reduces predicted positives: recall ↓, precision ↑.
- Lowering τ increases predicted positives: recall ↑, precision ↓.
- The decision boundary shifts horizontally without changing 𝒘 (effective b changes).

## Why it matters
- Some tasks prefer fewer false negatives (**recall**), others fewer false positives (**precision**). τ lets you pick a policy without retraining.

## Expected outcomes
- On clean separable sets, **AUC** is typically **0.85–0.98**.
- Best **F₁** usually occurs in **τ ≈ 0.5–0.7** (dataset dependent).
