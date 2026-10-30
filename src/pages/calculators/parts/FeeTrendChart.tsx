import { useId } from "react";
import { formatNumber } from "../../../lib/format";

export interface FeePoint { installmentNo: number; date: string; balance: number; remainingDays: number; fee: number }

/**
 * 잔존기간별 중도상환수수료 추이(ui-guidelines §7): polyline 1개 + 0선 + 기준선(지금 상환 시점), 범례는 텍스트.
 * 각 점은 "k회차 납입 직후 전액 상환했을 때의 수수료 = floor(잔액 × 수수료율 × 잔존일수 ÷ 대출일수)"다. 선 1.5px, 색은 토큰만.
 */
export default function FeeTrendChart({ points, current, feeRate, title = "잔존기간별 수수료 추이" }: { points: FeePoint[]; current: { installmentNo: number; fee: number } | null; feeRate: number; title?: string }) {
  const id = useId();
  const W = 640, H = 240, PAD = { top: 20, right: 24, bottom: 36, left: 84 };
  const max = Math.max(...points.map(p => p.fee), 1);
  const top = max * 1.12;
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + (points.length <= 1 ? innerW / 2 : (innerW * i) / (points.length - 1));
  const y = (v: number) => PAD.top + innerH - (innerH * v) / top;
  const path = points.map((p, i) => `${x(i).toFixed(1)},${y(p.fee).toFixed(1)}`).join(" ");
  const ticks = [0, top / 2, top];
  const labelEvery = Math.max(1, Math.ceil(points.length / 12));
  const first = points[0], last = points[points.length - 1];
  const summary = first && last ? `실행 직후 수수료 ${formatNumber(first.fee)}원에서 만기 ${formatNumber(last.fee)}원까지 ${points.length}개 시점. 잔액과 잔존일수가 함께 줄어 수수료는 회차가 지날수록 작아진다.` : "표시할 값이 없다.";
  const currentIndex = current ? points.findIndex(p => p.installmentNo === current.installmentNo) : -1;

  return (
    <figure className="lab-chart">
      <figcaption><strong>{title}</strong><span>수수료율 {feeRate.toFixed(2)}% · 각 회차 납입 직후 전액 상환 기준 · 가로축 회차, 세로축 수수료(원)</span></figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-labelledby={`${id}-t`} aria-describedby={`${id}-d`}>
        <title id={`${id}-t`}>{title}</title>
        <desc id={`${id}-d`}>{summary}</desc>
        {ticks.map(t => (
          <g key={t}>
            <line className="chart-grid" x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} />
            <text className="chart-label" x={PAD.left - 8} y={y(t) + 4} textAnchor="end">{formatNumber(Math.round(t))}</text>
          </g>
        ))}
        <line className="chart-axis" x1={PAD.left} x2={W - PAD.right} y1={y(0)} y2={y(0)} />
        {points.length > 1 && <polyline className="chart-line" points={path} />}
        {points.map((p, i) => (
          <g key={p.installmentNo}>
            <circle className="chart-dot" cx={x(i)} cy={y(p.fee)} r={2.5} />
            {(i % labelEvery === 0 || i === points.length - 1) && <text className="chart-label" x={x(i)} y={H - 12} textAnchor="middle">{p.installmentNo === 0 ? "실행" : `${p.installmentNo}회`}</text>}
          </g>
        ))}
        {currentIndex >= 0 && current && (
          <g>
            <line className="chart-reference" x1={x(currentIndex)} x2={x(currentIndex)} y1={PAD.top} y2={y(0)} />
            <circle className="chart-dot chart-dot-accent" cx={x(currentIndex)} cy={y(points[currentIndex].fee)} r={4} />
            <text className="chart-value" x={Math.min(x(currentIndex) + 8, W - PAD.right - 60)} y={Math.max(PAD.top + 12, y(points[currentIndex].fee) - 10)} textAnchor="start">지금 {formatNumber(current.fee)}원</text>
          </g>
        )}
      </svg>
      <p className="faint">{summary}</p>
    </figure>
  );
}
