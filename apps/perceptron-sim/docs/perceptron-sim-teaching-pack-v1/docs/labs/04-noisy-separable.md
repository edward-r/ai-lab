# Lab 4 — Noisy separable reality

**Goal:** See that perfection is impossible with overlapping labels; choose τ for goals.

## Setup
- Dataset: **Noisy separable**.
- Activation: **sigmoid** (so metrics are available).

## Actions
1. Train for **3 epochs** or until loss plateaus.
2. Sweep **τ** (manually or via **Play τ sweep**) and observe confusion/metrics.

## Observe
- The line can only trade mistakes between classes.
- A single global τ changes the balance between FP and FN.

## Why it matters
- Real data is messy. You choose **where** to be wrong based on application needs.

## Expected outcomes
- Accuracy plateaus around **85–95%**; F₁ < 1.0 by design.
- Different τ values optimize different metrics.
