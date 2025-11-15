# Episode 2 Script — Watch the model learn (≈5 minutes)

**Goal:** show Δw,Δb visually; explain η and epochs; gentle view of noise.

## Open (0:00–0:20)
> “Let’s actually *see* a single learning step.”

## Step-once animation (0:20–1:30)
- Activation **step**; Dataset **Separable**.
- Click **Step once** while narrating: the line *eases* to its new place; show Δ arrow.
- Metaphor: the line is a *boundary the model nudges* to reduce mistakes.

## Learning-rate (1:30–2:40)
- Set **η = 0.05** → step a few times: slow & smooth loss.
- Set **η = 1.0** → step a few times: fast but wobbly; halos may reappear.
- Rule of thumb: try small, then raise until you see wobble, then back off.

## Epochs (2:40–3:30)
- Train **1 epoch**; count = one pass over all points.
- Save **init/mid/final** snapshots and overlay to show the trajectory.

## Noise reality (3:30–4:40)
- Switch to **Noisy**; train; show that perfection is impossible.
- Move **τ** in sigmoid mode to pick where you accept errors.

## Close (4:40–5:00)
- Summary: Δw,Δb are the change; η is the step size; an epoch is a full pass; noise requires trade-offs.
