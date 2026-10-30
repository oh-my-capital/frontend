import { formatNumber } from "../../lib/format";

export interface LimitCandidate { name: string; amount: number; note?: string; binding?: boolean }

/**
 * 한도 결정 요소를 같은 자로 잰 가로 막대로 늘어놓고, 가장 짧은 막대(= 최종 한도를 정한 병목)를 강조한다.
 * 심사에서 "한도는 여러 기준의 최솟값"이라는 규칙을 표가 아니라 길이로 보여 주는 것이 목적이다.
 * 요청 금액을 함께 그려 요청이 한도 안인지 밖인지 바로 읽히게 한다.
 */
export default function LimitLadder({ candidates, finalAmount, requestedAmount }: {
  candidates: LimitCandidate[];
  finalAmount: number;
  requestedAmount?: number;
}) {
  const scale = Math.max(finalAmount, requestedAmount ?? 0, ...candidates.map(c => c.amount), 1);
  const binding = candidates.find(c => c.binding) ?? candidates.reduce((min, c) => (c.amount < min.amount ? c : min), candidates[0]);
  const rows: (LimitCandidate & { tone: "" | "is-binding" | "is-final" })[] = candidates.map(c => ({
    ...c,
    tone: c.name === binding?.name ? "is-binding" : "",
  }));
  rows.push({ name: "최종 한도", amount: finalAmount, note: "위 기준의 최솟값", tone: "is-final" });

  return (
    <div className="chart">
      <div className="chart-legend" style={{ borderTop: 0, borderBottom: "var(--rule) solid var(--border)" }}>
        <span><i style={{ background: "var(--warn)" }} aria-hidden="true" />한도를 정한 기준</span>
        <span><i style={{ background: "var(--primary)" }} aria-hidden="true" />최종 한도</span>
        {requestedAmount !== undefined && <span>요청 금액 <b>{formatNumber(requestedAmount)}원</b></span>}
      </div>
      <ul className="ladder">
        {rows.map(row => (
          <li key={row.name} className={`ladder-row ${row.tone}`.trim()}>
            <span className="name">{row.name}{row.note && <><br /><span className="faint">{row.note}</span></>}</span>
            <span className="ladder-track" aria-hidden="true"><i style={{ width: `${Math.max(1, (row.amount / scale) * 100)}%` }} /></span>
            <span className="value">{formatNumber(row.amount)}원</span>
          </li>
        ))}
      </ul>
      <p className="ladder-note">
        {binding ? `${binding.name}이 ${formatNumber(binding.amount)}원으로 가장 낮아 최종 한도 ${formatNumber(finalAmount)}원을 정했다.` : `최종 한도는 ${formatNumber(finalAmount)}원이다.`}
        {requestedAmount !== undefined && (requestedAmount <= finalAmount
          ? ` 요청 금액 ${formatNumber(requestedAmount)}원은 한도 안이다.`
          : ` 요청 금액 ${formatNumber(requestedAmount)}원은 한도를 ${formatNumber(requestedAmount - finalAmount)}원 넘는다.`)}
      </p>
    </div>
  );
}
