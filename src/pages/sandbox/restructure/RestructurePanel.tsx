import { useState, type FormEvent } from "react";
import { createIdempotencyKey, errorMessage } from "../../../api/client";
import {
  RESTRUCTURE_LABEL, restructureApi, type RestructureHistory, type RestructureLimit, type RestructurePolicy, type RestructureQuote, type RestructureType,
} from "../../../api/restructure";
import type { Contract } from "../../../api/types";
import Disclosure from "../../../components/Disclosure";
import LoadError from "../../../components/LoadError";
import Loading from "../../../components/Loading";
import StatusChip from "../../../components/StatusChip";
import { won } from "../../calculators/parts/labels";
import { useLoad } from "../../calculators/parts/useLoad";
import HistoryTable from "./HistoryTable";
import QuoteCompare from "./QuoteCompare";
import { appliedSummary, quoteSummary } from "./text";
import "../../../styles/restructure.css";

const TYPES: RestructureType[] = ["DEFERMENT", "EXTENSION"];
const TYPE_HINT: Record<RestructureType, string> = {
  DEFERMENT: "그 기간 회차는 이자만 내고, 이후 남은 원금을 남은 원래 회차에 나눠요. 만기는 그대로예요.",
  EXTENSION: "남은 원금을 늘어난 회차에 나눠 월 납입액을 줄여요. 만기가 늦춰져요.",
};

const limitOf = (p: RestructurePolicy, t: RestructureType): RestructureLimit => (t === "DEFERMENT" ? p.deferment : p.extension);

/** 지금 고를 수 있는 개월 목록(1회 최소 ~ 지금 가능한 최대). */
function monthOptions(limit: RestructureLimit): number[] {
  const out: number[] = [];
  for (let m = limit.minMonths; m <= limit.availableMonths; m++) out.push(m);
  return out;
}

/** 종류를 고를 수 없을 때의 짧은 사유. */
function unavailableReason(p: RestructurePolicy, t: RestructureType): string {
  const l = limitOf(p, t);
  if (l.usedMonths >= l.maxTotalMonths) return `누적 한도 ${l.maxTotalMonths}개월을 모두 썼어요`;
  if (t === "DEFERMENT") return `유예 뒤 원금 회차가 ${p.minInstallmentsAfterDeferment}회 이상 남아야 해요`;
  return "지금은 신청할 수 없어요";
}

/**
 * 상환 유예·만기 연장 패널(S-180~182, FR-31). 계약 상세(S-15)에 한 줄로 붙는다.
 * 신청 가능 여부·남은 한도(GET restructures) → 종류·개월 선택 → 견적 비교표(GET restructure-quote) → 사유 선택·확인 → 적용(POST, Idempotency-Key) → 결과·이력.
 * 견적은 만든 시점의 계약 상태 키에 묶어 두고, 시간 진행 등으로 계약이 바뀌면 지난 견적을 숨긴다(적용은 서버가 그날 기준으로 다시 계산한다).
 */
