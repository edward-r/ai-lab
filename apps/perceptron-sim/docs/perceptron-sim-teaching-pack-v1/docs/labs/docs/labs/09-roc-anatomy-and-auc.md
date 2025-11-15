# Lab 9 — ROC anatomy and AUC

**Goal:** Connect τ sweep to the ROC curve and AUC meaning.

## Setup
- Dataset: **Separable** (easier to see).
- Activation: **sigmoid**; train 1–2 epochs.

## Actions
1. Click **Play τ sweep**.
2. Watch the ROC dot glide; pause at several τ and record (FPR, TPR).
3. Note **AUC**; try a harder/noisy set and compare AUC.

## Observe
- Random guessing would sit near the diagonal (AUC ≈ 0.5).
- Cleaner separation curves bow toward the top-left (AUC → 1.0).

## Why it matters
- AUC summarizes separability **independent of τ**.

## Expected outcomes
- Clean set: AUC ≥ 0.85.
- Noisy set: AUC drops (e.g., 0.7–0.85).
