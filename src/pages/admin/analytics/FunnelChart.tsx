import { useId } from "react";
import type { FunnelRow } from "../../../api/adminAnalytics";
import { ChartShell } from "../../../components/charts/chartShell";
import { formatNumber } from "../../../lib/format";
import { pct } from "./riskLabels";

const W = 640;
const ROW = 40;
const PAD = { top: 12, right: 150, bottom: 12, left: 132 };

/**
 * 승인 퍼널 가로 막대(S-220): 단계마다 막대 하나, 길이 = 신청 대비 비율. 막대 끝에 건수·신청 대비 비율을 글로 적는다.
 * 같은 값과 단계 전환율은 아래 표가 다시 보여 준다.
 */
export default function FunnelChart({ row }: { row: FunnelRow }) {
  const id = useId();
  const H = PAD.top + PAD.bottom + ROW * row.stages.length;
  const innerW = W - PAD.left - PAD.right;
  const applied = row.stages[0]?.count ?? 0;
  const executed = row.stages.find(s => s.code === "EXECUTED");
  const summary = applied === 0
    ? `${row.productName}: 아직 신청이 없다.`
    : `${row.productName}: 신청 ${formatNumber(applied)}건 중 ${formatNumber(executed?.count ?? 0)}건(${pct(executed?.ratioOfApplied ?? 0)})이 실행됐다.`;
  return (
    <ChartShell title={`승인 퍼널 — ${row.productName}`} note="막대 길이 = 신청 대비 비율" summary={summary}>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-labelledby={`${id}-t`} aria-describedby={`${id}-d`}>
        <title id={`${id}-t`}>승인 퍼널</title>
        <desc id={`${id}-d`}>{summary}</desc>
        {row.stages.map((s, i) => {
          const yTop = PAD.top + i * ROW;
          const width = applied === 0 ? 0 : (innerW * s.count) / applied;
          return (
            <g key={s.code}>
              <text className="chart-label funnel-label" x={PAD.left - 10} y={yTop + ROW / 2 + 4} textAnchor="end">{s.label}</text>
              <rect className="chart-bar-muted" x={PAD.left} y={yTop + 8} width={innerW} height={ROW - 16} />
              <rect className={`funnel-bar funnel-${s.code.toLowerCase()}`} x={PAD.left} y={yTop + 8} width={Math.max(0, width)} height={ROW - 16} />
              <text className="chart-value funnel-value" x={PAD.left + innerW + 10} y={yTop + ROW / 2 + 4}>{`${formatNumber(s.count)}건 · ${pct(s.ratioOfApplied)}`}</text>
            </g>
          );
        })}
      </svg>
    </ChartShell>
  );
}
