# Lab 13 — Learning-rate shapes in the loss sparkline

**Goal:** Recognize healthy vs problematic training by sparkline shape.

## Setup
- Dataset: **Separable**.
- Activation: **step**.
- Try **η = 0.05**, **0.5**, **1.0**.

## Actions
1. Train 1 epoch for each η; observe the loss sparkline.
2. Save a snapshot for each and compare final accuracy.

## Observe
- Small η → gentle, monotonic-ish decline.
- Mid η → quick drop then taper.
- Large η → oscillation or plateau.

## Why it matters
- Sparkline shape is a fast diagnostic for η selection.

## Expected outcomes
- Mid η often gives the best time-to-accuracy on clean data.
