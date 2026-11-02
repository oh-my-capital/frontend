import { useId } from "react";
import type { UnitEconomicsItem } from "../../api/unitEconomics";
import { ChartShell, shortMoney } from "../../components/charts/chartShell";
import { formatNumber, formatRate } from "../../lib/format";

const W = 720;
const H = 280;
const PAD = { top: 28, right: 16, bottom: 52, left: 64 };
const SHORT_LABEL: Record<string, string> = {
  INTEREST_INCOME: "이자수익", FUNDING_COST: "조달비용", CREDIT_LOSS: "대손비용", OPERATING_EXPENSE: "판관비", ACQUISITION_COST: "모집비", PRETAX_PROFIT: "세전이익",
};

/**
 * 대출 한 건의 연 손익 워터폴(S-330): 이자수익에서 조달·대손·판관·모집을 차례로 빼 세전이익에 닿는다.
 * 막대 길이는 연 금액(원), 막대 아래 글자는 평잔 대비 연율(%). 세전이익이 음수면 0선 아래로 내려가고 "손해" 색·글자를 쓴다.
 * 기존 RateWaterfall 은 "기준금리 → 적용 금리" 문구가 고정돼 있어 겉틀(ChartShell)만 함께 쓴다.
 */
export default function UnitEconomicsWaterfall({ items }: { items: UnitEconomicsItem[] }) {
  const id = useId();
  const income = items.find(i => i.code === "INTEREST_INCOME");
  const profit = items.find(i => i.code === "PRETAX_PROFIT");
  const costs = items.filter(i => i.code !== "INTEREST_INCOME" && i.code !== "PRETAX_PROFIT");
  if (!income || !profit) return null;

  type Col = { item: UnitEconomicsItem; from: number; to: number; kind: "income" | "cost" | "profit" | "loss" };
  const cols: Col[] = [{ item: income, from: 0, to: income.annualAmount, kind: "income" }];
  let running = income.annualAmount;
  for (const c of costs) {
    cols.push({ item: c, from: running, to: running - c.annualAmount, kind: "cost" });
    running -= c.annualAmount;
  }
  cols.push({ item: profit, from: 0, to: profit.annualAmount, kind: profit.annualAmount >= 0 ? "profit" : "loss" });

  const max = Math.max(...cols.map(c => Math.max(c.from, c.to)), 1);
  const min = Math.min(...cols.map(c => Math.min(c.from, c.to)), 0);
  const span = (max - min) * 1.12 || 1;
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const top = max + (max - min) * 0.12;
  const y = (v: number) => PAD.top + (innerH * (top - v)) / span;
  const slot = innerW / cols.length;
  const barW = Math.min(72, slot * 0.6);
  const cx = (i: number) => PAD.left + slot * (i + 0.5);
  const barClass = { income: "chart-bar-principal", cost: "chart-bar-interest", profit: "chart-bar-fee", loss: "ue-bar-loss" };
  const ticks = min < 0 ? [min, 0, max] : [0, max / 2, max];

  const summary = `연 이자수익 ${formatNumber(income.annualAmount)}원(평잔의 ${formatRate(income.ratio)})에서 조달·대손·판관·모집 비용 연 ${formatNumber(costs.reduce((s, c) => s + c.annualAmount, 0))}원을 빼면 세전이익 연 ${formatNumber(profit.annualAmount)}원, ROA ${formatRate(profit.ratio)}${profit.annualAmount < 0 ? "로 손해다" : "다"}.`;

  return (
    <ChartShell
      title="대출 한 건의 연 손익"
      note="막대 = 연 금액(원), 아래 글자 = 평잔 대비 연율"
      legend={[
        { color: "var(--series-principal)", label: "이자수익" },
        { color: "var(--series-interest)", label: "빼는 비용" },
        { color: "var(--series-fee)", label: "세전이익(이익)" },
        { color: "var(--danger)", label: "세전이익(손해)" },
      ]}
      summary={summary}
      data={(
        <table className="table table-compact">
          <caption className="sr-only">연 손익 항목별 값</caption>
          <thead><tr><th scope="col">항목</th><th scope="col" className="num">연 금액</th><th scope="col" className="num">평잔 대비 연율</th></tr></thead>
          <tbody>
            {items.map(i => <tr key={i.code}><th scope="row">{i.label}</th><td className="num">{formatNumber(i.annualAmount)}원</td><td className="num">{formatRate(i.ratio)}</td></tr>)}
          </tbody>
        </table>
      )}
    >
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-labelledby={`${id}-t`} aria-describedby={`${id}-d`}>
        <title id={`${id}-t`}>대출 한 건의 연 손익 워터폴</title>
        <desc id={`${id}-d`}>{summary}</desc>
        {ticks.map(t => (
          <g key={t}>
            <line className="chart-grid" x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} />
            <text className="chart-label" x={PAD.left - 8} y={y(t) + 4} textAnchor="end">{shortMoney(t)}</text>
          </g>
        ))}
        <line className="chart-axis" x1={PAD.left} x2={W - PAD.right} y1={y(0)} y2={y(0)} />
        {cols.map((c, i) => {
          const high = Math.max(c.from, c.to);
          const low = Math.min(c.from, c.to);
          const isCost = c.kind === "cost";
          return (
            <g key={c.item.code}>
              {i > 0 && i < cols.length - 1 && (
                <line className="chart-grid" x1={cx(i - 1) + barW / 2} x2={cx(i) - barW / 2} y1={y(c.from)} y2={y(c.from)} />
              )}
              <rect className={barClass[c.kind]} x={cx(i) - barW / 2} y={y(high)} width={barW} height={Math.max(2, y(low) - y(high))} />
              <text className="chart-value" x={cx(i)} y={y(high) - 7} textAnchor="middle">
                {isCost ? `−${shortMoney(c.item.annualAmount)}` : shortMoney(c.item.annualAmount)}
              </text>
              <text className="chart-label" x={cx(i)} y={H - 30} textAnchor="middle">{SHORT_LABEL[c.item.code] ?? c.item.label}</text>
              <text className="chart-label" x={cx(i)} y={H - 14} textAnchor="middle">{isCost ? `−${formatRate(c.item.ratio)}` : formatRate(c.item.ratio)}{c.kind === "loss" ? " 손해" : ""}</text>
            </g>
          );
        })}
      </svg>
    </ChartShell>
  );
}
