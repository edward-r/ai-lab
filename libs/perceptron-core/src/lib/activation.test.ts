import { describe, expect, it } from 'vitest';
import { sigmoid, step } from './activation';

describe('activation', () => {
  it('step', () => {
    expect(step(-1)).toBe(0);
    expect(step(0)).toBe(1);
    expect(step(2)).toBe(1);
  });
  it('sigmoid monotonic & bounded', () => {
    expect(sigmoid(-10)).toBeGreaterThan(0);
    expect(sigmoid(-10)).toBeLessThan(0.01);
    expect(sigmoid(10)).toBeLessThan(1.0);
    expect(sigmoid(10)).toBeGreaterThan(0.99);
  });
});
