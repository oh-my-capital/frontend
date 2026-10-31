import { useState } from "react";
import { Link } from "react-router-dom";
import { errorMessage } from "../../../api/client";
import { rightsApi, type RateCutHistory, type RateCutResult } from "../../../api/rights";
import type { Contract, Profile } from "../../../api/types";
import Disclosure from "../../../components/Disclosure";
import LoadError from "../../../components/LoadError";
import Loading from "../../../components/Loading";
import Money from "../../../components/Money";
import StatusChip from "../../../components/StatusChip";
import { formatDate } from "../../../lib/format";
import { EMPLOYMENT_LABEL, pct, won } from "../../calculators/parts/labels";
import ScheduleTable from "../../calculators/parts/ScheduleTable";
import { useLoad } from "../../calculators/parts/useLoad";
import LegalBasisLine from "./LegalBasisLine";
import { bp, DECISION_LABEL, REASON_LABEL } from "./labels";

/**
 * 금리인하요구(S-192·S-193). 현재 프로필 요약 → 요구 → 결과(전후 금리·납입액, 수락이면 재산정 회차표) → 이력 표.
 * 서버가 현재 프로필로 심사 엔진의 금리만 다시 산정해 최소 인하 폭 이상 낮으면 수락한다. 같은 계약은 정해진 간격에 한 번만 요구할 수 있다.
 */
export default function RateCutPanel({ contract: c, businessDate, profile, onDone }: { contract: Contract; businessDate: string; profile: Profile | null; onDone: () => void }) {
  const history = useLoad<RateCutHistory>(signal => rightsApi.rateCutHistory(c.id, signal), [c.id, c.status, businessDate], (c.status as string) !== "PAID_OFF");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<RateCutResult | null>(null);
  const status = c.status as string;
  const h = history.data;
  if (status === "PAID_OFF" || (status === "WITHDRAWN" && (h?.items.length ?? 0) === 0)) return null;

  const tooSoon = !!h?.nextAvailableOn && businessDate < h.nextAvailableOn;
  const active = status === "ACTIVE";
  const submit = async () => {
    setBusy(true); setError(""); setResult(null);
    try {
      const r = await rightsApi.requestRateCut(c.id);
      setResult(r);
      history.reload();
      onDone();
    } catch (err) { setError(errorMessage(err)); } finally { setBusy(false); }
  };

  return (
    <section className="panel rights-panel" aria-labelledby="ratecut-title">
      <h3 id="ratecut-title">금리인하요구</h3>
      <p className="muted rights-lead">
        신용점수가 오르거나 소득이 늘면 이미 받은 대출의 금리를 낮춰 달라고 요구할 수 있어요. 지금 프로필로 금리를 다시 산정해
        {h ? ` 기존보다 ${bp(h.minReductionBp)} 이상` : " 정해진 폭 이상"} 낮으면 수락하고, 남은 회차를 같은 횟수로 다시 계산해요.
      </p>
      {history.error ? <LoadError error={history.error} onRetry={history.reload} /> : !h ? <Loading message="요구 이력을 불러오고 있어요" /> : (
        <>
          <table className="table table-compact rights-table">
            <caption>지금 요구하면 쓰는 값 · {formatDate(businessDate)}</caption>
            <tbody>
              <tr><th scope="row">기존 약정 금리</th><td className="num">{pct(c.contractRate)}</td></tr>
              {profile ? (
                <>
                  <tr><th scope="row">신용점수</th><td className="num">{profile.creditScore}점</td></tr>
                  <tr><th scope="row">연소득</th><td className="num"><Money value={profile.annualIncome} /></td></tr>
                  <tr><th scope="row">고용형태</th><td className="num">{EMPLOYMENT_LABEL[profile.employmentType]}</td></tr>
                </>
              ) : <tr><th scope="row">프로필</th><td>없음 — 먼저 만들어요</td></tr>}
              <tr><th scope="row">요구 간격</th><td className="num">{h.minIntervalDays}일에 한 번</td></tr>
            </tbody>
          </table>
          <p className="rights-note">신용점수 밴드가 올라가야 금리가 내려가요(교육용 규칙: 900점 이상 A · 800점대 B · 700점대 C · 600점대 D). <Link to="/sandbox/profile">프로필 바꾸기</Link></p>
          {error && <p className="form-error" role="alert">{error}</p>}
          <div className="form-actions">
            <button type="button" className="btn btn-primary" disabled={busy || !active || tooSoon || !profile} onClick={submit}>{busy ? "다시 산정하고 있어요…" : "금리인하 요구하기"}</button>
            {!active && <span className="faint">연체가 없는 정상 계약만 요구할 수 있어요.</span>}
            {active && tooSoon && <span className="faint">다음 요구 가능일 {formatDate(h.nextAvailableOn)}</span>}
          </div>
          {result && <RateCutOutcome r={result} />}
          {h.items.length > 0 && <HistoryTable items={h.items} />}
          <LegalBasisLine basis={h.legalBasis} />
          <Disclosure data={result?.disclosure ?? h.items[0]?.disclosure} />
        </>
      )}
    </section>
  );
}

