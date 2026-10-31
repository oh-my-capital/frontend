import { useId } from "react";
import { ChartShell } from "../../../components/charts/chartShell";
import { formatNumber } from "../../../lib/format";
import { pct } from "./labels";

const W = 660;
const H = 104;
const PAD = { top: 34, right: 24, bottom: 34, left: 24 };
const BAR = 24;

/**
 * DSR 게이지(S-171): 0%부터의 가로 막대 하나에 현재 합산 DSR(채움), 추가 한도로 빌렸을 때까지(점선 테두리 연한 채움),
 * 상한(세로 기준선 + "상한 50%" 글자)을 겹쳐 그린다. 상태는 색이 아니라 "상한 이내/상한 초과" 글자로도 말한다.
 * 눈금 끝은 100%, DSR이 100%를 넘으면 10% 단위로 늘린다.
 */
export default function DsrGauge({ dsr, limit, after, exceeded, total, allowed, afterAnnual, methodLabel }: {
  dsr: number;
  limit: number;
  /** 요청 방식 추가 한도로 빌린 뒤 DSR. 한도가 0이면 null. */
  after: number | null;
  exceeded: boolean;
  total: number;
  allowed: number;
  afterAnnual: number | null;
  methodLabel: string;
}) {
  const id = useId();
  const scale = Math.max(100, Math.ceil(Math.max(dsr, after ?? 0) / 10) * 10);
  const innerW = W - PAD.left - PAD.right;
  const x = (v: number) => PAD.left + (innerW * Math.min(v, scale)) / scale;
  const ticks = [0, scale / 4, scale / 2, (scale * 3) / 4, scale];
  const state = exceeded ? "상한 초과" : "상한 이내";
  const summary = exceeded
    ? `합산 DSR ${pct(dsr)}가 상한 ${pct(limit)}를 넘는다(${state}). 연 원리금 ${formatNumber(total)}원이 허용 ${formatNumber(allowed)}원보다 많아 추가 한도는 0원이다.`
    : `합산 DSR ${pct(dsr)}는 상한 ${pct(limit)} 안이다(${state}).${after !== null ? ` 추가 한도를 ${methodLabel} 방식으로 모두 빌리면 ${pct(after)}가 된다.` : " 남은 여유가 없어 추가 한도는 0원이다."}`;
  const inside = x(dsr) - PAD.left >= 110;

  return (
    <ChartShell
      title="합산 DSR과 상한"
      note={`가로축 연소득 대비 연 원리금 비율(%) · 상한은 규칙 세트 DSR 상한 · 지금 ${state}`}
      legend={[
        { color: exceeded ? "var(--danger)" : "var(--primary)", label: "현재 합산 DSR", value: pct(dsr) },
        ...(after !== null ? [{ color: "var(--primary-tint)", label: `추가 한도로 빌린 뒤(${methodLabel})`, value: pct(after) }] : []),
        { color: "var(--accent)", label: "DSR 상한", value: pct(limit) },
      ]}
      summary={summary}
      data={(
        <table className="table table-compact">
          <caption className="sr-only">합산 DSR과 상한</caption>
          <thead><tr><th scope="col">항목</th><th scope="col" className="num">연 원리금</th><th scope="col" className="num">DSR</th></tr></thead>
          <tbody>
            <tr><th scope="row">현재 합산</th><td className="num">{formatNumber(total)}</td><td className="num">{pct(dsr)}</td></tr>
            {after !== null && afterAnnual !== null && <tr><th scope="row">추가 한도로 빌린 뒤</th><td className="num">{formatNumber(afterAnnual)}</td><td className="num">{pct(after)}</td></tr>}
            <tr><th scope="row">상한(허용)</th><td className="num">{formatNumber(allowed)}</td><td className="num">{pct(limit)}</td></tr>
          </tbody>
        </table>
      )}
    >
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-labelledby={`${id}-t`} aria-describedby={`${id}-d`}>
        <title id={`${id}-t`}>합산 DSR과 상한</title>
        <desc id={`${id}-d`}>{summary}</desc>
        <rect className="chart-bar-muted" x={PAD.left} y={PAD.top} width={innerW} height={BAR} />
        {after !== null && after > dsr && <rect className="dsr-gauge-extra" x={x(dsr)} y={PAD.top} width={x(after) - x(dsr)} height={BAR} />}
        {dsr > 0 && <rect className={exceeded ? "chart-bar-overdue" : "chart-bar-principal"} x={PAD.left} y={PAD.top} width={x(dsr) - PAD.left} height={BAR} />}
        <text className={inside ? "dsr-gauge-inlabel" : "chart-value"} x={inside ? x(dsr) - 8 : x(dsr) + 8} y={PAD.top + BAR / 2 + 5} textAnchor={inside ? "end" : "start"}>
          현재 {pct(dsr)}
        </text>
        <line className="chart-reference" x1={x(limit)} x2={x(limit)} y1={PAD.top - 12} y2={PAD.top + BAR + 6} />
        <text className="chart-label chart-label-accent" x={x(limit)} y={PAD.top - 16} textAnchor="middle">상한 {pct(limit)}</text>
        {ticks.map(t => (
          <text key={t} className="chart-label" x={x(t)} y={H - 10} textAnchor={t === 0 ? "start" : t === scale ? "end" : "middle"}>{t}%</text>
        ))}
      </svg>
    </ChartShell>
  );
}
