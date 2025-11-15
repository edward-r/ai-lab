# Lab 6 — Classic gates (discrete lens)

**Goal:** Map perceptron parameters to simple logic gates.

## Setup
- Open **Classic Weight Table** tab.

## Actions
1. **AND**: Set w₁≈2, w₂≈2, b≈−3. Verify that only (1,1) yields φ(z)=1.
2. **OR**: Set w₁≈2, w₂≈2, b≈−1. Verify that any input with at least one 1 yields φ(z)=1.
3. Click **Train Epoch** and watch changes.

## Observe
- z = w₁x₁ + w₂x₂ + b; φ(z) is step or sigmoid output.
- Logic gates are special cases of linear decision rules.

## Why it matters
- The continuous “line” intuition matches the discrete truth table view.
