# Episode 1 Script — What you’re looking at (≈4 minutes)

**Audience:** engineers new to ML. **Goal:** orient to panels; build two core metaphors.

## Hook (0:00–0:20)
> “We’re going to teach a model to draw a single straight line that separates two kinds of dots.”

## Panels tour (0:20–1:20)
- Top-left: **Controls** — dataset, activation, η, epochs. (Mixer board metaphor: each weight is a volume knob; bias is baseline volume.)
- Center: **Decision boundary** — the line where the model is undecided.
- Right: **Dataset studio** + **Cheat sheet** drawer.
- Bottom: **Loss trend** and **Training snapshot**.

## Step decision (1:20–2:10)
- Set **Activation = step**.
- Click **Step once** 3–5×; halos shrink; save a snapshot.
- Explain **z = w·x + b** as a seesaw tilt; **step** checks if z ≥ 0.

## Sigmoid preview (2:10–3:10)
- Switch to **sigmoid**; show probability read as **confidence** in 0…1.
- Move **τ** a little; boundary shifts. Explain **b′ = b − logit(τ)** in one line, then restate: “moving the door jamb.”

## Close (3:10–4:00)
- Recap: knobs (η/epochs), line (boundary), decision (step), confidence (sigmoid), τ cutoff.
- Next episode: watch one training step happen smoothly.
