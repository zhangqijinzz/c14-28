import { useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { formatMoney } from '../domain';
import type { FinanceScenario, ScenarioProjection } from '../types';

interface Props {
  scenarios: FinanceScenario[];
  projections: ScenarioProjection[];
  selectedId: string;
  onSelect: (id: string) => void;
}

const WIDTH = 760;
const HEIGHT = 300;
const PAD = { top: 24, right: 24, bottom: 36, left: 62 };

export function yearTicks(maxYears: number): number[] {
  const step = [1, 2, 5, 10, 20, 30].find((candidate) => maxYears / candidate <= 8) ?? 60;
  const ticks: number[] = [];
  for (let year = 0; year < maxYears; year += step) ticks.push(year);
  const last = ticks[ticks.length - 1];
  if (last !== maxYears) {
    if (maxYears - last < step * 0.45) ticks[ticks.length - 1] = maxYears;
    else ticks.push(maxYears);
  }
  return ticks;
}

export function ComparisonChart({ scenarios, projections, selectedId, onSelect }: Props) {
  const [hoverYear, setHoverYear] = useState<number | null>(null);
  const maxYears = Math.max(...projections.map((projection) => projection.points[projection.points.length - 1]?.year ?? 1), 1);
  const maxValue = Math.max(...projections.flatMap((projection) => projection.points.map((point) => point.nominal)), 1);
  const plotWidth = WIDTH - PAD.left - PAD.right;
  const plotHeight = HEIGHT - PAD.top - PAD.bottom;
  const x = (year: number) => PAD.left + (year / maxYears) * plotWidth;
  const y = (value: number) => HEIGHT - PAD.bottom - (value / maxValue) * plotHeight;
  const yTicks = [0, 0.25, 0.5, 0.75, 1];
  const xTicks = yearTicks(maxYears);
  // 悬停状态只保存年份数字、不保存情景引用；情景增删后读数自动钳制到新的坐标范围内，不会残留指向已删除情景的内容
  const activeYear = hoverYear === null ? null : Math.min(hoverYear, maxYears);

  const handlePointerMove = (event: ReactPointerEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const svgX = ((event.clientX - rect.left) / rect.width) * WIDTH;
    const year = Math.round(((svgX - PAD.left) / plotWidth) * maxYears);
    setHoverYear(Math.max(0, Math.min(maxYears, year)));
  };

  const rows = scenarios.map((scenario) => {
    const projection = projections.find((item) => item.scenarioId === scenario.id);
    const point = activeYear === null ? undefined : projection?.points.find((item) => item.year === activeYear);
    return { scenario, projection, point };
  });
  // 正在编辑的情景最后绘制，保证压在淡化曲线之上
  const ordered = [...projections].sort((a, b) => Number(a.scenarioId === selectedId) - Number(b.scenarioId === selectedId));

  return (
    <div className="chart-shell">
      <div className="chart-legend">
        {rows.map(({ scenario, projection }) => {
          const endYear = projection?.points[projection.points.length - 1]?.year ?? 0;
          const endsEarly = projection !== undefined && endYear < maxYears;
          const isActive = scenario.id === selectedId;
          return (
            <button key={scenario.id} type="button" className={`legend-item ${isActive ? 'is-active' : ''}`} aria-pressed={isActive} onClick={() => onSelect(scenario.id)}>
              <i style={{ background: scenario.color }} />
              {scenario.name}
              {endsEarly && <em>{endYear} 年止</em>}
              {isActive && <b>编辑中</b>}
            </button>
          );
        })}
        <span className="legend-note">名义终值 · 情景模拟</span>
      </div>
      <div className="chart-wrap">
        <svg className="chart" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label="情景终值趋势比较图" onPointerMove={handlePointerMove} onPointerLeave={() => setHoverYear(null)}>
          {yTicks.map((tick) => {
            const value = maxValue * tick;
            return <g key={tick}><line x1={PAD.left} x2={WIDTH - PAD.right} y1={y(value)} y2={y(value)} className="grid-line" /><text x={PAD.left - 10} y={y(value) + 4} textAnchor="end" className="axis-label">{formatMoney(value)}</text></g>;
          })}
          {xTicks.map((year) => (
            <g key={year}>
              <line x1={x(year)} x2={x(year)} y1={HEIGHT - PAD.bottom} y2={HEIGHT - PAD.bottom + 5} className="tick-mark" />
              <text x={x(year)} y={HEIGHT - 10} textAnchor={year === 0 ? 'start' : year === maxYears ? 'end' : 'middle'} className="axis-label">第 {year} 年</text>
            </g>
          ))}
          {ordered.map((projection) => {
            const scenario = scenarios.find((item) => item.id === projection.scenarioId);
            if (!scenario) return null;
            const isActive = scenario.id === selectedId;
            const path = projection.points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${x(point.year)} ${y(point.nominal)}`).join(' ');
            return <path key={projection.scenarioId} d={path} className={`chart-line ${isActive ? 'is-active' : 'is-dimmed'}`} stroke={scenario.color} />;
          })}
          {ordered.map((projection) => {
            const scenario = scenarios.find((item) => item.id === projection.scenarioId);
            const final = projection.points[projection.points.length - 1];
            if (!scenario || !final || final.year >= maxYears) return null;
            return (
              <circle key={`end-${projection.scenarioId}`} cx={x(final.year)} cy={y(final.nominal)} r={4} className="chart-end-dot" fill={scenario.color}>
                <title>{`${scenario.name}：第 ${final.year} 年结束`}</title>
              </circle>
            );
          })}
          {activeYear !== null && (
            <g>
              <line x1={x(activeYear)} x2={x(activeYear)} y1={PAD.top} y2={HEIGHT - PAD.bottom} className="chart-guide" />
              {rows.map(({ scenario, point }) => point && (
                <circle key={`hover-${scenario.id}`} cx={x(activeYear)} cy={y(point.nominal)} r={scenario.id === selectedId ? 4.5 : 3.5} className="chart-hover-dot" fill={scenario.color} />
              ))}
            </g>
          )}
        </svg>
        {activeYear !== null && (
          <div className={`chart-tooltip ${activeYear > maxYears / 2 ? 'flip' : ''}`} style={{ left: `${(x(activeYear) / WIDTH) * 100}%` }}>
            <strong>第 {activeYear} 年</strong>
            {rows.map(({ scenario, point }) => (
              <div key={scenario.id} className={`tooltip-row ${scenario.id === selectedId ? 'is-active' : ''}`}>
                <i style={{ background: scenario.color }} />
                <span>{scenario.name}</span>
                {point ? <b>¥ {formatMoney(point.nominal)}</b> : <b className="ended">已结束</b>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
