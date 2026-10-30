import Money from "../../../components/Money";
import StatusChip, { statusLabel } from "../../../components/StatusChip";
import type { ScreeningResult } from "../../../api/types";
import { decisionSentence, pct } from "./labels";

/** 결정 배지 + 한 문장 + 핵심 숫자 세 개(적용 금리·최종 한도·월 납입). S-07·S-14 공용. */
export default function DecisionSummary({ result, requestedAmount, productMin, heading = "심사 결과" }: { result: ScreeningResult; requestedAmount: number; productMin: number | null; heading?: string }) {
  const { label, tone } = statusLabel(result.decision);
  return (
    <section className="decision" aria-labelledby="decision-heading">
      <div className="decision-head">
        <h2 id="decision-heading">{heading}</h2>
        <StatusChip label={label} tone={tone} />
        {result.source === "OVERRIDE" && <StatusChip label="운영자 변경" tone="info" />}
      </div>
      <p className="decision-sentence" tabIndex={-1}>{decisionSentence(result, requestedAmount, productMin)}</p>
      <dl className="decision-figures">
        <div><dt>적용 금리</dt><dd>{result.rate ? pct(result.rate.applied) : "—"}</dd></div>
        <div><dt>최종 한도</dt><dd>{result.limits ? <Money value={result.limits.finalLimit} /> : "—"}</dd></div>
        <div><dt>{result.decision === "CONDITIONAL" ? "제안 한도" : "월 납입액"}</dt><dd>{result.decision === "CONDITIONAL" ? <Money value={result.offeredAmount} /> : <Money value={result.monthlyPayment} />}</dd></div>
      </dl>
    </section>
  );
}
