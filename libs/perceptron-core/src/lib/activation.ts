export function step(z: number): number {
  return z >= 0 ? 1 : 0;
}

export function sigmoid(z: number): number {
  return 1 / (1 + Math.exp(-z));
}
