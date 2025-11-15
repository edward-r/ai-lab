# Lab 8 — Precision–Recall trace via τ

**Goal:** Build intuition for PR trade-offs even without a PR plot.

## Setup
- Dataset: **Noisy separable**.
- Activation: **sigmoid**; train 2–3 epochs.

## Actions
1. Sample τ at points: 0.05, 0.15, …, 0.95.
2. For each τ, write down **precision** and **recall** in a small table.
3. Mark the τ with the highest **F₁**.

## Observe
- Low τ → high recall, low precision.
- High τ → high precision, low recall.

## Why it matters
- PR space is often more informative than accuracy when classes are imbalanced or overlapping.

## Expected outcomes
- Your table will show a smooth recall↓ and precision↑ as τ grows, with a broad middle region where F₁ is maximized.
