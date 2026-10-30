import { useId } from "react";

interface Point { label: string; value: number }
interface Props {
  title: string;
  points: Point[];
  /** 값 표기(축 라벨·마지막 점) */
  format: (value: number) => string;
  /** 기준선 값(예: 연체율 목표). 없으면 0선만 */
  reference?: { value: number; label: string } | null;
  description?: string;
}

const W = 600;
const H = 220;
const PAD = { top: 18, right: 20, bottom: 34, left: 72 };

/** 월별 추이 선 그림(ui-guidelines §7): polyline 1개 + 0선 + 기준선, 범례는 텍스트. 색은 토큰만, 글자는 SVG text. */
export default function TrendChart({ title, points, format, reference = null, description }: Props) {
  const id = useId();
  const max = Math.max(reference?.value ?? 0, ...points.map(p => p.value), 0);
  const top = max === 0 ? 1 : max * 1.15;
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + (points.length <= 1 ? innerW / 2 : (innerW * i) / (points.length - 1));
  const y = (v: number) => PAD.top + innerH - (innerH * v) / top;
  const path = points.map((p, i) => `${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(" ");
  const last = points[points.length - 1];
  const ticks = [0, top / 2, top];
  const summary = points.length ? `${points[0].label}부터 ${last.label}까지 ${points.length}개 월. 마지막 값 ${format(last.value)}, 최고 ${format(max)}.` : "표시할 값이 없다.";

  return (
    <figure className="admin-chart">
      <figcaption><strong>{title}</strong>{description && <span>{description}</span>}</figcaption>
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
        {points.length > 1 && <polyline className="chart-line" points={path} />}
        {points.map((p, i) => (
          <g key={p.label}>
            <circle className="chart-dot" cx={x(i)} cy={y(p.value)} r={3} />
            {(i % 2 === 0 || i === points.length - 1) && <text className="chart-label" x={x(i)} y={H - 10} textAnchor="middle">{p.label}</text>}
          </g>
        ))}
        {last && <text className="chart-value" x={Math.min(x(points.length - 1), W - PAD.right - 4)} y={y(last.value) - 9} textAnchor="end">{format(last.value)}</text>}
      </svg>
      <p className="faint">{summary}</p>
    </figure>
  );
}