export default function RestructurePanel({ contract: c, businessDate, onDone }: { contract: Contract; businessDate: string; onDone: () => void }) {
  const stateKey = [c.id, businessDate, c.status, c.paidInstallments, c.termMonths, c.outstandingPrincipal, c.nextPayment].join("|");
  const history = useLoad<RestructureHistory>(signal => restructureApi.history(c.id, signal), [stateKey], c.status !== "PAID_OFF");
  const [type, setType] = useState<RestructureType>("DEFERMENT");
  const [months, setMonths] = useState(1);
  const [quoted, setQuoted] = useState<{ key: string; quote: RestructureQuote; idempotencyKey: string } | null>(null);
  const [reason, setReason] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [busy, setBusy] = useState<"quote" | "apply" | null>(null);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");

  if (c.status === "PAID_OFF") return null;
  const quote = quoted && quoted.key === stateKey ? quoted.quote : null;
  const policy = history.data?.policy ?? null;

  // 고른 종류가 지금 불가하고 다른 종류가 가능하면 그쪽을 보여 준다. 개월은 가능한 범위로 맞춘다(상태에서 파생, effect 없음).
  const other: RestructureType = type === "DEFERMENT" ? "EXTENSION" : "DEFERMENT";
  const activeType: RestructureType = policy && limitOf(policy, type).availableMonths <= 0 && limitOf(policy, other).availableMonths > 0 ? other : type;
  const options = policy ? monthOptions(limitOf(policy, activeType)) : [];
  const activeMonths = options.includes(months) ? months : options[0] ?? 1;

  const choose = (next: RestructureType) => {
    setType(next);
    setQuoted(null);
    setError("");
  };

  const getQuote = async (event: FormEvent) => {
    event.preventDefault();
    setBusy("quote"); setError(""); setDone(""); setAcknowledged(false);
    try {
      const q = await restructureApi.quote(c.id, activeType, activeMonths);
      setQuoted({ key: stateKey, quote: q, idempotencyKey: createIdempotencyKey() });
    } catch (err) {
      setQuoted(null);
      setError(errorMessage(err));
    } finally { setBusy(null); }
  };

  const apply = async () => {
    if (!quoted || !quote) return;
    if (!reason) { setError("사유를 골라요."); return; }
    setBusy("apply"); setError("");
    try {
      const m = await restructureApi.apply(c.id, { type: quote.type, months: quote.months, reasonCode: reason }, quoted.idempotencyKey);
      setDone(appliedSummary(m.type, m.months, m.businessDate, m.after));
      setQuoted(null); setReason(""); setAcknowledged(false);
      history.reload();
      onDone();
    } catch (err) {
      setError(`${errorMessage(err)} 견적을 다시 받아 확인해요.`);
    } finally { setBusy(null); }
  };

  const interestUp = quote ? quote.change.remainingInterest : 0;

  return (
    <section className="panel restructure" aria-labelledby="restructure-title">
      <div className="panel-head">
        <h2 id="restructure-title">상환 유예 · 만기 연장</h2>
        <p>돈이 잠시 모자랄 때 원금을 몇 달 미루거나(유예) 갚는 기간을 늘리면(연장) 월 납입액·남은 총이자·만기가 어떻게 바뀌는지 견적으로 비교하고 실제로 적용해 봐요.</p>
      </div>

      {history.error ? <LoadError error={history.error} onRetry={history.reload} /> : !policy ? <Loading message="신청 조건을 확인하고 있어요" /> : (
        <>
          <p className="restructure-status">
            {policy.eligible ? <StatusChip label="신청 가능" tone="good" /> : <StatusChip label="지금은 신청 불가" tone="warn" />}
            <span>{policy.eligible
              ? `정상 계약이고 연체가 없어요. ${policy.paidInstallments}회 납입 · 남은 ${policy.remainingInstallments}회.`
              : policy.ineligibleMessage}</span>
          </p>

          <div className="table-scroll">
            <table className="table table-compact restructure-limits restructure-stack">
              <caption>
                계약당 한도
                <span className="table-caption-note">조건: 정상(연체 없음) · 실행 후 {policy.minPaidInstallments}회 이상 납입 · 유예 뒤 원금 회차 {policy.minInstallmentsAfterDeferment}회 이상. 수치는 교육용 가정값이다.</span>
              </caption>
              <thead><tr><th scope="col">구분</th><th scope="col" className="num">1회 범위</th><th scope="col" className="num">누적 사용 / 상한</th><th scope="col" className="num">지금 가능</th></tr></thead>
              <tbody>
                {TYPES.map(t => {
                  const l = limitOf(policy, t);
                  return (
                    <tr key={t}>
                      <th scope="row">{RESTRUCTURE_LABEL[t]}</th>
                      <td data-label="1회 범위" className="num">{l.minMonths}~{l.maxMonths}개월</td>
                      <td data-label="누적 사용 / 상한" className="num">{l.usedMonths} / {l.maxTotalMonths}개월</td>
                      <td data-label="지금 가능" className="num">{l.availableMonths > 0 ? `최대 ${l.availableMonths}개월` : "불가"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {policy.eligible && (
            <form className="restructure-form" onSubmit={getQuote} noValidate>
              <fieldset className="restructure-type">
                <legend className="field-label">종류</legend>
                {TYPES.map(t => {
                  const available = limitOf(policy, t).availableMonths > 0;
                  return (
                    <label key={t} className="field-check">
                      <input type="radio" name="restructure-type" value={t} checked={activeType === t} disabled={!available} onChange={() => choose(t)} />
                      <span><strong>{RESTRUCTURE_LABEL[t]}</strong> — {available ? TYPE_HINT[t] : unavailableReason(policy, t)}</span>
                    </label>
                  );
                })}
              </fieldset>
              <div className="field restructure-months">
                <label className="field-label" htmlFor="restructure-months">개월</label>
                <select id="restructure-months" className="field-select" value={activeMonths} onChange={e => { setMonths(Number(e.target.value)); setQuoted(null); }}
                  disabled={options.length === 0}>
                  {options.map(m => <option key={m} value={m}>{m}개월</option>)}
                </select>
              </div>
              <div className="form-actions">
                <button type="submit" className="btn btn-secondary" disabled={busy !== null || options.length === 0}>
                  {busy === "quote" ? "견적을 계산하고 있어요…" : "견적 보기"}
                </button>
              </div>
            </form>
          )}

          {error && <p className="form-error" role="alert">{error}</p>}

          <div aria-live="polite">
            {quote && <p className="restructure-summary">{quoteSummary(quote)}</p>}
          </div>

          {quote && (
            <div className="restructure-quote">
              <QuoteCompare quote={quote} />
              <Disclosure data={quote.disclosure} />
              <div className="restructure-apply" role="group" aria-label="적용 확인">
                <div className="field">
                  <label className="field-label" htmlFor="restructure-reason">사유</label>
                  <select id="restructure-reason" className="field-select" value={reason} onChange={e => setReason(e.target.value)} required>
                    <option value="">사유를 골라요</option>
                    {quote.policy.reasons.map(r => <option key={r.code} value={r.code}>{r.label}</option>)}
                  </select>
                  <span className="field-hint">목록에서만 골라요. 개인 사정을 글로 적지 않아요(교육용 모의 신청).</span>
                </div>
                <label className="field-check">
                  <input type="checkbox" checked={acknowledged} onChange={e => setAcknowledged(e.target.checked)} />
                  <span>{interestUp > 0
                    ? `월 부담은 바뀌지만 남은 총이자가 ${won(interestUp)} 늘어나는 것을 확인했어요.`
                    : "바뀐 월 납입액과 만기를 확인했어요."} 적용하면 남은 회차가 다시 만들어지고 되돌릴 수 없어요.</span>
                </label>
                <div className="btn-row">
                  <button type="button" className="btn btn-primary" disabled={busy !== null || !reason || !acknowledged} onClick={apply}>
                    {busy === "apply" ? "적용하고 있어요…" : `${RESTRUCTURE_LABEL[quote.type]} ${quote.months}개월 적용`}
                  </button>
                  <button type="button" className="btn btn-secondary" disabled={busy !== null} onClick={() => { setQuoted(null); setError(""); }}>견적 닫기</button>
                </div>
              </div>
            </div>
          )}

          {done && <p className="form-done" role="status">{done} 회차표·타임라인 탭에서 바뀐 회차를 볼 수 있어요.</p>}

          {history.data && history.data.items.length > 0 && <HistoryTable items={history.data.items} />}
          <p className="faint restructure-note">{policy.assumption}</p>
        </>
      )}
    </section>
  );
}
