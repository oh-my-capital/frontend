import { useId } from "react";
import { ChartShell, axisTicks, labelStep } from "./chartShell";

export interface TrendPoint { label: string; value: number }

const W = 640;
const H = 230;
const PAD = { top: 20, right: 20, bottom: 34, left: 76 };

/**
 * 월별 추이 선 그림(ui-guidelines §7): polyline 1개 + 채움 + 0선 + 기준선, 범례는 텍스트.
 * 포트폴리오 연체율·충당금처럼 "지난 N개월이 어떻게 움직였나"를 보여 준다.
 * 같은 숫자를 접힌 표로도 제공해 그림을 못 보는 경우에도 값을 읽을 수 있게 한다.
 */
export default function TrendChart({ title, points, format, reference = null, description, valueHeader = "값" }: {
  title: string;
  points: TrendPoint[];
  /** 값 표기(축 라벨·마지막 점·표) */
  format: (value: number) => string;
  /** 기준선 값(예: 연체율 목표). 없으면 0선만 */
  reference?: { value: number; label: string } | null;
  description?: string;
  valueHeader?: string;
}) {
  const id = useId();
  const max = Math.max(reference?.value ?? 0, ...points.map(p => p.value), 0);
  const { top, ticks } = axisTicks(max);
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + (points.length <= 1 ? innerW / 2 : (innerW * i) / (points.length - 1));
  const y = (v: number) => PAD.top + innerH - (innerH * v) / top;
  const line = points.map((p, i) => `${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(" ");
  const area = points.length > 1 ? `${x(0).toFixed(1)},${y(0).toFixed(1)} ${line} ${x(points.length - 1).toFixed(1)},${y(0).toFixed(1)}` : "";
  const last = points[points.length - 1];
  const step = labelStep(points.length, 12);
  const summary = points.length
    ? `${points[0].label}부터 ${last.label}까지 ${points.length}개 월. 마지막 값 ${format(last.value)}, 최고 ${format(max)}.`
    : "표시할 값이 없다.";

  return (
    <ChartShell
      title={title}
      note={description}
      summary={summary}
      data={points.length > 0 ? (
        <table className="table table-compact">
          <caption className="sr-only">{title} 월별 값</caption>
          <thead><tr><th scope="col">월</th><th scope="col" className="num">{valueHeader}</th></tr></thead>
          <tbody>
            {points.map(p => <tr key={p.label}><th scope="row">{p.label}</th><td className="num">{format(p.value)}</td></tr>)}
          </tbody>
        </table>
      ) : undefined}
    >
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-labelledby={`${id}-t`} aria-describedby={`${id}-d`}>
        <title id={`${id}-t`}>{title}</title>
        <desc id={`${id}-d`}>{summary}</desc>
        {ticks.map(t => (
          <g key={t}>
            <line className="chart-grid" x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} />
            <text className="chart-label" x={PAD.left - 8} y={y(t) + 4} textAnchor="end">{format(t)}</text>
          </g>
        ))}
        <line className="chart-axis" x1={PAD.left} x2={W - PAD.right} y1={y(0)} y2={y(0)} />
        {reference && (
          <g>
            <line className="chart-reference" x1={PAD.left} x2={W - PAD.right} y1={y(reference.value)} y2={y(reference.value)} />
            <text className="chart-label chart-label-accent" x={W - PAD.right} y={y(reference.value) - 5} textAnchor="end">{reference.label} {format(reference.value)}</text>
          </g>
        )}
        {area && <polygon className="chart-area" points={area} />}
        {points.length > 1 && <polyline className="chart-line" points={line} />}
        {points.map((p, i) => (
          <g key={p.label}>
            <circle className="chart-dot" cx={x(i)} cy={y(p.value)} r={3} />
            {(i % step === 0 || i === points.length - 1) && <text className="chart-label" x={x(i)} y={H - 10} textAnchor="middle">{p.label}</text>}
          </g>
        ))}
        {last && <text className="chart-value" x={Math.min(x(points.length - 1), W - PAD.right - 4)} y={y(last.value) - 9} textAnchor="end">{format(last.value)}</text>}
      </svg>
    </ChartShell>
  );
}
