# Lab 1 — Hello, boundary (step mode)

**Goal:** See how a single update rotates/translates the line and reduces mistakes.

## Setup
- Open **Perceptron Lab** tab.
- Dataset: **Separable** preset.
- Activation: **step**.
- Ensure **η (learning-rate)** = `0.2`, **epochs** = `3`, **loss** = per-step (optional).
- Clear snapshots. Zoom is not required.

## Actions
1. Click **Step once** 10–20×. Save snapshots labeled **init**, **mid**, **final** along the way.
2. Toggle overlays to compare boundaries.
3. (Optional) Set **η** to `0.05` and repeat 10 steps. Then set **η** to `1.0` and repeat 10 steps.

## Observe
- The decision line pivots/shift toward separating the two clouds.
- Misclassified points get **halos**; halo count decreases over steps.
- With **η=0.05**: smooth but slow; with **η=1.0**: faster but can wobble/overshoot.

## Why it matters
- The perceptron learns by adjusting the **weights 𝒘** and **bias b** so the line better separates labels.
- Each **Step once** is a tiny correction; **η** scales the size of that correction.

## Expected outcomes
- Accuracy climbs above **95%** on small clean sets in ≤ 2 epochs.
- Loss trend: monotone-ish decrease; mild oscillation if η is large.

## Notes
- Snapshot overlays help build the mental model of “trajectory of learning.”
- You can “Reset to snapshot” to continue from any saved boundary.
