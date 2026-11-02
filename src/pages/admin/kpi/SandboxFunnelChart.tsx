import { useId } from "react";
import type { SandboxFunnelStage } from "../../../api/insight";
import { ChartShell } from "../../../components/charts/chartShell";
import { formatNumber } from "../../../lib/format";
import { pct } from "./kpiFormat";

const W = 640;
const ROW = 40;
const PAD = { top: 12, right: 150, bottom: 12, left: 110 };

/**
 * 샌드박스 도달률 가로 막대(S-400): 기간 가입 코호트 → 프로필 저장 → 신청 → 실행. 막대 길이 = 가입 대비 비율,
 * 막대 끝에 건수·비율을 글로 적는다. 앞 단계 대비는 아래 표가 보여 준다.
 */
export default function SandboxFunnelChart({ stages }: { stages: SandboxFunnelStage[] }) {
  const id = useId();
  const H = PAD.top + PAD.bottom + ROW * stages.length;
  const innerW = W - PAD.left - PAD.right;
  const signed = stages[0]?.count ?? 0;
  const executed = stages.find(s => s.code === "EXECUTED");
  const summary = signed === 0
    ? "기간 안에 가입한 계정이 없다."
    : `기간 가입 ${formatNumber(signed)}명 중 ${formatNumber(executed?.count ?? 0)}명(${pct(executed?.rateOfSignups ?? 0)})이 모의 대출 실행까지 갔다.`;
  return (
    <ChartShell title="샌드박스 도달률" note="막대 길이 = 기간 가입 대비 비율" summary={summary}>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-labelledby={`${id}-t`} aria-describedby={`${id}-d`}>
        <title id={`${id}-t`}>샌드박스 도달률</title>
        <desc id={`${id}-d`}>{summary}</desc>
        {stages.map((s, i) => {
          const yTop = PAD.top + i * ROW;
          const width = signed === 0 ? 0 : (innerW * s.count) / signed;
          return (
            <g key={s.code}>
              <text className="chart-label kpi-funnel-label" x={PAD.left - 10} y={yTop + ROW / 2 + 4} textAnchor="end">{s.label}</text>
              <rect className="chart-bar-muted" x={PAD.left} y={yTop + 8} width={innerW} height={ROW - 16} />
              <rect className={`kpi-funnel-bar kpi-funnel-${s.code.toLowerCase()}`} x={PAD.left} y={yTop + 8} width={Math.max(0, width)} height={ROW - 16} />
              <text className="chart-value kpi-funnel-value" x={PAD.left + innerW + 10} y={yTop + ROW / 2 + 4}>{`${formatNumber(s.count)}명 · ${pct(s.rateOfSignups)}`}</text>
            </g>
          );
        })}
      </svg>
    </ChartShell>
  );
}
