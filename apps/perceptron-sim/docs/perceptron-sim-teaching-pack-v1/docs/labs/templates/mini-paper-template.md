# Title: <Your concise title>

**Abstract (≤120 words).**  
Summarize the goal, method (dataset, seed, activation, η, epochs, τ‑selection), and the main result (metrics + insight).

## Methods
- **Dataset & seed:** e.g., Noisy separable, seed=42
- **Activation:** step or sigmoid
- **Learning‑rate η:** e.g., 0.2
- **Epochs:** e.g., 3
- **Threshold selection:** e.g., τ Picker (maximize F₁)
- **Procedure:** bullet list, 4–6 steps

## Results
| τ    | Accuracy | Precision | Recall | F₁  | AUC |
|------|----------|-----------|--------|-----|-----|
| 0.50 |          |           |        |     |     |
| 0.60 |          |           |        |     |     |
| 0.70 |          |           |        |     |     |

Add 1–2 **annotated screenshots** from the Sim here (boundary + metrics).

## Discussion
- What worked, what didn’t, and why.
- Threats to validity (noise, class imbalance, small sample).

## Repro Notes
1. Open Sim; set seed, dataset, activation.
2. Train N epochs.
3. Use τ Picker to select τ.
4. Record metrics and screenshots.
