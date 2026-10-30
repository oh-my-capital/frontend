import { useState, type FormEvent } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { errorMessage } from "../../api/client";
import { sandboxApi } from "../../api/sandbox";
import type { Contract, ContractEvent, PrepaymentQuote, Provision, Sandbox, ScheduleRow, Transaction } from "../../api/types";
import Disclosure from "../../components/Disclosure";
import Icon from "../../components/Icon";
import LoadError from "../../components/LoadError";
import Loading from "../../components/Loading";
import Money from "../../components/Money";
import MoneyInput from "../../components/MoneyInput";
import StatusChip, { ContractStatusChip, statusLabel } from "../../components/StatusChip";
import SubPageHeader from "../../components/SubPageHeader";
import Timeline, { type TimelineItem } from "../../components/Timeline";
import { formatDate } from "../../lib/format";
import { ASSET_CLASS_LABEL, describeEvent, eventTitle, eventTone, METHOD_LABEL, pct, TX_TYPE_LABEL, won } from "../calculators/parts/labels";
import ScheduleTable from "../calculators/parts/ScheduleTable";
import Tabs from "../../components/Tabs";
import { useLoad } from "../calculators/parts/useLoad";
import ClockControl from "./parts/ClockControl";
import DepositForm from "./parts/DepositForm";

const daysBetween = (a: string, b: string) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);

/**
 * 계약 상세(S-15·S-17): 요약 표(상태 라벨·잔액·금리·다음 납입·연체일수·건전성) → 탭(회차표 / 거래 내역(변제충당 분해) / 타임라인 / 충당금).
 * 보조 열: 수동 상환 폼, 중도상환 견적 → 실행 확인, 이 계약의 다음 납입일까지 시간 진행, 결제계좌 입금.
 * 연체 중이면 상단에 "연체 12일 · 연체이자 4,380원 · 지금 갚아야 할 금액 892,868원" 요약을 둔다.
 */
