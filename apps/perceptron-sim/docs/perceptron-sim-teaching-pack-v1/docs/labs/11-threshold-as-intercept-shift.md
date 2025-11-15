# Lab 11 — Threshold as intercept shift (b′ = b − logit(τ))

**Goal:** See that changing τ shifts the **intercept** without changing the **slope**.

## Setup
- Dataset: **Separable**.
- Activation: **sigmoid**; τ = 0.50.

## Actions
1. Save a snapshot **baseline(τ=0.5)**.
2. Change τ to **0.8**; save snapshot **tau-0.8**.
3. Overlay snapshots and compare lines.

## Observe
- Lines are **parallel** (same slope from 𝒘) with different intercepts (b′).

## Why it matters
- τ is a post-training policy knob; 𝒘 stays fixed, only the cutoff moves.

## Expected outcomes
- The two boundaries are parallel; their horizontal offset matches the logit shift.
