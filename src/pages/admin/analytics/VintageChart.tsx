import { useId } from "react";
import type { VintageCohort } from "../../../api/adminAnalytics";
import { ChartShell, axisTicks, labelStep, type LegendItem } from "../../../components/charts/chartShell";
import { formatMonth } from "../parts/adminLabels";
import { pct } from "./riskLabels";

const W = 640;
const H = 260;
const PAD = { top: 20, right: 24, bottom: 40, left: 56 };
/** 선 색은 그림 계열 토큰을 돌려 쓴다. 6개를 넘는 코호트는 표에서만 본다. */
const SERIES = ["var(--series-principal)", "var(--series-interest)", "var(--series-fee)", "var(--series-overdue)", "var(--series-balance)", "var(--ac-doubtful)"];
const MAX_LINES = SERIES.length;

/**
 * 빈티지 다중 선(S-220): 가로 = 경과 개월(MOB, 실행월 = 0), 세로 = 30일+ 연체 잔액 ÷ 코호트 실행 원금(%).
 * 코호트마다 선 하나·점, 색과 함께 점 모양(채움/빈 점)을 번갈아 색만으로 구분하지 않게 한다. ChartShell 이 범례·요약·값 표를 붙인다.
 */
export default function VintageChart({ cohorts, maxMob, thresholdDays }: { cohorts: VintageCohort[]; maxMob: number; thresholdDays: number }) {
  const id = useId();
  const shown = cohorts.filter(c => c.points.length > 0).slice(-MAX_LINES);
  const all = shown.flatMap(c => c.points);
  const max = Math.max(1, ...all.map(p => p.ratio));
  const { top, ticks } = axisTicks(max);
  const span = Math.max(1, maxMob);
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const x = (mob: number) => PAD.left + (innerW * mob) / span;
  const y = (v: number) => PAD.top + innerH - (innerH * v) / top;
  const step = labelStep(span + 1, 13);
  const peak = shown.flatMap(c => c.points.map(p => ({ cohort: c.cohort, ...p }))).sort((a, b) => b.ratio - a.ratio)[0];
  const summary = shown.length === 0
    ? "월마감이 지난 코호트가 없어 그릴 선이 없다."
    : `코호트 ${shown.length}개(${formatMonth(shown[0].cohort)}~${formatMonth(shown[shown.length - 1].cohort)}). `
      + (peak && peak.ratio > 0
        ? `가장 높은 점은 ${formatMonth(peak.cohort)} 실행분의 경과 ${peak.mob}개월 ${pct(peak.ratio, 2)}이다.`
        : `모든 점이 0%다 — ${thresholdDays}일 이상 연체 잔액이 아직 없다.`);
  const legend: LegendItem[] = shown.map((c, i) => {
    const last = c.points[c.points.length - 1];
    return { color: SERIES[i % SERIES.length], label: formatMonth(c.cohort), value: last ? `MOB ${last.mob} ${pct(last.ratio)}` : undefined };
  });
  const mobs = Array.from({ length: span + 1 }, (_, i) => i);

  return (
    <ChartShell
      title={`빈티지 — ${thresholdDays}일 이상 연체 잔액 비율`}
      note="가로 경과 개월(실행월 = 0), 세로 30일+ 연체 잔액 ÷ 코호트 실행 원금"
      legend={legend}
      summary={summary}
      data={(
        <div className="table-scroll vintage-data">
          <table className="table table-compact">
            <caption className="sr-only">코호트별 경과 개월 값</caption>
            <thead>
              <tr>
                <th scope="col">실행월</th>
                <th scope="col" className="num">계약</th>
                {mobs.map(m => <th key={m} scope="col" className="num">MOB {m}</th>)}
              </tr>
            </thead>
            <tbody>
              {cohorts.map(c => (
                <tr key={c.cohort}>
                  <th scope="row" className="nowrap">{formatMonth(c.cohort)}</th>
                  <td className="num">{c.contracts}</td>
                  {mobs.map(m => {
                    const p = c.points.find(pt => pt.mob === m);
                    return <td key={m} className="num">{p ? pct(p.ratio, 2) : "—"}</td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    >
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-labelledby={`${id}-t`} aria-describedby={`${id}-d`}>
        <title id={`${id}-t`}>빈티지 곡선</title>
        <desc id={`${id}-d`}>{summary}</desc>
        {ticks.map(t => (
          <g key={t}>
            <line className="chart-grid" x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} />
            <text className="chart-label" x={PAD.left - 8} y={y(t) + 4} textAnchor="end">{`${Number(t.toFixed(1))}%`}</text>
          </g>
        ))}
        <line className="chart-axis" x1={PAD.left} x2={W - PAD.right} y1={y(0)} y2={y(0)} />
        {mobs.filter(m => m % step === 0 || m === span).map(m => (
          <text key={m} className="chart-label" x={x(m)} y={H - 18} textAnchor="middle">{m}</text>
        ))}
        <text className="chart-label" x={W - PAD.right} y={H - 4} textAnchor="end">경과 개월(MOB)</text>
        {shown.map((c, i) => {
          const pts = c.points.map(p => `${x(p.mob).toFixed(1)},${y(p.ratio).toFixed(1)}`).join(" ");
          return (
            <g key={c.cohort} className={`vintage-series vintage-s${i % SERIES.length}`}>
              {c.points.length > 1 && <polyline className="vintage-line" points={pts} />}
              {c.points.map(p => (
                <circle key={p.mob} className={i % 2 === 0 ? "vintage-dot" : "vintage-dot vintage-dot-hollow"} cx={x(p.mob)} cy={y(p.ratio)} r={3.5} />
              ))}
            </g>
          );
        })}
      </svg>
    </ChartShell>
  );
}
