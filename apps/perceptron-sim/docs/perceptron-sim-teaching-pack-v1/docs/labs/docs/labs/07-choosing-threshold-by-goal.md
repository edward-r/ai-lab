# Lab 7 — Choose τ for a goal (F₁ or target recall)

**Goal:** Select a threshold τ that matches a business objective, either:
- maximize **F₁**, or
- hit **recall ≥ 0.90** (or your chosen target).

## Setup
- Dataset: **Separable** or **Noisy separable**.
- Activation: **sigmoid**.
- Train until loss stabilizes (1–3 epochs).

## Actions
1. Drag τ slowly while watching **precision**, **recall**, and **F₁**.
2. Option A (F₁): stop at the τ where F₁ peaks (note τ).
3. Option B (recall): stop at the smallest τ with recall ≥ 0.90; record precision & F₁ there.

## Observe
- As τ increases, recall falls and precision rises.
- F₁ usually peaks where precision ≈ recall.

## Why it matters
- Thresholding is a **policy** choice. You can meet practical targets without retraining.

## Expected outcomes
- On clean data, best F₁ near **τ ≈ 0.5–0.7**.
- On noisy data, the F₁ curve flattens; multiple τ values are acceptable within a narrow band.
