import { describe, expect, it } from 'vitest';
import { yearTicks } from '../components/ComparisonChart';

describe('yearTicks', () => {
  it('always includes the first and last year', () => {
    expect(yearTicks(20)).toEqual([0, 5, 10, 15, 20]);
    expect(yearTicks(60)).toEqual([0, 10, 20, 30, 40, 50, 60]);
    expect(yearTicks(1)).toEqual([0, 1]);
  });

  it('fills intermediate years without overcrowding the axis', () => {
    const ticks = yearTicks(45);
    expect(ticks[0]).toBe(0);
    expect(ticks[ticks.length - 1]).toBe(45);
    expect(ticks.length).toBeLessThanOrEqual(9);
    expect(yearTicks(7)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
  });
});
