import { describe, expect, it } from 'vitest';
import { endYearOf, valueAtYear, yearTicks } from '../chartUtils';
import { calculateProjection, SAMPLE_SCENARIOS } from '../domain';

describe('yearTicks', () => {
  it('always includes the first and last year', () => {
    expect(yearTicks(20)).toEqual([0, 5, 10, 15, 20]);
    expect(yearTicks(1)).toEqual([0, 1]);
    expect(yearTicks(60)).toEqual([0, 10, 20, 30, 40, 50, 60]);
  });

  it('adds intermediate ticks for long horizons', () => {
    const ticks = yearTicks(45);
    expect(ticks[0]).toBe(0);
    expect(ticks[ticks.length - 1]).toBe(45);
    expect(ticks.length).toBeGreaterThan(3);
  });

  it('drops a penultimate tick that crowds the final label', () => {
    expect(yearTicks(54)).toEqual([0, 10, 20, 30, 40, 54]);
  });
});

describe('projection lookups', () => {
  it('reads the value at a year and returns null beyond the horizon', () => {
    const projection = calculateProjection({ ...SAMPLE_SCENARIOS[0], years: 10 });
    expect(endYearOf(projection)).toBe(10);
    expect(valueAtYear(projection, 5)).toBe(projection.points[5].nominal);
    expect(valueAtYear(projection, 11)).toBeNull();
  });
});
