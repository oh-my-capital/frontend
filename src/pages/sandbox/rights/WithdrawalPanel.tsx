import { useState } from "react";
import { errorMessage } from "../../../api/client";
import { rightsApi, WITHDRAWN, type WithdrawalQuote, type WithdrawalResult } from "../../../api/rights";
import type { Contract } from "../../../api/types";
import Disclosure from "../../../components/Disclosure";
import LoadError from "../../../components/LoadError";
import Loading from "../../../components/Loading";
import Money from "../../../components/Money";
import ProgressBar from "../../../components/ProgressBar";
import StatusChip from "../../../components/StatusChip";
import { formatDate } from "../../../lib/format";
import { pct, won } from "../../calculators/parts/labels";
import { useLoad } from "../../calculators/parts/useLoad";
import LegalBasisLine from "./LegalBasisLine";
import { CONTRACT_STATUS_LABEL, periodLabel, shortDate } from "./labels";

/**
 * 청약철회(S-190·S-191). 철회 가능 기간(남은 일수) → 견적 표(남은 원금 + 약정 이자 − 이미 낸 이자, 수수료 0) → 확인 문구 → 실행.
 * 기간이 지났거나 ACTIVE 가 아니면 이유 문장만 둔다. 결제계좌가 모자라면 부족액을 보여 주고 실행 버튼을 막는다(서버도 409).
 */
export default function WithdrawalPanel({ contract: c, businessDate, balance, onDone }: { contract: Contract; businessDate: string; balance: number; onDone: () => void }) {
  const quote = useLoad<WithdrawalQuote>(signal => rightsApi.withdrawalQuote(c.id, signal), [c.id, c.status, c.outstandingPrincipal, businessDate, balance],
    (c.status as string) !== "PAID_OFF");
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<WithdrawalResult | null>(null);
  const status = c.status as string;

  const execute = async () => {
    setBusy(true); setError("");
    try {
      const done = await rightsApi.withdraw(c.id);
      setResult(done); setConfirming(false);
      onDone();
    } catch (err) { setError(errorMessage(err)); } finally { setBusy(false); }
  };

  if (status === "PAID_OFF" && !result) return null;
  const q = quote.data;
  return (
    <section className="panel rights-panel" aria-labelledby="withdrawal-title">
      <h3 id="withdrawal-title">청약철회</h3>
      <p className="muted rights-lead">대출 계약은 실행일부터 14일 안에 이유 없이 철회할 수 있어요. 받은 원금과 그동안의 약정 이자만 돌려주고 중도상환수수료는 내지 않아요.</p>
      {result ? <WithdrawalDone result={result} /> : quote.error ? <LoadError error={quote.error} onRetry={quote.reload} /> : !q ? <Loading message="철회 견적을 계산하고 있어요" /> : (
        <>
          <PeriodLine q={q} />
          {!q.withdrawable ? <Blocked q={q} status={status} closedOn={c.closedOn} /> : (
            <div className="rights-quote" aria-live="polite">
              <QuoteTable q={q} />
              {(q.shortfall ?? 0) > 0 && <p className="form-error" role="alert">결제계좌 잔액이 {won(q.shortfall ?? 0)} 부족해요. 아래 결제계좌 입금에서 넣은 뒤 실행해요.</p>}
              {error && <p className="form-error" role="alert">{error}</p>}
              {!confirming ? (
                <div className="form-actions"><button type="button" className="btn btn-primary" disabled={busy} onClick={() => setConfirming(true)}>이 조건으로 청약철회</button></div>
              ) : (
                <div className="prepay-confirm" role="group" aria-label="청약철회 실행 확인">
                  <p>반환액 <strong>{won(q.totalDue ?? 0)}</strong>을 결제계좌에서 빼고 계약을 "청약 철회"로 닫아요. 남은 회차는 모두 취소되고 되돌릴 수 없어요.</p>
                  <div className="btn-row">
                    <button type="button" className="btn btn-primary" disabled={busy || (q.shortfall ?? 0) > 0} onClick={execute}>{busy ? "철회하고 있어요…" : "철회 확인"}</button>
                    <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => setConfirming(false)}>취소</button>
                  </div>
                </div>
              )}
            </div>
          )}
          <LegalBasisLine basis={q.legalBasis} />
          <Disclosure data={q.disclosure} />
        </>
      )}
    </section>
  );
}

/** 실행일 · 마지막 가능일 · 남은 일수 라벨 + 기간 막대. */
function PeriodLine({ q }: { q: WithdrawalQuote }) {
  const label = periodLabel(q);
  const elapsed = Math.min(q.elapsedDays, q.periodDays);
  return (
    <div className="rights-period">
      <p className="rights-period-line">
        <StatusChip label={label.label} tone={label.tone} />
        <span>실행일 {formatDate(q.startDate)} · 마지막 가능일 {formatDate(q.deadline)} · 오늘 {q.elapsedDays}일째</span>
      </p>
      <ProgressBar value={elapsed} total={q.periodDays} tone={q.daysLeft < 0 ? "danger" : "primary"} label={`철회 기간 ${q.periodDays}일 중 ${elapsed}일 지남`} />
    </div>
  );
}

