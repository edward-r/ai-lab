# Lab 23 — Capstone: Noise Stress Test

**Goal:** Characterize how label noise and outliers affect the boundary, metrics, and chosen τ.

## Deliverables
- A **Noise Report** (≤1 page) summarizing results for three noise levels.
- Three **screenshots** (boundary + metrics) at your finalized τ per level.
- The JSON datasets you used (exported) in a `noise/` folder (optional).

## Setup
- Start from **Separable** and then inject noise by:
  - Flipping labels on 5%, 10%, and 20% of points (via JSON tab), and/or
  - Adding outliers near the boundary.
- Activation: **sigmoid**.

## Actions
For each noise level:
1. Train 2–3 epochs (same η, same seed policy).
2. Use the **τ Picker** method (Lab 21) to choose an operating τ for your stated goal.
3. Record **AUC**, **F₁**, **precision**, **recall** at that τ.

## Observe
- AUC and F₁ generally **degrade** as noise increases.
- Optimal τ often **shifts** with noise.

## Why it matters
- Robust practice means knowing how fragile your operating point is to data quality.

## Expected outcomes
- A table or bullet list per level with chosen τ and key metrics.
- A short narrative describing trends and trade-offs.
