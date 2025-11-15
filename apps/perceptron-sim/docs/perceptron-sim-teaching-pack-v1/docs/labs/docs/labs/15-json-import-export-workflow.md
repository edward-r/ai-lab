# Lab 15 — JSON import/export workflow

**Goal:** Round-trip datasets and test edge cases.

## Setup
- Any dataset. Activation: any.

## Actions
1. Export the current dataset to JSON.
2. Edit to add a few **outliers** or flip labels on a handful of points.
3. Import and retrain; observe boundary/metrics changes.

## Observe
- Outliers near the boundary can swing the line; flipped labels inject noise.

## Why it matters
- JSON I/O is a powerful way to create teaching scenarios and bug repros.

## Expected outcomes
- Boundary adapts to the edited data; metrics reflect your changes.
