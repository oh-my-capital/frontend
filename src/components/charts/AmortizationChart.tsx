import { useId } from "react";
import { formatNumber } from "../../lib/format";
import { ChartShell, axisTicks, labelStep, shortMoney } from "./chartShell";

export interface AmortizationRow { installmentNo: number; principal: number; interest: number; payment: number; balance: number }

const W = 720;
const H = 290;
const PAD = { top: 18, right: 74, bottom: 34, left: 70 };

/**
 * 회차별 납입액 구성(원금·이자 쌓은 막대)과 잔액(오른쪽 축 선)을 한 그림에 겹친다.
 * 상환 방식의 차이 — 원리금균등은 납입액이 일정한 채 원금 비중이 커지고, 원금균등은 납입액이 줄고,
 * 만기일시는 이자만 내다 마지막에 원금이 몰린다 — 를 한눈에 보여 주는 것이 목적이다.
 */
export default function AmortizationChart({ rows, title, methodLabel, principalTotal }: {
  rows: AmortizationRow[];
  title?: string;
  methodLabel: string;
  principalTotal: number;
}) {
  const id = useId();
  if (rows.length === 0) return null;

  const maxPayment = Math.max(...rows.map(r => r.payment));
  const { top, ticks } = axisTicks(maxPayment);
  const balanceAxis = axisTicks(Math.max(principalTotal, ...rows.map(r => r.balance)));
  const balanceTop = balanceAxis.top;
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const slot = innerW / rows.length;
  const barW = Math.max(1.5, Math.min(26, slot * 0.68));
  const cx = (i: number) => PAD.left + slot * (i + 0.5);
  const y = (v: number) => PAD.top + innerH - (innerH * v) / top;
  const yBalance = (v: number) => PAD.top + innerH - (innerH * v) / balanceTop;
  const step = labelStep(rows.length);

  const interestTotal = rows.reduce((sum, r) => sum + r.interest, 0);
  const first = rows[0];
  const last = rows[rows.length - 1];
  const firstShare = first.payment > 0 ? Math.round((first.principal / first.payment) * 100) : 0;
  const lastShare = last.payment > 0 ? Math.round((last.principal / last.payment) * 100) : 0;
  const summary = `${methodLabel} ${rows.length}회차. 1회차 납입액 ${formatNumber(first.payment)}원 가운데 원금이 ${firstShare}%, 마지막 회차는 ${lastShare}%다. 이자 합계 ${formatNumber(interestTotal)}원, 잔액은 ${formatNumber(principalTotal)}원에서 0원으로 줄어든다.`;

  const balancePath = [`${PAD.left},${yBalance(principalTotal).toFixed(1)}`]
    .concat(rows.map((r, i) => `${cx(i).toFixed(1)},${yBalance(r.balance).toFixed(1)}`))
    .join(" ");

  return (
    <ChartShell
      title={title ?? `회차별 납입액 구성과 잔액 — ${methodLabel}`}
      note="세로 왼쪽 축 납입액(원), 오른쪽 축 잔액(원), 가로축 회차"
      legend={[
        { color: "var(--series-principal)", label: "원금", value: `${formatNumber(principalTotal)}원` },
        { color: "var(--series-interest)", label: "이자", value: `${formatNumber(interestTotal)}원` },
        { color: "var(--series-balance)", label: "잔액(오른쪽 축)" },
      ]}
      summary={summary}
    >
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-labelledby={`${id}-t`} aria-describedby={`${id}-d`}>
        <title id={`${id}-t`}>{methodLabel} 회차별 납입액 구성과 잔액</title>
        <desc id={`${id}-d`}>{summary}</desc>
        {ticks.map(t => (
          <g key={t}>
            <line className="chart-grid" x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} />
            <text className="chart-label" x={PAD.left - 8} y={y(t) + 4} textAnchor="end">{shortMoney(t)}</text>
          </g>
        ))}
        {balanceAxis.ticks.map(t => (
          <text key={`b${t}`} className="chart-label" x={W - PAD.right + 8} y={yBalance(t) + 4} textAnchor="start">{shortMoney(t)}</text>
        ))}
        <line className="chart-axis" x1={PAD.left} x2={W - PAD.right} y1={y(0)} y2={y(0)} />
        {rows.map((r, i) => {
          const pTop = y(r.principal);
          const iTop = y(r.payment);
          return (
            <g key={r.installmentNo}>
              <rect className="chart-bar-interest" x={cx(i) - barW / 2} y={iTop} width={barW} height={Math.max(0, pTop - iTop)} />
              <rect className="chart-bar-principal" x={cx(i) - barW / 2} y={pTop} width={barW} height={Math.max(0, y(0) - pTop)} />
              {(i % step === 0 || i === rows.length - 1) && (
                <text className="chart-label" x={cx(i)} y={H - 12} textAnchor="middle">{r.installmentNo}</text>
              )}
            </g>
          );
        })}
        <polyline className="chart-line-muted" points={balancePath} />
      </svg>
    </ChartShell>
  );
}
