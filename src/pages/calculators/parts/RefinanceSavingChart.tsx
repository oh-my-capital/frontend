import { useId } from "react";
import type { RefinanceRow } from "../../../api/refinance";
import { ChartShell, axisTicks, labelStep, shortMoney } from "../../../components/charts/chartShell";
import { formatNumber } from "../../../lib/format";

const W = 660;
const H = 250;
const PAD = { top: 24, right: 24, bottom: 36, left: 72 };

/**
 * 누적 이자 절감(선) vs 갈아타기 비용(가로 점선) + 손익분기 회차(세로 기준선·점). 인라인 SVG, ChartShell 규칙(범례·요약·값 표).
 * 가로축은 갈아탄 뒤 회차(0 = 갈아타는 날), 세로축은 원. 누적 절감이 음수가 될 수 있어 0 아래 눈금도 그린다.
 * 손익분기 = 누적 절감이 비용 이상이 되는 첫 회차(business-rules WP17 절, 서버가 계산한 값을 그대로 쓴다).
 */
export default function RefinanceSavingChart({ rows, cost, breakeven }: { rows: RefinanceRow[]; cost: number; breakeven: number | null }) {
  const id = useId();
  const points = [{ no: 0, cum: 0 }, ...rows.map(r => ({ no: r.installmentNo, cum: r.cumulativeSaving }))];
  const values = points.map(p => p.cum);
  const { top, ticks: upper } = axisTicks(Math.max(cost, ...values, 1));
  const lowest = Math.min(0, ...values);
  const bottom = lowest < 0 ? -axisTicks(-lowest).top : 0;
  const ticks = bottom < 0 ? [bottom, ...upper] : upper;
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + (points.length <= 1 ? innerW / 2 : (innerW * i) / (points.length - 1));
  const y = (v: number) => PAD.top + (innerH * (top - v)) / (top - bottom);
  const line = points.map((p, i) => `${x(i).toFixed(1)},${y(p.cum).toFixed(1)}`).join(" ");
  const step = labelStep(points.length);
  const final = values[values.length - 1] ?? 0;
  const best = Math.max(...values);
  const be = breakeven !== null ? points.findIndex(p => p.no === breakeven) : -1;

  const summary = breakeven !== null
    ? `갈아타기 비용 ${formatNumber(cost)}원을 ${breakeven}회차에 누적 이자 절감으로 회수한다. ${points.length - 1}회차까지 누적 절감은 ${formatNumber(final)}원이다.${final < cost ? " 새 기간이 길어 회수 뒤 누적 절감이 다시 줄어 끝에는 비용보다 작다." : ""}`
    : `누적 이자 절감이 갈아타기 비용 ${formatNumber(cost)}원에 끝까지 닿지 않는다(가장 클 때 ${formatNumber(best)}원). 손익분기 회차가 없다.`;

  return (
    <ChartShell
      title="누적 이자 절감과 갈아타기 비용"
      note="가로축 갈아탄 뒤 회차(0 = 갈아타는 날), 세로축 원 · 선이 점선 위로 올라서는 회차가 손익분기"
      legend={[
        { color: "var(--primary)", label: "누적 이자 절감", value: `${formatNumber(final)}원` },
        { color: "var(--series-balance)", label: "갈아타기 비용", value: `${formatNumber(cost)}원` },
        { color: "var(--accent)", label: "손익분기", value: breakeven !== null ? `${breakeven}회차` : "없음" },
      ]}
      summary={summary}
      data={(
        <table className="table table-compact">
          <caption className="sr-only">회차별 누적 이자 절감과 갈아타기 비용</caption>
          <thead><tr><th scope="col">회차</th><th scope="col" className="num">누적 이자 절감</th><th scope="col" className="num">갈아타기 비용</th><th scope="col">비용 회수</th></tr></thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.installmentNo} className={r.installmentNo === breakeven ? "is-current" : undefined}>
                <th scope="row">{r.installmentNo}회</th>
                <td className="num">{formatNumber(r.cumulativeSaving)}</td>
                <td className="num">{formatNumber(cost)}</td>
                <td>{r.installmentNo === breakeven ? "손익분기" : r.recovered ? "회수" : "회수 전"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    >
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-labelledby={`${id}-t`} aria-describedby={`${id}-d`}>
        <title id={`${id}-t`}>누적 이자 절감과 갈아타기 비용</title>
        <desc id={`${id}-d`}>{summary}</desc>
        {ticks.map(t => (
          <g key={t}>
            <line className="chart-grid" x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} />
            <text className="chart-label" x={PAD.left - 8} y={y(t) + 4} textAnchor="end">{shortMoney(t)}</text>
          </g>
        ))}
        <line className="chart-axis" x1={PAD.left} x2={W - PAD.right} y1={y(0)} y2={y(0)} />
        <line className="chart-line-muted" x1={x(0)} x2={x(points.length - 1)} y1={y(cost)} y2={y(cost)} />
        {points.length > 1 && <polyline className="chart-line" points={line} />}
        {points.map((p, i) => (
          <g key={p.no}>
            <circle className="chart-dot" cx={x(i)} cy={y(p.cum)} r={2.5} />
            {(i % step === 0 || i === points.length - 1) && <text className="chart-label" x={x(i)} y={H - 12} textAnchor="middle">{p.no === 0 ? "갈아탐" : `${p.no}회`}</text>}
          </g>
        ))}
        {be >= 0 && (
          <g>
            <line className="chart-reference" x1={x(be)} x2={x(be)} y1={PAD.top} y2={y(bottom)} />
            <circle className="chart-dot chart-dot-accent" cx={x(be)} cy={y(points[be].cum)} r={4} />
            <text className="chart-value" x={Math.min(x(be) + 8, W - PAD.right - 96)} y={PAD.top + 12} textAnchor="start">{breakeven}회차에 비용 회수</text>
          </g>
        )}
      </svg>
    </ChartShell>
  );
}
