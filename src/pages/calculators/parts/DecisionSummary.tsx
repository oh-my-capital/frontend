import type { CSSProperties } from "react";
import Money from "../../../components/Money";
import StatusChip, { statusLabel } from "../../../components/StatusChip";
import type { ScreeningResult } from "../../../api/types";
import { formatNumber } from "../../../lib/format";
import { decisionSentence, pct } from "./labels";

/** 결정 배지 + 한 문장 + 핵심 숫자 네 개(적용 금리·최종 한도·월 납입/제안 한도·DSR). S-07·S-14 공용. */
export default function DecisionSummary({ result, requestedAmount, productMin, heading = "심사 결과" }: { result: ScreeningResult; requestedAmount: number; productMin: number | null; heading?: string }) {
  const { label, tone } = statusLabel(result.decision);
  const { rate, limits, dsr } = result;
  const conditional = result.decision === "CONDITIONAL";
  return (
    <section className="decision" aria-labelledby="decision-heading">
      <div className="decision-head">
        <h2 id="decision-heading">{heading}</h2>
        <StatusChip label={label} tone={tone} />
        {result.source === "OVERRIDE" && <StatusChip label="운영자 변경" tone="info" />}
      </div>
      <p className="decision-sentence" tabIndex={-1}>{decisionSentence(result, requestedAmount, productMin)}</p>
      <dl className="figure-row" style={{ "--figure-cols": 4 } as CSSProperties}>
        <div>
          <dt>적용 금리</dt>
          <dd>{rate ? <>{rate.applied.toFixed(2)}<span className="money-unit">%</span>{rate.capped && <small>상한 적용</small>}</> : "—"}</dd>
        </div>
        <div>
          <dt>최종 한도</dt>
          <dd><Money value={limits?.finalLimit ?? null} />{limits?.bindingRule && <small>병목 {limits.bindingRule}</small>}</dd>
        </div>
        <div>
          <dt>{conditional ? "제안 한도" : "월 납입액"}</dt>
          <dd><Money value={conditional ? result.offeredAmount : result.monthlyPayment} />{conditional && <small>요청 {formatNumber(requestedAmount)}원</small>}</dd>
        </div>
        <div>
          <dt>DSR</dt>
          <dd className={dsr && dsr.ratio > dsr.limit ? "danger" : undefined}>{dsr ? <>{pct(dsr.ratio)}<small>한도 {pct(dsr.limit)}</small></> : "—"}</dd>
        </div>
      </dl>
    </section>
  );
}
