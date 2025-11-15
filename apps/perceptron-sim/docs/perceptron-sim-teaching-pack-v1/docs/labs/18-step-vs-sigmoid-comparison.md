# Lab 18 — Step vs Sigmoid comparison on the same data

**Goal:** Contrast hard decisions with probabilistic decisions.

## Setup
- Dataset: **Noisy separable**.

## Actions
1. Activation **step**: train 2 epochs; note accuracy and halos.
2. Activation **sigmoid**: train 2 epochs; set τ = 0.5; note accuracy, confusion, metrics.
3. Sweep τ to improve a chosen metric (e.g., recall).

## Observe
- Step gives a single cutoff at z=0; sigmoid offers a **family** of cutoffs via τ.

## Why it matters
- Probabilities allow **policy tuning** post-training.

## Expected outcomes
- With a good τ, sigmoid can match or exceed the step’s practical performance on noisy data.