function Blocked({ q, status, closedOn }: { q: WithdrawalQuote; status: string; closedOn: string | null }) {
  if (status === WITHDRAWN) {
    return <p className="rights-note"><StatusChip label={CONTRACT_STATUS_LABEL.WITHDRAWN.label} tone={CONTRACT_STATUS_LABEL.WITHDRAWN.tone} /> {formatDate(closedOn)}에 철회한 계약이에요. 반환액을 돌려줬고 남은 회차는 취소됐어요. 거래 내역 탭에서 철회 거래(WITHDRAWAL)를 확인해요.</p>;
  }
  if (q.blockedReason === "WITHDRAWAL_PERIOD_EXPIRED") {
    return <p className="rights-note">실행일부터 {q.periodDays}일이 지나 철회할 수 없어요({formatDate(q.deadline)}까지 가능했어요). 미리 갚으려면 중도상환을 이용해요. 중도상환은 수수료가 붙을 수 있어요.</p>;
  }
  return <p className="rights-note">연체가 없는 정상 계약만 철회할 수 있어요. 미납분을 먼저 갚은 뒤 다시 확인해요.</p>;
}

function QuoteTable({ q }: { q: WithdrawalQuote }) {
  const segments = q.interestSegments ?? [];
  const net = q.netInterest ?? 0;
  return (
    <table className="table table-compact rights-table">
      <caption>청약철회 견적 · {formatDate(q.asOf)} 기준</caption>
      <tbody>
        <tr><th scope="row">돌려줄 남은 원금</th><td className="num"><Money value={q.outstandingPrincipal} /></td></tr>
        <tr>
          <th scope="row">약정 이자 {q.elapsedDays}일<span className="rights-sub">잔액 × 연이율 × 일수 ÷ 365(절사)</span></th>
          <td className="num"><Money value={q.contractInterest} /></td>
        </tr>
        {segments.length > 1 && segments.map(s => (
          <tr key={s.from} className="rights-segment">
            <th scope="row">{shortDate(s.from)}~{shortDate(s.to)} · {s.days}일<span className="rights-sub">잔액 {won(s.balance)} · 연 {pct(s.rate)}</span></th>
            <td className="num"><Money value={s.interest} /></td>
          </tr>
        ))}
        {(q.interestPaid ?? 0) > 0 && <tr><th scope="row">이미 낸 이자(차감)</th><td className="num">−<Money value={q.interestPaid} /></td></tr>}
        <tr>
          <th scope="row">{net < 0 ? "순 이자(환급)" : "순 이자"}<span className="rights-sub">약정 이자 − 이미 낸 이자</span></th>
          <td className="num">{net < 0 ? <>−<Money value={-net} /></> : <Money value={net} />}</td>
        </tr>
        {(q.feeRefund ?? 0) > 0 && <tr><th scope="row">이미 낸 수수료 환급</th><td className="num">−<Money value={q.feeRefund} /></td></tr>}
        <tr><th scope="row">중도상환수수료<span className="rights-sub">청약철회에는 위약금을 받지 않는다</span></th><td className="num"><Money value={q.prepaymentFee} /></td></tr>
      </tbody>
      <tfoot>
        <tr><th scope="row">반환액</th><td className="num"><Money value={q.totalDue} strong /></td></tr>
        <tr><th scope="row">결제계좌 잔액</th><td className="num"><Money value={q.settlementBalance} /></td></tr>
      </tfoot>
    </table>
  );
}

function WithdrawalDone({ result: r }: { result: WithdrawalResult }) {
  const t = r.transaction;
  return (
    <div className="rights-result" aria-live="polite">
      <p className="form-done" role="status">
        {formatDate(r.withdrawnOn)}에 청약철회했어요. 반환액 {won(t.totalAmount)}(원금 {won(t.principal)} · 이자 {t.interest < 0 ? `−${won(-t.interest)} 환급` : won(t.interest)} · 수수료 {won(Math.max(0, t.fee))})을 결제계좌에서 뺐고 남은 {r.cancelledInstallments}회차를 취소했어요.
      </p>
      <p className="rights-period-line"><StatusChip label={CONTRACT_STATUS_LABEL.WITHDRAWN.label} tone={CONTRACT_STATUS_LABEL.WITHDRAWN.tone} /><span>결제계좌 잔액 <Money value={t.settlementBalanceAfter} /></span></p>
      <Disclosure data={r.quote.disclosure} />
    </div>
  );
}