export default function ContractPage() {
  const { id = "" } = useParams();
  const location = useLocation();
  const contractId = Number(id);
  const enabled = Number.isFinite(contractId);
  const summary = useLoad<Sandbox>(signal => sandboxApi.summary(signal), []);
  const contract = useLoad<Contract>(signal => sandboxApi.contract(contractId, signal), [contractId], enabled);
  const schedules = useLoad<ScheduleRow[]>(signal => sandboxApi.schedules(contractId, signal), [contractId], enabled);
  const transactions = useLoad<Transaction[]>(signal => sandboxApi.transactions(contractId, signal), [contractId], enabled);
  const events = useLoad<ContractEvent[]>(signal => sandboxApi.events(contractId, signal), [contractId], enabled);
  const provisions = useLoad<Provision[]>(signal => sandboxApi.provisions(contractId, signal), [contractId], enabled);
  const [tab, setTab] = useState("schedule");
  // 실행 직후 S-14에서 넘어왔을 때만 안내를 보이고, 어떤 행동이든 하면 치운다.
  const [justExecuted, setJustExecuted] = useState(!!(location.state as { executed?: boolean } | null)?.executed);
  const reloadAll = () => { setJustExecuted(false); summary.reload(); contract.reload(); schedules.reload(); transactions.reload(); events.reload(); provisions.reload(); };

  if (contract.error) {
    return (
      <>
        <SubPageHeader section="sandbox" current="/sandbox" title="계약 상세" detail="찾을 수 없음" />
        <main className="page-main"><LoadError error={contract.error} onRetry={contract.reload} /><nav className="next-actions"><Link to="/sandbox">내 모의 여신 <Icon name="next" size={16} /></Link></nav></main>
      </>
    );
  }
  const c = contract.data;
  const s = summary.data;
  if (!c || !s) {
    return (
      <>
        <SubPageHeader section="sandbox" current="/sandbox" title="계약 상세" detail="불러오는 중" />
        <main className="page-main"><Loading message="계약을 불러오고 있어요" minHeight={400} /></main>
      </>
    );
  }
  const isOverdue = c.status === "OVERDUE" || c.status === "DEFAULTED";
  const klass = statusLabel(c.assetClass);
  const daysToDue = c.nextDueDate && c.nextDueDate >= s.businessDate ? daysBetween(s.businessDate, c.nextDueDate) + 1 : null;

  return (
    <>
      <SubPageHeader
        section="sandbox"
        current="/sandbox"
        detail={c.contractNo}
        title={`계약 ${c.contractNo}`}
        description={`${c.productName} ${won(c.principal)} · ${c.termMonths}회 · ${METHOD_LABEL[c.repaymentMethod]} · 연 ${pct(c.contractRate)} · 매월 ${c.paymentDay}일 · 자동이체 ${c.autoDebit ? "있음" : "없음"}. 실행일 ${formatDate(c.startDate)} 만기 ${formatDate(c.maturityDate)}`}
        meta={<>영업일 {formatDate(s.businessDate)} · 결제계좌 <Money value={s.settlementBalance} /> · <ContractStatusChip status={c.status} overdueDays={c.overdueDays} /></>}
      />
      <main className="page-main sandbox contract">
        {justExecuted && <p className="form-done contract-executed" role="status">대출이 실행됐어요. 원금 {won(c.principal)}이 결제계좌에 입금됐고 1회차 납입일은 {formatDate(c.nextDueDate)}이에요. 아래 "다음 납입일까지"로 시간을 진행하면 자동이체를 볼 수 있어요.</p>}
        {isOverdue && c.delinquency && (
          <section className="contract-overdue" role="alert" aria-labelledby="overdue-title">
            <h2 id="overdue-title">{c.status === "DEFAULTED" ? "기한이익상실" : "연체 중"}</h2>
            <p className="contract-overdue-line">
              <strong>{c.overdueDays > 0 ? `연체 ${c.overdueDays}일` : "연체 시작(납입일 미납, 연체이자는 내일부터)"}</strong> · 연체이자 <Money value={c.delinquency.unpaidOverdueInterest} /> · 지금 갚아야 할 금액 <Money value={c.amountDueNow} strong />
            </p>
            <p className="muted">
              연체 시작 {formatDate(c.delinquency.startedOn)} · 연체 대상 <Money value={c.delinquency.baseAmount} /> × 연체이율 {pct(c.overdueRate)} × 일수 ÷ 365(절사)
              {c.delinquency.noticeSentOn && ` · 상실 예정 통지 ${formatDate(c.delinquency.noticeSentOn)}`}
              {c.delinquency.acceleratedOn ? ` · 기한이익상실 ${formatDate(c.delinquency.acceleratedOn)}, 이제 잔액 전체에 연체이자가 붙어요` : " · 60일이면 기한이익이 상실돼 잔액 전체를 청구해요"}
            </p>
          </section>
        )}
        <div className="page-grid">
          <div className="contract-main">
            <table className="table contract-summary">
              <caption>계약 요약 · 영업일 {formatDate(s.businessDate)} 기준</caption>
              <tbody>
                <tr><th scope="row">상태</th><td><ContractStatusChip status={c.status} overdueDays={c.overdueDays} />{c.closedOn && <> · 완제일 {formatDate(c.closedOn)}</>}</td></tr>
                <tr><th scope="row">잔액(남은 원금)</th><td><Money value={c.outstandingPrincipal} strong /> <span className="faint">원금 {won(c.principal)} 중</span></td></tr>
                <tr><th scope="row">금리</th><td>약정 {pct(c.contractRate)} · 연체이율 {pct(c.overdueRate)} <span className="faint">(약정 + 3%p, 최고 20%)</span></td></tr>
                <tr><th scope="row">다음 납입</th><td>{c.nextDueDate ? <>{formatDate(c.nextDueDate)} · <Money value={c.nextPayment} />{daysToDue !== null ? <span className="faint"> · {daysToDue - 1}일 뒤</span> : <span className="faint"> · 납입일이 지난 미납 회차. 아래 "지금 갚아야 할 금액"으로 갚아요</span>}</> : "없음"}</td></tr>
                <tr><th scope="row">납입 진행</th><td>{c.paidInstallments} / {c.totalInstallments}회 · 총 납입 <Money value={c.totalPaid} /> · 그중 이자 <Money value={c.totalInterestPaid} /></td></tr>
                <tr><th scope="row">연체</th><td>{c.overdueDays > 0 ? <StatusChip label={`연체 ${c.overdueDays}일`} tone="danger" /> : isOverdue ? <><StatusChip label="연체 시작" tone="danger" /> <span className="faint">납입일 일마감에 미납 · 연체일수는 연체 시작일부터 1일씩</span></> : <StatusChip label="연체 없음" tone="good" />}</td></tr>
                <tr><th scope="row">건전성 분류</th><td><StatusChip label={ASSET_CLASS_LABEL[c.assetClass] ?? klass.label} tone={klass.tone} /> <span className="faint">연체일수로 매일 재분류 · 정상 0~29 · 요주의 30~89 · 고정 90~179 · 회수의문 180~364 · 추정손실 365+</span></td></tr>
                <tr><th scope="row">지금 갚아야 할 금액</th><td><Money value={c.amountDueNow} strong /> <span className="faint">{c.amountDueNow > 0 ? "미납 회차 + 연체이자(기한이익상실이면 잔액 전체)" : "미납이 없어요. 미리 갚으려면 중도상환"}</span></td></tr>
              </tbody>
            </table>

            <Tabs
              label="계약 상세 탭"
              current={tab}
              onChange={setTab}
              items={[
                {
                  id: "schedule", label: "회차표",
                  content: schedules.error ? <LoadError error={schedules.error} onRetry={schedules.reload} /> : !schedules.data ? <Loading message="회차표를 불러오고 있어요" /> : (
                    <ScheduleTable rows={schedules.data} caption={`회차표 · ${schedules.data.length}회 · 현재 revision`} showStatus captionNote="납입일은 토·일이면 다음 월요일로 이연한 실제 납입일이다. 일부 중도상환 뒤에는 남은 회차가 재산정된다." />
                  ),
                },
                {
                  id: "transactions", label: "거래 내역",
                  content: transactions.error ? <LoadError error={transactions.error} onRetry={transactions.reload} /> : !transactions.data ? <Loading message="거래 내역을 불러오고 있어요" /> : transactions.data.length === 0 ? (
                    <div className="state-box is-empty"><h3>아직 거래가 없어요</h3><p>자동이체·수동 상환·중도상환이 일어나면 받은 금액을 수수료 → 연체이자 → 미납 이자 → 미납 원금 순으로 나눈 내역이 여기에 남아요.</p></div>
                  ) : (
                    <div className="table-scroll">
                      <table className="table table-compact contract-tx">
                        <caption>거래 내역 {transactions.data.length}건<span className="table-caption-note">변제충당 순서: 수수료 → 연체이자 → 미납 이자 → 미납 원금, 오래된 회차부터(ADR-010).</span></caption>
                        <thead><tr><th scope="col">영업일</th><th scope="col">종류</th><th scope="col" className="num">총액</th><th scope="col" className="num">수수료</th><th scope="col" className="num">연체이자</th><th scope="col" className="num">이자</th><th scope="col" className="num">원금</th><th scope="col">회차별 배분</th><th scope="col" className="num">계좌 잔액</th></tr></thead>
                        <tbody>
                          {transactions.data.map(t => (
                            <tr key={t.id}>
                              <td>{formatDate(t.businessDate)}</td>
                              <th scope="row">{TX_TYPE_LABEL[t.type] ?? t.type}</th>
                              <td className="num"><Money value={t.totalAmount} strong /></td>
                              <td className="num"><Money value={t.fee} /></td>
                              <td className="num"><Money value={t.overdueInterest} /></td>
                              <td className="num"><Money value={t.interest} /></td>
                              <td className="num"><Money value={t.principal} /></td>
                              <td className="contract-alloc">{t.allocations.length === 0 ? <span className="faint">{t.type.startsWith("PREPAYMENT") ? "잔액에서 직접 차감" : "—"}</span> : t.allocations.map(a => <span key={a.installmentNo}>{a.installmentNo}회차 이자 {won(a.interest)} · 원금 {won(a.principal)}</span>)}</td>
                              <td className="num"><Money value={t.settlementBalanceAfter} /></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ),
                },
                {
                  id: "timeline", label: "타임라인",
                  content: events.error ? <LoadError error={events.error} onRetry={events.reload} /> : !events.data ? <Loading message="타임라인을 불러오고 있어요" /> : (
                    <Timeline label="계약 이벤트" items={events.data.map<TimelineItem>(e => ({ id: e.id, date: e.businessDate, title: eventTitle(e), description: describeEvent(e), tone: eventTone(e) }))} />
                  ),
                },
                {
                  id: "provisions", label: "충당금",
                  content: provisions.error ? <LoadError error={provisions.error} onRetry={provisions.reload} /> : !provisions.data ? <Loading message="충당금을 불러오고 있어요" /> : provisions.data.length === 0 ? (
                    <div className="state-box is-empty"><h3>아직 월마감을 지나지 않았어요</h3><p>월말 일마감에서 잔액 × 분류별 적립률(정상 1% · 요주의 10% · 고정 20% · 회수의문 75% · 추정손실 100%)로 충당금을 쌓아요. 시간을 월말 너머로 진행해 봐요.</p></div>
                  ) : (
                    <table className="table table-compact">
                      <caption>월별 충당금 {provisions.data.length}건<span className="table-caption-note">충당금 = 잔여 원금 × 적립률(절사). 적립률은 교육용 가정값이다.</span></caption>
                      <thead><tr><th scope="col">기준월</th><th scope="col">분류</th><th scope="col" className="num">잔액</th><th scope="col" className="num">적립률</th><th scope="col" className="num">충당금</th></tr></thead>
                      <tbody>
                        {provisions.data.map(p => { const k = statusLabel(p.assetClass); return <tr key={p.baseMonth}><th scope="row">{p.baseMonth}</th><td><StatusChip label={ASSET_CLASS_LABEL[p.assetClass] ?? k.label} tone={k.tone} /></td><td className="num"><Money value={p.outstandingPrincipal} /></td><td className="num">{p.provisionRate}%</td><td className="num"><Money value={p.provisionAmount} /></td></tr>; })}
                      </tbody>
                    </table>
                  ),
                },
              ]}
            />
            <Disclosure data={c.disclosure} />
          </div>

          <aside aria-label="상환과 시간 진행" className="contract-side">
            {c.status !== "PAID_OFF" && (
              <ClockControl compact businessDate={s.businessDate} nextDueDate={s.nextDueDate} onAdvanced={reloadAll}
                extra={daysToDue !== null ? { label: `이 계약 다음 납입일까지(${daysToDue}일)`, request: { mode: "DAYS", days: daysToDue } } : null} />
            )}
            {c.status !== "PAID_OFF" && <RepayPanel contract={c} balance={s.settlementBalance} onDone={reloadAll} />}
            {c.status !== "PAID_OFF" && <PrepayPanel contract={c} balance={s.settlementBalance} onDone={reloadAll} />}
            <DepositForm balance={s.settlementBalance} suggested={c.amountDueNow > s.settlementBalance ? c.amountDueNow - s.settlementBalance : null} onDeposited={reloadAll} />
          </aside>
        </div>
        <nav className="next-actions" aria-label="다음 행동">
          <Link to="/sandbox">내 모의 여신 <Icon name="next" size={16} /></Link>
          <Link to="/sandbox/notifications">알림함 <Icon name="next" size={16} /></Link>
          <Link to="/learn/acceleration">개념 10 · 기한이익상실 <Icon name="next" size={16} /></Link>
        </nav>
      </main>
    </>
  );
}

/** 수동 상환: 미납·연체분을 변제충당 순서로 갚는다. 미납이 없으면 안내만. */
function RepayPanel({ contract: c, balance, onDone }: { contract: Contract; balance: number; onDone: () => void }) {
  const [amount, setAmount] = useState<number | null>(c.amountDueNow > 0 ? c.amountDueNow : null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (amount === null || amount <= 0) { setError("상환 금액을 넣어요."); return; }
    setBusy(true); setError(""); setDone("");
    try {
      const tx = await sandboxApi.repay(c.id, { amount });
      setDone(`${won(tx.totalAmount)}을 상환했어요. 연체이자 ${won(tx.overdueInterest)} · 이자 ${won(tx.interest)} · 원금 ${won(tx.principal)} 순으로 충당했어요.`);
      onDone();
    } catch (err) { setError(errorMessage(err)); } finally { setBusy(false); }
  };
  return (
    <form className="panel" onSubmit={submit} aria-labelledby="repay-title" noValidate>
      <h3 id="repay-title">수동 상환</h3>
      {c.amountDueNow <= 0 ? <p className="muted">지금은 갚을 미납분이 없어요. 자동이체가 없는 계약은 납입일 당일(영업일이 납입일일 때)에 여기서 직접 상환해요. 미리 갚으려면 아래 중도상환 견적을 받아요.</p> : (
        <>
          <p className="muted">지금 갚아야 할 금액 <Money value={c.amountDueNow} strong />{c.status === "DEFAULTED" ? " — 기한이익상실로 잔액 전체 + 미납 이자 + 연체이자를 한 번에 청구해요. 전액을 갚으면 완제돼요." : "."} 받은 금액은 연체이자 → 미납 이자 → 미납 원금 순으로, 오래된 회차부터 충당해요. 이보다 큰 금액을 넣어도 미납액까지만 빠져나가요.{balance < c.amountDueNow && ` 결제계좌 잔액이 ${won(c.amountDueNow - balance)} 부족하니 먼저 입금해요.`}</p>
          <MoneyInput label="상환 금액" value={amount} onChange={setAmount} required error={error || undefined} hint={`최대 ${won(c.amountDueNow)}`} />
          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? "상환하고 있어요…" : "상환하기"}</button>
            <button type="button" className="btn btn-secondary btn-small" disabled={busy} onClick={() => setAmount(c.amountDueNow)}>전액 넣기</button>
          </div>
        </>
      )}
      {done && <p className="form-done" role="status">{done}</p>}
      {c.amountDueNow <= 0 && error && <p className="form-error" role="alert">{error}</p>}
    </form>
  );
}

/**
 * 중도상환: 전액/일부 견적(GET) → 확인 → 실행(POST).
 * 연체·기한이익상실 중에는 일부 중도상환만 막힌다(서버 409 OVERDUE_FIRST). 전액은 연체이자를 포함해 견적·실행할 수 있다(business-rules §6).
 */
function PrepayPanel({ contract: c, balance, onDone }: { contract: Contract; balance: number; onDone: () => void }) {
  const inArrears = c.status === "OVERDUE" || c.status === "DEFAULTED";
  const [mode, setMode] = useState<"full" | "partial">("full");
  const [partial, setPartial] = useState<number | null>(null);
  const [quote, setQuote] = useState<PrepaymentQuote | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [done, setDone] = useState("");
  const getQuote = async (event: FormEvent) => {
    event.preventDefault();
    if (mode === "partial" && (partial === null || partial <= 0 || partial >= c.outstandingPrincipal)) { setError("일부 상환 원금은 1원 이상, 잔액 미만으로 넣어요. 전액이면 전액을 골라요."); return; }
    setBusy("quote"); setError(""); setConfirming(false); setDone("");
    try { setQuote(await sandboxApi.prepaymentQuote(c.id, mode === "partial" ? partial : null)); } catch (err) { setQuote(null); setError(errorMessage(err)); } finally { setBusy(null); }
  };
  const execute = async () => {
    if (!quote) return;
    setBusy("execute"); setError("");
    try {
      const tx = await sandboxApi.prepay(c.id, { principalAmount: quote.isFull ? null : quote.principalAmount });
      setDone(`${quote.isFull ? "전액" : "일부"} 중도상환 ${won(tx.totalAmount)}을 실행했어요.${quote.isFull ? " 계약이 완제됐어요." : ` 남은 회차는 월 ${won(quote.newMonthlyPayment ?? 0)}으로 재산정됐어요.`}`);
      setQuote(null); setConfirming(false);
      onDone();
    } catch (err) { setError(errorMessage(err)); } finally { setBusy(null); }
  };
  return (
    <section className="panel" aria-labelledby="prepay-title">
      <h3 id="prepay-title">중도상환</h3>
      <p className="muted">잔액 <Money value={c.outstandingPrincipal} /> · 수수료율 {pct(c.prepaymentFeeRate)} · 수수료 = 갚는 원금 × 수수료율 × 잔존일수 ÷ 대출일수. {inArrears && "연체 중에는 전액만 가능하고 연체이자가 더해져요. 일부 중도상환은 먼저 연체분을 정리한 뒤에 해요."}</p>
      <form onSubmit={getQuote} noValidate className="prepay-form">
        <fieldset className="prepay-mode">
          <legend className="field-label">범위</legend>
          <label className="field-check"><input type="radio" name="prepay-mode" checked={mode === "full"} onChange={() => setMode("full")} /><span>전액 — 잔액 전부 + 경과이자 + 수수료{inArrears && " + 연체이자"}</span></label>
          <label className="field-check"><input type="radio" name="prepay-mode" checked={mode === "partial"} disabled={inArrears} onChange={() => setMode("partial")} /><span>일부 — 지정 원금, 남은 회차 재산정{inArrears && " (연체 정리 뒤에 가능)"}</span></label>
        </fieldset>
        {mode === "partial" && <MoneyInput label="일부 상환 원금" value={partial} onChange={setPartial} required hint={`잔액 ${won(c.outstandingPrincipal)} 미만`} />}
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="form-actions"><button type="submit" className="btn btn-secondary" disabled={busy !== null || (inArrears && mode === "partial")}>{busy === "quote" ? "견적을 받고 있어요…" : "견적 받기"}</button></div>
      </form>
      {quote && (
        <div className="prepay-quote" aria-live="polite">
          <table className="table table-compact">
            <caption>{quote.isFull ? "전액" : "일부"} 중도상환 견적 · {formatDate(quote.asOf)}</caption>
            <tbody>
              <tr><th scope="row">갚는 원금</th><td className="num"><Money value={quote.principalAmount} /></td></tr>
              <tr><th scope="row">경과이자 {quote.accruedDays}일</th><td className="num"><Money value={quote.accruedInterest} /></td></tr>
              {quote.overdueInterest > 0 && <tr><th scope="row">연체이자</th><td className="num"><Money value={quote.overdueInterest} /></td></tr>}
              <tr><th scope="row">수수료{quote.feeWaived ? "(3년 경과 면제)" : ` 잔존 ${quote.remainingDays}/${quote.loanDays}일`}</th><td className="num"><Money value={quote.fee} /></td></tr>
              {!quote.isFull && quote.newMonthlyPayment !== null && <tr><th scope="row">재산정 월 납입액</th><td className="num"><Money value={quote.newMonthlyPayment} /></td></tr>}
            </tbody>
            <tfoot><tr><th scope="row">총액</th><td className="num"><Money value={quote.totalDue} strong /></td></tr></tfoot>
          </table>
          {quote.totalDue > balance && <p className="form-error" role="alert">결제계좌 잔액이 {won(quote.totalDue - balance)} 부족해요. 입금 후 실행해요.</p>}
          {!confirming ? (
            <div className="form-actions"><button type="button" className="btn btn-primary" disabled={busy !== null} onClick={() => setConfirming(true)}>이 조건으로 중도상환 실행</button></div>
          ) : (
            <div className="prepay-confirm" role="group" aria-label="중도상환 실행 확인">
              <p>{won(quote.totalDue)}을 결제계좌에서 빼고 {quote.isFull ? "계약을 완제" : "남은 회차를 재산정"}해요. 되돌릴 수 없어요.</p>
              <div className="btn-row">
                <button type="button" className="btn btn-primary" disabled={busy !== null || quote.totalDue > balance} onClick={execute}>{busy === "execute" ? "실행하고 있어요…" : "실행 확인"}</button>
                <button type="button" className="btn btn-secondary" disabled={busy !== null} onClick={() => setConfirming(false)}>취소</button>
              </div>
            </div>
          )}
          <Disclosure data={quote.disclosure} />
        </div>
      )}
      {done && <p className="form-done" role="status">{done}</p>}
    </section>
  );
}
