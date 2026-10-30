import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { errorMessage } from "../../api/client";
import { sandboxApi } from "../../api/sandbox";
import type { Application } from "../../api/types";
import Disclosure from "../../components/Disclosure";
import Icon from "../../components/Icon";
import LoadError from "../../components/LoadError";
import Loading from "../../components/Loading";
import Money from "../../components/Money";
import StatusChip, { statusLabel } from "../../components/StatusChip";
import SubPageHeader from "../../components/SubPageHeader";
import { formatDate } from "../../lib/format";
import DecisionSummary from "../calculators/parts/DecisionSummary";
import { formatDateTime, METHOD_LABEL, won } from "../calculators/parts/labels";
import LimitBreakdown from "../calculators/parts/LimitBreakdown";
import RateBreakdown from "../calculators/parts/RateBreakdown";
import ScreeningReasons from "../calculators/parts/ScreeningReasons";
import { useLoad } from "../calculators/parts/useLoad";

/**
 * 신청·심사 결과(S-14): 결정 배지+문장 → 금리·한도 구성 → 근거 표(S-07과 같은 컴포넌트) → 행동(조건부 수락·취소·실행) → override 이력.
 * 실행(POST /execute)이 성공하면 계약 상세로 이동한다.
 */
export default function ApplicationPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const appId = Number(id);
  const app = useLoad<Application>(signal => sandboxApi.application(appId, signal), [appId], Number.isFinite(appId));
  const [busy, setBusy] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");
  const [done, setDone] = useState("");

  const act = async (name: string, fn: () => Promise<Application>, message: string) => {
    setBusy(name); setActionError(""); setDone("");
    try { app.setData(await fn()); setDone(message); } catch (err) { setActionError(errorMessage(err)); } finally { setBusy(null); }
  };
  const execute = async () => {
    setBusy("execute"); setActionError("");
    try {
      const contract = await sandboxApi.execute(appId);
      navigate(`/sandbox/contracts/${contract.id}`, { state: { executed: true } });
    } catch (err) { setActionError(errorMessage(err)); setBusy(null); }
  };

  if (app.error) {
    return (
      <>
        <SubPageHeader section="sandbox" current="/sandbox" title="신청·심사 결과" detail="찾을 수 없음" />
        <main className="page-main"><LoadError error={app.error} onRetry={app.reload} /><nav className="next-actions"><Link to="/sandbox">내 모의 여신 <Icon name="next" size={16} /></Link></nav></main>
      </>
    );
  }
  const a = app.data;
  if (!a) {
    return (
      <>
        <SubPageHeader section="sandbox" current="/sandbox" title="신청·심사 결과" detail="불러오는 중" />
        <main className="page-main"><Loading message="심사 결과를 불러오고 있어요" minHeight={400} /></main>
      </>
    );
  }
  const status = statusLabel(a.status);
  const canCancel = a.status === "APPROVED" || a.status === "CONDITIONAL";

  return (
    <>
      <SubPageHeader
        section="sandbox"
        current="/sandbox"
        detail={a.applicationNo}
        title={`신청 ${a.applicationNo}`}
        description={`${a.product.name} ${won(a.requestedAmount)} · ${a.termMonths}회 · ${METHOD_LABEL[a.repaymentMethod]} · 매월 ${a.paymentDay}일 · 자동이체 ${a.autoDebit ? "신청" : "없음"}. 접수와 동시에 자동 심사한 결과예요.`}
        meta={<>신청일 {formatDate(a.appliedOn)} · 결정일 {formatDate(a.decidedOn)} · 현재 상태 <StatusChip label={status.label} tone={status.tone} /></>}
      />
      <main className="page-main sandbox">
        <div className="page-grid">
          <div className="stack calc-stack">
            <DecisionSummary result={a.screening} requestedAmount={a.requestedAmount} productMin={a.product.minAmount} />
            <section className="panel application-actions" aria-labelledby="actions-title" aria-live="polite">
              <h3 id="actions-title">다음 행동</h3>
              {a.status === "APPROVED" && <p>승인됐어요. 실행하면 영업일 기준으로 계약이 만들어지고 원금 <Money value={a.screening.offeredAmount ?? a.requestedAmount} />이 결제계좌에 입금돼요.</p>}
              {a.status === "CONDITIONAL" && <p>요청 금액을 다 빌릴 수는 없지만 제안 한도 <Money value={a.screening.offeredAmount} strong />까지는 가능해요. 수락하면 승인 상태가 되고, 그 금액으로 실행할 수 있어요.</p>}
              {a.status === "REJECTED" && <p>거절된 신청은 그대로 둬요. 근거 표에서 걸린 규칙을 확인하고 프로필이나 조건을 바꿔 다시 신청해 봐요.</p>}
              {a.status === "CANCELLED" && <p>취소한 신청이에요. 다시 신청하려면 대출 신청으로 가요.</p>}
              {a.status === "EXECUTED" && <p>이미 실행되어 계약이 됐어요. {a.contractId !== null && <Link to={`/sandbox/contracts/${a.contractId}`}>계약 상세 보기</Link>}</p>}
              {actionError && <p className="form-error" role="alert">{actionError}</p>}
              {done && <p className="form-done" role="status">{done}</p>}
              <div className="btn-row">
                {a.status === "CONDITIONAL" && <button type="button" className="btn btn-primary" disabled={busy !== null} onClick={() => act("accept", () => sandboxApi.accept(appId), `제안 한도 ${won(a.screening.offeredAmount ?? 0)}으로 수락했어요. 이제 실행할 수 있어요.`)}>{busy === "accept" ? "수락하고 있어요…" : `제안 한도 ${won(a.screening.offeredAmount ?? 0)}으로 수락`}</button>}
                {a.status === "APPROVED" && <button type="button" className="btn btn-primary" disabled={busy !== null} onClick={execute}>{busy === "execute" ? "실행하고 있어요…" : "대출 실행"}</button>}
                {canCancel && <button type="button" className="btn btn-danger" disabled={busy !== null} onClick={() => act("cancel", () => sandboxApi.cancel(appId), "신청을 취소했어요.")}>{busy === "cancel" ? "취소하고 있어요…" : "신청 취소"}</button>}
                {(a.status === "REJECTED" || a.status === "CANCELLED") && <Link className="btn btn-secondary" to="/sandbox/apply">다시 신청하기</Link>}
                {a.status === "EXECUTED" && a.contractId !== null && <Link className="btn btn-primary" to={`/sandbox/contracts/${a.contractId}`}>계약 상세로</Link>}
              </div>
            </section>
            <RateBreakdown result={a.screening} autoDebit={a.autoDebit} monthlyPayment={a.screening.monthlyPayment} />
            <LimitBreakdown result={a.screening} requestedAmount={a.requestedAmount} />
            <ScreeningReasons reasons={a.screening.reasons} />
            {a.overrides.length > 0 && (
              <table className="table table-compact">
                <caption>운영자 결정 변경 이력 {a.overrides.length}건</caption>
                <thead><tr><th scope="col">시각</th><th scope="col">이전</th><th scope="col">이후</th><th scope="col" className="num">금액</th><th scope="col">사유</th></tr></thead>
                <tbody>
                  {a.overrides.map((o, i) => <tr key={i}><td>{formatDateTime(o.createdAt)}</td><td>{statusLabel(o.beforeDecision).label}</td><td>{statusLabel(o.afterDecision).label}</td><td className="num"><Money value={o.afterAmount} /></td><td>{o.reason}</td></tr>)}
                </tbody>
              </table>
            )}
            <Disclosure data={a.screening.disclosure} />
          </div>
          <aside aria-label="신청 조건">
            <div className="panel">
              <h3>신청 조건</h3>
              <dl className="def-list">
                <div><dt>상품</dt><dd>{a.product.name}</dd></div>
                <div><dt>요청 금액</dt><dd><Money value={a.requestedAmount} /></dd></div>
                <div><dt>기간 · 방식</dt><dd>{a.termMonths}회 · {METHOD_LABEL[a.repaymentMethod]}</dd></div>
                <div><dt>납입일</dt><dd>매월 {a.paymentDay}일</dd></div>
                <div><dt>자동이체</dt><dd>{a.autoDebit ? "신청" : "없음"}</dd></div>
                {a.collateral && <div><dt>담보</dt><dd>{String(a.collateral.description ?? "차량")} · <Money value={Number(a.collateral.appraisedValue ?? 0)} /></dd></div>}
                <div><dt>심사 출처</dt><dd>{a.screening.source === "OVERRIDE" ? "운영자 변경" : "자동 심사"}</dd></div>
              </dl>
            </div>
            <div className="panel panel-soft">
              <h3>읽는 법</h3>
              <p className="muted">한도 표에서 "병목"이 붙은 요소가 최종 한도를 정한 규칙이에요. 조건부 승인이면 그 한도까지만 빌릴 수 있어요. 근거 표는 자격 → 금리 → 한도 → 결정 순서 그대로예요.</p>
            </div>
          </aside>
        </div>
        <nav className="next-actions" aria-label="다음 행동">
          <Link to="/sandbox">내 모의 여신 <Icon name="next" size={16} /></Link>
          <Link to="/calculators/screening">같은 조건을 심사 시뮬레이터에서 바꿔 보기 <Icon name="next" size={16} /></Link>
        </nav>
      </main>
    </>
  );
}
