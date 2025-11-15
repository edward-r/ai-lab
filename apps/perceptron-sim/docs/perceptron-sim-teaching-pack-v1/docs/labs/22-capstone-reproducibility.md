# Lab 22 — Capstone: Reproducibility Checklist

**Goal:** Prove that your experiments can be repeated exactly across sessions and machines.

## Deliverables
- A filled **Experiment Log** (CSV) with two separate runs that match.
- A **procedure** (≤100 words) for reproducing your results.
- Screenshots (optional) confirming identical metrics.

## Setup
- Pick a dataset (Separable or Noisy) and a **seed** value (e.g., 42).
- Activation: choose **step** or **sigmoid** and stick to it.
- Fix **η, epochs, τ** (if sigmoid).

## Actions
1. Record configuration in `docs/templates/experiment-log.csv` (Run A).
2. Train exactly as recorded; log final **accuracy**, **loss**, and (if sigmoid) **precision/recall/F₁**.
3. Refresh the page (or restart the app) and repeat as **Run B** with the same seed and parameters.
4. Compare results; they should match within floating point tolerance.

## Observe
- Identical seeds produce identical datasets and trajectories.
- Deviations typically come from changed params or missing seeds.

## Why it matters
- Reproducibility enables **fair comparisons**, debugging, and credible communication.

## Expected outcomes
- Matching metrics between Run A and Run B.
- A 5‑step procedure someone else could follow to reproduce your result.
