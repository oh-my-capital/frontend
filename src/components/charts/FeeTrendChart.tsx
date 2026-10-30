import { useId } from "react";
import { formatNumber } from "../../lib/format";
import { ChartShell, axisTicks, labelStep, shortMoney } from "./chartShell";

export interface FeePoint { installmentNo: number; date: string; balance: number; remainingDays: number; fee: number }

const W = 660;
const H = 240;
const PAD = { top: 20, right: 24, bottom: 36, left: 72 };

/**
 * 잔존기간별 중도상환수수료 추이: polyline 1개 + 채움 + 0선 + 기준선(지금 상환 시점).
 * 각 점은 "k회차 납입 직후 전액 상환했을 때의 수수료 = floor(잔액 × 수수료율 × 잔존일수 ÷ 대출일수)"다.
 * 수수료가 잔액과 잔존일수에 함께 비례해 회차가 지날수록 가파르게 작아진다는 점을 보여 준다.
 */
export default function FeeTrendChart({ points, current, feeRate, title = "잔존기간별 수수료 추이" }: {
  points: FeePoint[];
  current: { installmentNo: number; fee: number } | null;
  feeRate: number;
  title?: string;
}) {
  const id = useId();
  const { top, ticks } = axisTicks(Math.max(...points.map(p => p.fee), 1));
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + (points.length <= 1 ? innerW / 2 : (innerW * i) / (points.length - 1));
  const y = (v: number) => PAD.top + innerH - (innerH * v) / top;
  const line = points.map((p, i) => `${x(i).toFixed(1)},${y(p.fee).toFixed(1)}`).join(" ");
  const area = points.length > 1 ? `${x(0).toFixed(1)},${y(0).toFixed(1)} ${line} ${x(points.length - 1).toFixed(1)},${y(0).toFixed(1)}` : "";
  const step = labelStep(points.length);
  const first = points[0], last = points[points.length - 1];
  const summary = first && last
    ? `실행 직후 수수료 ${formatNumber(first.fee)}원에서 만기 ${formatNumber(last.fee)}원까지 ${points.length}개 시점. 잔액과 잔존일수가 함께 줄어 수수료는 회차가 지날수록 작아진다.`
    : "표시할 값이 없다.";
  const currentIndex = current ? points.findIndex(p => p.installmentNo === current.installmentNo) : -1;

  return (
    <ChartShell
      title={title}
      note={`수수료율 ${feeRate.toFixed(2)}% · 각 회차 납입 직후 전액 상환 기준 · 가로축 회차, 세로축 수수료(원)`}
      summary={summary}
      data={(
        <table className="table table-compact">
          <caption className="sr-only">회차별 전액 상환 시 수수료</caption>
          <thead><tr><th scope="col">회차</th><th scope="col">상환일</th><th scope="col" className="num">잔액</th><th scope="col" className="num">잔존일수</th><th scope="col" className="num">수수료</th></tr></thead>
          <tbody>
            {points.map(p => (
              <tr key={p.installmentNo} className={p.installmentNo === current?.installmentNo ? "is-current" : undefined}>
                <th scope="row">{p.installmentNo === 0 ? "실행 직후" : `${p.installmentNo}회`}</th>
                <td>{p.date}</td>
                <td className="num">{formatNumber(p.balance)}</td>
                <td className="num">{formatNumber(p.remainingDays)}</td>
                <td className="num">{formatNumber(p.fee)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    >
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-labelledby={`${id}-t`} aria-describedby={`${id}-d`}>
        <title id={`${id}-t`}>{title}</title>
        <desc id={`${id}-d`}>{summary}</desc>
        {ticks.map(t => (
          <g key={t}>
            <line className="chart-grid" x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} />
            <text className="chart-label" x={PAD.left - 8} y={y(t) + 4} textAnchor="end">{shortMoney(t)}</text>
          </g>
        ))}
        <line className="chart-axis" x1={PAD.left} x2={W - PAD.right} y1={y(0)} y2={y(0)} />
        {area && <polygon className="chart-area" points={area} />}
        {points.length > 1 && <polyline className="chart-line" points={line} />}
        {points.map((p, i) => (
          <g key={p.installmentNo}>
            <circle className="chart-dot" cx={x(i)} cy={y(p.fee)} r={2.5} />
            {(i % step === 0 || i === points.length - 1) && <text className="chart-label" x={x(i)} y={H - 12} textAnchor="middle">{p.installmentNo === 0 ? "실행" : `${p.installmentNo}회`}</text>}
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
    </ChartShell>
  );
}
