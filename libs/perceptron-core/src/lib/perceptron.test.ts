import { describe, expect, it } from 'vitest';
import { binaryCombinations, weightedSum } from './perceptron';

describe('perceptron lib', () => {
  it('weightedSum computes z = ∑ᵢ wᵢxᵢ + b', () => {
    const x = [1, 0, 1];
    const w = [0.5, -1.0, 0.25];
    const b = -0.1;
    const z = weightedSum(x, w, b);
    expect(z).toBeCloseTo(0.75 - 0.1, 6);
  });
  it('binaryCombinations returns 2^n rows of length n', () => {
    const rows = binaryCombinations(3);
    expect(rows.length).toBe(8);
    for (const r of rows) {
      expect(r.length).toBe(3);
      for (const bit of r) expect([0, 1]).toContain(bit);
    }
  });
});
