# Chapter 1 — What you’re looking at

## The promise
We’re about to draw a single straight line that divides two kinds of dots. That’s all a perceptron is: a line that decides.

## The panels (and what they teach)
- **Controls:** pick a dataset, choose the decision style (step vs sigmoid), set how big each learning step is (η), and how many passes to make (epochs).
- **Decision boundary:** the live line where the model is undecided. You’ll *see* it move as the model learns.
- **Dataset studio:** change the world the model sees—clean separable, noisy overlap, or XOR (impossible for one line).
- **Training snapshot & loss:** quick health check—are mistakes shrinking?
- **Thresholded metrics (sigmoid):** when we care about trade-offs, this is how we choose a cutoff.

## Two metaphors you’ll reuse
- **Mixer board:** Each weight wᵢ is a volume knob for input xᵢ; bias b is baseline volume.
- **Seesaw:** The score z = ∑wᵢxᵢ + b is a tilt; **step** asks “is z ≥ 0?”

## A first run (2 minutes)
1. Dataset: **Separable**. Activation: **step**.
2. Click **Step once** a few times. Save **init** and **final** snapshots—overlay them.
3. Notice halos (mistakes) shrinking.

## Optional math sidebar
- z = ∑wᵢxᵢ + b (tilt). Step outputs 1 if z ≥ 0, else 0.
- The boundary is the line where z = 0.

## Why this chapter matters
You know what each panel is for and what will change when you press a button. Confidence will replace mystery.
