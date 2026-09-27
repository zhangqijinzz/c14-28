import type { ScenarioProjection } from './types';

/**
 * 计算 X 轴年份刻度：始终包含首末年，中间按“漂亮”步长均匀分布，
 * 倒数第二个刻度若离末年太近则去掉，避免标签互相挤压。
 */
export function yearTicks(maxYears: number): number[] {
  if (maxYears <= 1) return maxYears === 1 ? [0, 1] : [0];
  const candidates = [1, 2, 5, 10, 15, 20, 30];
  const step = candidates.find((candidate) => maxYears / candidate <= 8) ?? 60;
  const ticks: number[] = [0];
  for (let year = step; year < maxYears; year += step) ticks.push(year);
  if (ticks.length > 1 && maxYears - ticks[ticks.length - 1] < step * 0.5) ticks.pop();
  ticks.push(maxYears);
  return ticks;
}

/** 情景覆盖的最后一年（points 按年递增，最后一个点即终点）。 */
export function endYearOf(projection: ScenarioProjection): number {
  return projection.points[projection.points.length - 1]?.year ?? 0;
}

/** 读取某年的名义值；该年超出情景年限时返回 null（曲线已结束）。 */
export function valueAtYear(projection: ScenarioProjection, year: number): number | null {
  const point = projection.points[year];
  return point && point.year === year ? point.nominal : null;
}