/** 요구 결과(S-193): 결정 라벨 + 문장 → 전후 비교 표 → 수락이면 재산정 회차표(접힘). */
function RateCutOutcome({ r }: { r: RateCutResult }) {
  const d = DECISION_LABEL[r.decision];
  const accepted = r.decision === "ACCEPTED";
  return (
    <div className="rights-result" aria-live="polite">
      <p className="rights-period-line">
        <StatusChip label={`금리인하요구 ${d.label}`} tone={d.tone} />
        {r.reasonCode && <span className="faint">{REASON_LABEL[r.reasonCode]}</span>}
      </p>
      <p className={accepted ? "form-done" : "rights-note"} role="status">{r.reasonMessage}</p>
      <table className="table table-compact rights-table">
        <caption>요구 전후 · {formatDate(r.requestedOn)}</caption>
        <thead><tr><th scope="col">항목</th><th scope="col" className="num">요구 전</th><th scope="col" className="num">{accepted ? "수락 후" : "재산정"}</th></tr></thead>
        <tbody>
          <tr><th scope="row">금리</th><td className="num">{pct(r.previousRate)}</td><td className="num">{r.recomputedRate === null ? "산정 불가" : pct(r.recomputedRate)}</td></tr>
          <tr><th scope="row">인하 폭</th><td className="num">최소 {bp(r.minReductionBp)}</td><td className="num">{r.reductionBp === null ? "—" : bp(r.reductionBp)}</td></tr>
          <tr><th scope="row">다음 납입액</th><td className="num"><Money value={r.previousPayment} /></td><td className="num">{accepted ? <Money value={r.newPayment} strong /> : "변동 없음"}</td></tr>
          {accepted && <tr><th scope="row">남은 이자 합</th><td className="num"><Money value={r.previousRemainingInterest} /></td><td className="num"><Money value={r.newRemainingInterest} /></td></tr>}
          <tr><th scope="row">남은 회차</th><td className="num">{r.remainingInstallments}회</td><td className="num">{r.remainingInstallments}회</td></tr>
        </tbody>
      </table>
      {accepted && r.revisedSchedule.length > 0 && (
        <details className="fold">
          <summary>재산정 회차표 {r.revisedSchedule.length}회 보기</summary>
          <ScheduleTable rows={r.revisedSchedule} caption={`재산정 회차표 · 연 ${pct(r.appliedRate)}`} />
        </details>
      )}
      <p className="faint">다음 요구 가능일 {formatDate(r.nextAvailableOn)}</p>
    </div>
  );
}

function HistoryTable({ items }: { items: RateCutResult[] }) {
  return (
    <div className="table-scroll">
      <table className="table table-compact rights-history">
        <caption>요구 이력 {items.length}건</caption>
        <thead><tr><th scope="col">요구일</th><th scope="col">결정</th><th scope="col" className="num">금리 · 납입액</th></tr></thead>
        <tbody>
          {items.map(r => {
            const d = DECISION_LABEL[r.decision];
            return (
              <tr key={r.id}>
                <th scope="row">{formatDate(r.requestedOn)}</th>
                <td><StatusChip label={d.label} tone={d.tone} />{r.reasonCode && <span className="rights-sub">{REASON_LABEL[r.reasonCode]}</span>}</td>
                <td className="num">
                  {pct(r.previousRate)} → {r.recomputedRate === null ? "산정 불가" : pct(r.recomputedRate)}
                  <span className="rights-sub">{r.newPayment === null ? `납입 ${won(r.previousPayment)} 그대로` : `납입 ${won(r.previousPayment)} → ${won(r.newPayment)}`}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
