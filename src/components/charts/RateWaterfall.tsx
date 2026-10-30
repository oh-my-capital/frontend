import { useId } from "react";
import { formatRate } from "../../lib/format";
import { ChartShell } from "./chartShell";

export interface RateStep { label: string; delta: number; note?: string }

const W = 720;
const H = 240;
const PAD = { top: 26, right: 16, bottom: 46, left: 56 };

/**
 * 적용 금리의 구성을 계단(워터폴)으로 그린다. 기준금리에서 시작해 밴드 스프레드·상품 가산을 올리고
 * 우대를 내려 적용 금리에 닿는 과정을 보여 준다. 올리는 칸은 황토, 내리는 칸은 초록, 합계 칸은 남색이다.
 * `steps` 의 첫 항목은 시작값(기준금리)이고 나머지는 증감이다.
 */
export default function RateWaterfall({ base, steps, finalRate, capRate }: {
  base: RateStep;
  steps: RateStep[];
  finalRate: number;
  /** 법정 최고금리 등 상한. 있으면 기준선으로 그린다. */
  capRate?: number;
}) {
  const id = useId();
  const columns: { label: string; from: number; to: number; kind: "base" | "up" | "down" | "total"; note?: string }[] = [];
  let running = base.delta;
  columns.push({ label: base.label, from: 0, to: running, kind: "base", note: base.note });
  for (const step of steps) {
    const from = running;
    running = Math.round((running + step.delta) * 10000) / 10000;
    columns.push({ label: step.label, from, to: running, kind: step.delta >= 0 ? "up" : "down", note: step.note });
  }
  columns.push({ label: "적용 금리", from: 0, to: finalRate, kind: "total" });

  const top = Math.max(capRate ?? 0, finalRate, ...columns.map(c => Math.max(c.from, c.to))) * 1.18 || 1;
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const slot = innerW / columns.length;
  const barW = Math.min(64, slot * 0.6);
  const cx = (i: number) => PAD.left + slot * (i + 0.5);
  const y = (v: number) => PAD.top + innerH - (innerH * v) / top;
  const fill = { base: "var(--series-principal)", up: "var(--series-interest)", down: "var(--series-fee)", total: "var(--series-principal)" };

  const ups = steps.filter(s => s.delta > 0).reduce((sum, s) => sum + s.delta, 0);
  const downs = steps.filter(s => s.delta < 0).reduce((sum, s) => sum + s.delta, 0);
  const summary = `기준금리 ${formatRate(base.delta)}에서 가산 ${formatRate(ups)}를 더하고 우대 ${formatRate(Math.abs(downs))}를 빼 적용 금리 ${formatRate(finalRate)}가 된다.${capRate ? ` 상한은 ${formatRate(capRate)}다.` : ""}`;

  return (
    <ChartShell
      title="적용 금리의 구성"
      note="세로축 연이율(%)"
      legend={[
        { color: "var(--series-interest)", label: "올리는 항목(가산)" },
        { color: "var(--series-fee)", label: "내리는 항목(우대)" },
        { color: "var(--series-principal)", label: "기준금리·적용 금리" },
      ]}
      summary={summary}
    >
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-labelledby={`${id}-t`} aria-describedby={`${id}-d`}>
        <title id={`${id}-t`}>적용 금리의 구성</title>
        <desc id={`${id}-d`}>{summary}</desc>
        {[0, top / 2, top].map(t => (
          <g key={t}>
            <line className="chart-grid" x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} />
            <text className="chart-label" x={PAD.left - 8} y={y(t) + 4} textAnchor="end">{t.toFixed(1)}</text>
          </g>
        ))}
        <line className="chart-axis" x1={PAD.left} x2={W - PAD.right} y1={y(0)} y2={y(0)} />
        {capRate !== undefined && (
          <g>
            <line className="chart-reference" x1={PAD.left} x2={W - PAD.right} y1={y(capRate)} y2={y(capRate)} />
            <text className="chart-label chart-label-accent" x={W - PAD.right} y={y(capRate) - 5} textAnchor="end">상한 {formatRate(capRate)}</text>
          </g>
        )}
        {columns.map((col, i) => {
          const high = Math.max(col.from, col.to);
          const low = Math.min(col.from, col.to);
          const delta = col.to - col.from;
          return (
            <g key={col.label}>
              {i > 0 && i < columns.length - 1 && (
                <line className="chart-grid" x1={cx(i - 1) + barW / 2} x2={cx(i) - barW / 2} y1={y(col.from)} y2={y(col.from)} />
              )}
              <rect x={cx(i) - barW / 2} y={y(high)} width={barW} height={Math.max(2, y(low) - y(high))} fill={fill[col.kind]} />
              <text className="chart-value" x={cx(i)} y={y(high) - 7} textAnchor="middle">
                {col.kind === "base" || col.kind === "total" ? formatRate(col.to) : `${delta >= 0 ? "+" : "−"}${Math.abs(delta).toFixed(2)}%p`}
              </text>
              <text className="chart-label" x={cx(i)} y={H - 26} textAnchor="middle">{col.label}</text>
              {col.note && <text className="chart-label" x={cx(i)} y={H - 11} textAnchor="middle">{col.note}</text>}
            </g>
          );
        })}
      </svg>
    </ChartShell>
  );
}
