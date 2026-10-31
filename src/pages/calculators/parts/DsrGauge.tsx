import { ChartShell } from "../../../components/charts/chartShell";
import { formatNumber } from "../../../lib/format";
import { pct } from "./labels";

/** 0~scale 범위의 값을 막대 폭 %로. */
const widthOf = (v: number, scale: number) => `${Math.max(0, Math.min(100, (v / scale) * 100))}%`;

/**
 * DSR 게이지(S-171): 0%부터의 가로 막대 하나에 현재 합산 DSR(채움), 추가 한도로 빌렸을 때까지(점선 테두리 연한 채움),
 * 상한(점선 세로선 + "상한 50%" 글자)을 겹친다. SVG 대신 막대 폭(width %)만으로 그려 375px에서도 글자가 줄어들지 않는다
 * (LimitLadder 와 같은 방식). 상태는 색이 아니라 "상한 이내/상한 초과" 글자로도 말한다.
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
  const scale = Math.max(100, Math.ceil(Math.max(dsr, after ?? 0) / 10) * 10);
  const ticks = [0, scale / 4, scale / 2, (scale * 3) / 4, scale];
  const state = exceeded ? "상한 초과" : "상한 이내";
  const summary = exceeded
    ? `합산 DSR ${pct(dsr)}가 상한 ${pct(limit)}를 넘는다(${state}). 연 원리금 ${formatNumber(total)}원이 허용 ${formatNumber(allowed)}원보다 많아 추가 한도는 0원이다.`
    : `합산 DSR ${pct(dsr)}는 상한 ${pct(limit)} 안이다(${state}).${after !== null ? ` 추가 한도를 ${methodLabel} 방식으로 모두 빌리면 ${pct(after)}가 된다.` : " 남은 여유가 없어 추가 한도는 0원이다."}`;
  // 채움이 좁으면 숫자를 막대 밖(오른쪽)에 둔다.
  const labelInside = (dsr / scale) * 100 >= 25;

  return (
    <ChartShell
      title="합산 DSR과 상한"
      note={`가로축 연소득 대비 연 원리금 비율(%) · 상한은 규칙 세트 DSR 상한 · 지금 ${state}`}
      legend={[
        { color: exceeded ? "var(--danger)" : "var(--primary)", label: "현재 합산 DSR", value: pct(dsr) },
        ...(after !== null ? [{ color: "var(--primary-line)", label: `추가 한도로 빌린 뒤(${methodLabel})`, value: pct(after) }] : []),
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
      <div className="dsr-gauge" role="img" aria-label={summary}>
        <div className="dsr-gauge-head">
          <span className="dsr-gauge-limit-label" style={{ width: widthOf(limit, scale) }}>상한 {pct(limit)}</span>
        </div>
        <div className={`dsr-gauge-track${exceeded ? " is-exceeded" : ""}`}>
          {after !== null && after > dsr && <i className="dsr-gauge-extra" style={{ width: widthOf(after, scale) }} />}
          <i className="dsr-gauge-fill" style={{ width: widthOf(dsr, scale) }}>
            <b className={labelInside ? undefined : "is-outside"}>{pct(dsr)}</b>
          </i>
          <i className="dsr-gauge-limit" style={{ width: widthOf(limit, scale) }} />
        </div>
        <div className="dsr-gauge-scale">
          {ticks.map(t => <span key={t}>{t}%</span>)}
        </div>
      </div>
    </ChartShell>
  );
}
