# Lab 21 — Capstone: Build a “τ Picker” Worksheet

**Goal:** Create a small, repeatable workflow for selecting the operating threshold τ to meet a stated business objective.

## Deliverables
- A completed **τ Picker Worksheet** (CSV/MD) with at least 10 τ samples.
- A short **recommendation** (≤120 words) naming the chosen τ and why.
- A screenshot of the **Thresholded metrics** panel at the chosen τ.

## Scenario (example)
You are screening for a positive class where **missing a positive is 3× worse** than a false alarm. You want **recall ≥ 0.90** while keeping precision as high as possible.

## Setup
- Dataset: **Noisy separable**.
- Activation: **sigmoid**.
- Train **2–3 epochs** or until the loss trend plateaus.
- Open the **τ Picker Worksheet** template from `docs/templates/tau-picker-worksheet.md` or `.csv`.

## Actions
1. Sample τ ∈ {0.05, 0.10, …, 0.95}. Record **TP, FP, TN, FN**, **precision**, **recall**, **F₁**, and **cost** if you have asymmetric costs.
2. Mark which τ satisfy **recall ≥ 0.90**.
3. Among those, pick the τ with **highest F₁** (or lowest expected cost if using costs).

## Observe
- Raising τ: precision ↑, recall ↓.
- The “good region” for your constraint may be a small band of τ values.

## Why it matters
- Threshold selection is a **policy** lever. This worksheet makes it explicit and reproducible.

## Expected outcomes
- A recommended τ (often 0.4–0.7 on noisy—but your data rules).
- A brief written rationale grounded in the metrics you recorded.

## Turn-in checklist
- [ ] Completed worksheet (.csv or .md).
- [ ] Screenshot of metrics panel at recommended τ.
- [ ] 120‑word recommendation.
