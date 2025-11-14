export type HelpKey =
  | 'activation'
  | 'dataset'
  | 'eta'
  | 'epochs'
  | 'rngSeed'
  | 'lossGranularity'
  | 'trainControls'
  | 'tau'
  | 'useTauBoundary'
  | 'baselineTau'
  | 'marginBand'
  | 'saveSnapshot'
  | 'clearSnapshot'
  | 'snapshotOverlay'
  | 'trainingSnapshot'
  | 'accuracy'
  | 'loss'
  | 'parameters'
  | 'lossTrend'
  | 'decisionBoundary'
  | 'confusion'
  | 'precision'
  | 'recall'
  | 'specificity'
  | 'f1'
  | 'roc'
  | 'auc'
  | 'datasetStudio'
  | 'presets'
  | 'xor'
  | 'noisy'
  | 'jsonImportExport'
  | 'classicDials'
  | 'truthTable'
  | 'trainEpoch'

export const HELP: Record<HelpKey, string> = {
  activation:
    'Activation φ converts score z into a prediction. Step (perceptron) outputs 0/1 via z ≥ 0. Sigmoid maps z → p = 1/(1+e^(−z)), a probability for class 1.',
  dataset:
    'Choose a sample set of labeled points. Linear separable can be split by a line. XOR is not linearly separable. Noisy separable flips some labels to add overlap.',
  eta: 'η (learning-rate) scales each update: larger η learns faster but can overshoot; smaller η is steadier but slower.',
  epochs:
    'Epochs are full passes over the dataset. Perceptron converges in finite steps on separable data; with noise it may not reach 100% accuracy.',
  rngSeed:
    'RNG seed makes runs reproducible: shuffles, blobs, and noise use the same sequence for a given seed.',
  lossGranularity:
    'Loss granularity controls how often loss is recorded: per-step (micro view) vs per-epoch (macro trend).',
  trainControls:
    'Start/Pause runs the loop; Step-once applies one update; Reset clears state. Use keyboard: Space, N, R.',
  tau: 'Threshold τ classifies sigmoid probability p as 1 if p ≥ τ. Geometrically: z ≥ logit(τ) so the effective bias is b′ = b − logit(τ).',
  useTauBoundary:
    'Draw the τ-boundary (z = logit(τ)) instead of the baseline τ = 0.5 line, to visualize how changing τ shifts the line without changing weights.',
  baselineTau:
    'Show the baseline decision line for τ = 0.5 (i.e., z = 0). Useful as a reference when τ ≠ 0.5.',
  marginBand:
    'Shows a faint strip around the line proportional to 1/‖w‖ as a margin intuition. Misclassified points get a halo.',
  saveSnapshot:
    'Save the current (w, b) so you can overlay it later. Great for before/after comparisons.',
  clearSnapshot: 'Remove a saved snapshot overlay.',
  snapshotOverlay:
    'Toggle overlay of saved boundaries (e.g., init/mid/final) to compare learning trajectories.',
  trainingSnapshot:
    'Live counters and aggregates during training: epoch, step, accuracy, loss, and current parameters.',
  accuracy:
    'Accuracy = (TP+TN)/(TP+TN+FP+FN). Good for balanced classes; can mislead on imbalance.',
  loss: 'Loss measures error per sample: logistic loss for sigmoid (cross-entropy), perceptron surrogate for step. It’s a more informative training signal than raw accuracy.',
  parameters: 'Current parameters: w₁, w₂ (line slope) and b (intercept).',
  lossTrend: 'Loss over time; use per-step for micro-oscillations and per-epoch for overall trend.',
  decisionBoundary:
    'Decision boundary is the line where the model is indifferent between classes. For sigmoid with threshold τ: w·x + b = logit(τ).',
  confusion:
    'Confusion matrix counts: TP (1→1), TN (0→0), FP (0→1), FN (1→0). Drives precision/recall/specificity/F₁.',
  precision: 'Precision = TP/(TP+FP). Of predicted positives, how many were correct?',
  recall: 'Recall (TPR) = TP/(TP+FN). Of true positives, how many did we find?',
  specificity:
    'Specificity (TNR) = TN/(TN+FP). Of true negatives, how many did we correctly reject?',
  f1: 'F₁ = 2·(precision·recall)/(precision+recall). Harmonic mean balancing precision and recall.',
  roc: 'ROC plots TPR vs FPR as τ sweeps 0→1. Drag the dashed guide to change τ here, or use the slider.',
  auc: 'AUC is area under ROC. 0.5 ≈ random; closer to 1.0 is better separation.',
  datasetStudio:
    'Dataset studio lets you curate points, generate blobs, switch presets, and import/export JSON.',
  presets:
    'Presets: Separable (linearly separable), XOR (not linearly separable), Noisy (overlap added).',
  xor: 'XOR is not linearly separable: any straight line misclassifies at least one quadrant. Use it to show perceptron limits.',
  noisy:
    'Noisy separable flips a subset of labels. Perfect accuracy is impossible; observe the trade-offs as τ changes.',
  jsonImportExport:
    'Use JSON to import/export [{ x:[x₁,x₂], y }]. Handy for saving or sharing datasets.',
  classicDials:
    'Manual dials set w₁, w₂, and b directly. Great for building intuition about slope/intercept and z = w·x + b.',
  truthTable:
    'Truth table shows z and φ(z) row-by-row for discrete inputs (0/1). Useful for logic-gate style demos.',
  trainEpoch: 'Runs one full pass over the truth table with the current learning-rate η.',
}
