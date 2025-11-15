# Lab 5 — XOR: what one line cannot do

**Goal:** Understand linear separability limits.

## Setup
- Dataset: **XOR**.
- Activation: **step** (or sigmoid).

## Actions
1. Train multiple epochs with several η values.
2. Try moving and rotating the boundary manually (Classic tab).

## Observe
- Any single straight line misclassifies at least one quadrant.
- Accuracy saturates ~75% at best with a single linear boundary.

## Why it matters
- XOR shows why we need **features** or **multiple layers** to carve non-linear boundaries.

## Expected outcomes
- Boundary “chases” quadrants but never perfectly separates.
