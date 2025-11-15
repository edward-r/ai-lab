# Lab 19 — Cost-sensitive thresholding

**Goal:** Choose τ to minimize expected cost when FP and FN have different costs.

## Setup
- Dataset: **Noisy**; Activation **sigmoid**.

## Actions
1. Define costs, e.g., **Cost(FN)=5**, **Cost(FP)=1**.
2. Try τ values (0.2, 0.3, …, 0.8). For each, compute **Cost = 5·FN + 1·FP** from the confusion counts.
3. Pick τ with minimal cost.

## Observe
- Higher FN cost pushes you toward **lower τ** (favor recall).

## Why it matters
- Real systems rarely value errors equally; thresholding should reflect that.

## Expected outcomes
- The cost-minimizing τ shifts lower than the F₁-optimal τ when FN is expensive.
