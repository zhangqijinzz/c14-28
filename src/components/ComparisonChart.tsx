import { useState } from 'react';
import type { PointerEvent } from 'react';
import { formatMoney } from '../domain';
import { endYearOf, valueAtYear, yearTicks } from '../chartUtils';
import type { FinanceScenario, ScenarioProjection } from '../types';

interface Props {
  scenarios: FinanceScenario[];
  projections: ScenarioProjection[];
  activeId: string;
  onSelect: (id: string) => void;
}

const WIDTH = 760;
const HEIGHT = 300;
const PAD = { top: 24, right: 24, bottom: 36, left: 62 };
const Y_TICKS = [0, 0.25, 0.5, 0.75, 1];

export function ComparisonChart({ scenarios, projections, activeId, onSelect }: Props) {
  const [hoverYear, setHoverYear] = useState<number | null>(null);
  const maxYears = Math.max(...projections.map((projection) => endYearOf(projection)), 1);
  const maxValue = Math.max(...projections.flatMap((projection) => projection.points.map((point) => point.nominal)), 1);
  const x = (year: number) => PAD.left + (year / maxYears) * (WIDTH - PAD.left - PAD.right);
  const y = (value: number) => HEIGHT - PAD.bottom - (value / maxValue) * (HEIGHT - PAD.top - PAD.bottom);
  const xTicks = yearTicks(maxYears);
  const activeProjection = projections.find((projection) => projection.scenarioId === activeId);
  // 当前情景最后绘制，保证它的曲线压在其余曲线之上
  const orderedProjections = [...projections].sort((a, b) => Number(a.scenarioId === activeId) - Number(b.scenarioId === activeId));
  // 悬停年份只存一个数字，读数完全由当前 projections 推导，情景增删后不会残留失效引用
  const hover = hoverYear === null ? null : Math.min(hoverYear, maxYears);
  const tooltipSide = hover === null ? '' : x(hover) / WIDTH > 0.72 ? ' tip-right' : x(hover) / WIDTH < 0.2 ? ' tip-left' : '';

  const handlePointer = (event: PointerEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const svgX = ((event.clientX - rect.left) / rect.width) * WIDTH;
    const ratio = (svgX - PAD.left) / (WIDTH - PAD.left - PAD.right);
    setHoverYear(Math.max(0, Math.min(maxYears, Math.round(ratio * maxYears))));
  };

  return (
    <div className="chart-shell">
      <div className="chart-legend">
        {scenarios.map((scenario) => {
          const projection = projections.find((item) => item.scenarioId === scenario.id);
          const endYear = projection ? endYearOf(projection) : null;
          return (
            <button
              key={scenario.id}
              type="button"
              className={`legend-item${scenario.id === activeId ? ' is-active' : ''}`}
              aria-pressed={scenario.id === activeId}
              onClick={() => onSelect(scenario.id)}
            >
              <i style={{ background: scenario.color }} />
              {scenario.name}
              {endYear !== null && endYear < maxYears && <em>第 {endYear} 年止</em>}
              {!projection && <em>参数待修正</em>}
            </button>
          );
        })}
        <span className="legend-note">名义终值 · 情景模拟</span>
      </div>
      <div className="chart-plot">
        <svg
          className="chart"
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          role="img"
          aria-label="情景终值趋势比较图"
          onPointerMove={handlePointer}
          onPointerDown={handlePointer}
          onPointerLeave={() => setHoverYear(null)}
        >
          {Y_TICKS.map((tick) => {
            const value = maxValue * tick;
            return (
              <g key={tick}>
                <line x1={PAD.left} x2={WIDTH - PAD.right} y1={y(value)} y2={y(value)} className="grid-line" />
                <text x={PAD.left - 10} y={y(value) + 4} textAnchor="end" className="axis-label">{formatMoney(value)}</text>
              </g>
            );
          })}
          {xTicks.map((year) => (
            <g key={year}>
              <line x1={x(year)} x2={x(year)} y1={PAD.top} y2={HEIGHT - PAD.bottom} className="grid-line" />
              <line x1={x(year)} x2={x(year)} y1={HEIGHT - PAD.bottom} y2={HEIGHT - PAD.bottom + 5} className="year-tick" />
              <text
                x={x(year)}
                y={HEIGHT - 10}
                textAnchor={year === 0 ? 'start' : year === maxYears ? 'end' : 'middle'}
                className={`axis-label${hover === year ? ' is-hover' : ''}`}
              >
                第 {year} 年
              </text>
            </g>
          ))}
          {orderedProjections.map((projection) => {
            const scenario = scenarios.find((item) => item.id === projection.scenarioId);
            if (!scenario) return null;
            const isActive = projection.scenarioId === activeId;
            const path = projection.points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${x(point.year)} ${y(point.nominal)}`).join(' ');
            const endYear = endYearOf(projection);
            return (
              <g key={projection.scenarioId} className={`series${isActive ? ' is-active' : activeProjection ? ' is-dim' : ''}`}>
                <path d={path} className="chart-line" stroke={scenario.color} />
                {endYear < maxYears && (
                  <circle className="end-marker" cx={x(endYear)} cy={y(projection.points[projection.points.length - 1].nominal)} r={isActive ? 5.5 : 4.5} fill={scenario.color} />
                )}
              </g>
            );
          })}
          {hover !== null && (
            <g className="hover-layer">
              <line x1={x(hover)} x2={x(hover)} y1={PAD.top} y2={HEIGHT - PAD.bottom} className="crosshair" />
              {projections.map((projection) => {
                const scenario = scenarios.find((item) => item.id === projection.scenarioId);
                const value = valueAtYear(projection, hover);
                if (!scenario || value === null) return null;
                return <circle key={projection.scenarioId} className="hover-dot" cx={x(hover)} cy={y(value)} r={projection.scenarioId === activeId ? 5 : 3.5} fill={scenario.color} />;
              })}
            </g>
          )}
        </svg>
        {hover !== null && (
          <div className={`chart-tooltip${tooltipSide}`} style={{ left: `${(x(hover) / WIDTH) * 100}%` }}>
            <h4>第 {hover} 年</h4>
            <ul>
              {scenarios.map((scenario) => {
                const projection = projections.find((item) => item.scenarioId === scenario.id);
                const value = projection ? valueAtYear(projection, hover) : null;
                return (
                  <li key={scenario.id} className={scenario.id === activeId ? 'is-active' : ''}>
                    <i style={{ background: scenario.color }} />
                    <span>{scenario.name}</span>
                    {projection && value !== null
                      ? <b>¥ {formatMoney(value)}</b>
                      : projection
                        ? <b className="tip-muted">第 {endYearOf(projection)} 年止</b>
                        : <b className="tip-muted">参数待修正</b>}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
