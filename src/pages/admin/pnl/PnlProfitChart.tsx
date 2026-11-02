import { useId } from "react";
import type { PnlMonth } from "../../../api/unitEconomics";
import { ChartShell, labelStep, shortMoney } from "../../../components/charts/chartShell";
import { formatNumber, formatRate } from "../../../lib/format";
import { formatMonth } from "../parts/adminLabels";

const W = 640;
const H = 240;
const PAD = { top: 22, right: 16, bottom: 34, left: 72 };

/**
 * 월별 세전이익 막대(S-331). 세전이익은 충당금 전입이 큰 달에 음수가 되므로 0선 위아래로 그린다
 * (TrendChart 는 0 이상만 그려 손익에는 쓰지 않는다). 이익 = 초록, 손해 = 붉은색, 값 표에 "손해" 글자를 함께 둔다.
 */
export default function PnlProfitChart({ rows }: { rows: PnlMonth[] }) {
  const id = useId();
  const max = Math.max(...rows.map(r => r.pretaxProfit), 0);
  const min = Math.min(...rows.map(r => r.pretaxProfit), 0);
  const span = (max - min) * 1.15 || 1;
  const top = max + (max - min) * 0.1;
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const y = (v: number) => PAD.top + (innerH * (top - v)) / span;
  const slot = innerW / Math.max(rows.length, 1);
  const barW = Math.min(36, slot * 0.6);
  const cx = (i: number) => PAD.left + slot * (i + 0.5);
  const step = labelStep(rows.length, 8);
  const lossMonths = rows.filter(r => r.pretaxProfit < 0).length;
  const total = rows.reduce((s, r) => s + r.pretaxProfit, 0);
  const summary = rows.length
    ? `${formatMonth(rows[0].month)}부터 ${formatMonth(rows[rows.length - 1].month)}까지 ${rows.length}개 달 가운데 ${lossMonths}개 달이 손해이고, 합계 세전이익은 ${formatNumber(total)}원이다.`
    : "표시할 달이 없다.";

  return (
    <ChartShell
      title="월별 세전이익"
      note="세로축 원, 0선 아래는 손해"
      legend={[{ color: "var(--series-fee)", label: "이익" }, { color: "var(--danger)", label: "손해" }]}
      summary={summary}
      data={rows.length > 0 ? (
        <table className="table table-compact">
          <caption className="sr-only">월별 세전이익 값</caption>
          <thead><tr><th scope="col">월</th><th scope="col" className="num">세전이익</th><th scope="col" className="num">월 ROA(연환산)</th></tr></thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.month}>
                <th scope="row">{formatMonth(r.month)}</th>
                <td className="num">{formatNumber(r.pretaxProfit)}원{r.pretaxProfit < 0 ? " 손해" : ""}</td>
                <td className="num">{formatRate(r.annualizedRoa)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : undefined}
    >
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-labelledby={`${id}-t`} aria-describedby={`${id}-d`}>
        <title id={`${id}-t`}>월별 세전이익</title>
        <desc id={`${id}-d`}>{summary}</desc>
        {[min, 0, max].filter((v, i, a) => a.indexOf(v) === i).map(t => (
          <g key={t}>
            <line className="chart-grid" x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} />
            <text className="chart-label" x={PAD.left - 8} y={y(t) + 4} textAnchor="end">{shortMoney(t)}</text>
          </g>
        ))}
        <line className="chart-axis" x1={PAD.left} x2={W - PAD.right} y1={y(0)} y2={y(0)} />
        {rows.map((r, i) => {
          const high = Math.max(0, r.pretaxProfit);
          const low = Math.min(0, r.pretaxProfit);
          return (
            <g key={r.month}>
              <rect className={r.pretaxProfit >= 0 ? "pnl-bar-profit" : "pnl-bar-loss"} x={cx(i) - barW / 2} y={y(high)} width={barW} height={Math.max(1, y(low) - y(high))} />
              {(i % step === 0 || i === rows.length - 1) && <text className="chart-label" x={cx(i)} y={H - 12} textAnchor="middle">{r.month.slice(2).replace("-", ".")}</text>}
            </g>
          );
        })}
      </svg>
    </ChartShell>
  );
}
