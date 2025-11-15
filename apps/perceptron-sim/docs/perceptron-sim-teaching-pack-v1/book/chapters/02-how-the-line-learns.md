# Chapter 2 — How the line learns (Δw, Δb and η)

## A single nudge
Click **Step once** and watch the boundary *ease* to a new spot. That’s the update (Δw, Δb). The model moves the line to correct mistakes.

## Learning-rate η
η is the size of that nudge.
- Small η → smooth but slow progress.
- Large η → fast but can wobble or overshoot.

**Try it**
1. η = 0.05 → Step 10×. Loss decays smoothly.
2. η = 1.0 → Step 10×. Loss may oscillate; halos can return.
3. Save snapshots at **init/mid/final** to visualize the trajectory.

## Epochs
An **epoch** is one full pass over all points. After each epoch, the model has “heard” from every example once.

## Noise changes the game
With **Noisy separable**, perfect accuracy is impossible; instead, watch loss plateau and choose a good-enough stopping point.

## Optional math sidebar
- For misclassified sample (x, y), a simple perceptron update is: w ← w + η·(y−ŷ)·x, b ← b + η·(y−ŷ).
- You don’t need to memorize this; the Sim shows the effect visually.

## Why this chapter matters
Once you see what Δw, Δb and η *do*, you can read training curves and debug: stuck (η too small), oscillating (η too big), or impossible (noisy/XOR).
