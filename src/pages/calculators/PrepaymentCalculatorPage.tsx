import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { calculatorsApi } from "../../api/calculators";
import type { PrepaymentCalcRequest, PrepaymentQuote, RepaymentMethod, ScheduleResponse } from "../../api/types";
import Disclosure from "../../components/Disclosure";
import Icon from "../../components/Icon";
import LoadError from "../../components/LoadError";
import Loading from "../../components/Loading";
import Money from "../../components/Money";
import MoneyInput from "../../components/MoneyInput";
import RateInput from "../../components/RateInput";
import SubPageHeader from "../../components/SubPageHeader";
import { formatDate } from "../../lib/format";
import FeeTrendChart, { type FeePoint } from "../../components/charts/FeeTrendChart";
import { DateField, NumberField, SelectField } from "./parts/fields";
import { METHOD_LABEL, METHODS, PAYMENT_DAY_OPTIONS, pct } from "./parts/labels";
import ScheduleTable from "./parts/ScheduleTable";

/** 기본값은 계산 예시 5(예시 1 조건 · 실행 2026-01-15 · 상환 2026-07-25 · 수수료율 0.70%). 일부 상환 3,000,000이면 예시 5-2. */
const DEFAULTS: PrepaymentCalcRequest = { principal: 10_000_000, termMonths: 12, annualRate: 12, repaymentMethod: "EQUAL_PAYMENT", startDate: "2026-01-15", paymentDay: 15, prepaymentDate: "2026-07-25", feeRate: 0.7 };

const daysBetween = (a: string, b: string) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);

/**
 * 잔존기간별 수수료 시점 목록. 같은 조건의 회차표(/calculators/schedule)에서 k회차 납입 직후의 잔액과 잔존일수를 읽어
 * 견적 응답의 수수료율·대출일수로 floor(잔액 × 수수료율 × 잔존일수 ÷ 대출일수)를 계산한다(business-rules §6과 같은 식).
 */
function feeSeries(schedule: ScheduleResponse, quote: PrepaymentQuote, req: PrepaymentCalcRequest): FeePoint[] {
  const rows = schedule.results[0]?.rows ?? [];
  if (!rows.length) return [];
  const maturity = rows[rows.length - 1].dueDate;
  const loanDays = quote.loanDays || daysBetween(req.startDate, maturity);
  const points: FeePoint[] = [{ installmentNo: 0, date: req.startDate, balance: req.principal, remainingDays: loanDays, fee: Math.floor(req.principal * (quote.feeRate / 100) * loanDays / loanDays + 1e-7) }];
  for (const row of rows) {
    const remainingDays = daysBetween(row.dueDate, maturity);
    const waived = daysBetween(req.startDate, row.dueDate) >= 3 * 365;
    points.push({ installmentNo: row.installmentNo, date: row.dueDate, balance: row.balanceAfter, remainingDays, fee: waived ? 0 : Math.floor(row.balanceAfter * (quote.feeRate / 100) * remainingDays / loanDays + 1e-7) });
  }
  return points;
}

/**
 * 중도상환 견적(S-08): 폼 → 견적 표(잔액·경과이자·수수료·총액) → 잔존기간별 수수료 추이(SVG) → 일부 상환이면 재산정 회차표 → Disclosure.
 * 견적은 POST /calculators/prepayment, 추이는 같은 조건의 회차표로 시점별 수수료를 계산한다.
 */
export default function PrepaymentCalculatorPage() {
  const [principal, setPrincipal] = useState<number | null>(DEFAULTS.principal);
  const [termMonths, setTermMonths] = useState<number | null>(DEFAULTS.termMonths);
  const [annualRate, setAnnualRate] = useState<number | null>(DEFAULTS.annualRate);
  const [method, setMethod] = useState<RepaymentMethod>(DEFAULTS.repaymentMethod);
  const [startDate, setStartDate] = useState(DEFAULTS.startDate);
  const [paymentDay, setPaymentDay] = useState(DEFAULTS.paymentDay);
  const [prepaymentDate, setPrepaymentDate] = useState(DEFAULTS.prepaymentDate);
  const [feeRate, setFeeRate] = useState<number | null>(DEFAULTS.feeRate);
  const [partial, setPartial] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState<PrepaymentCalcRequest | null>(null);
  const [quote, setQuote] = useState<PrepaymentQuote | null>(null);
  const [series, setSeries] = useState<FeePoint[]>([]);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(false);
  const [fieldError, setFieldError] = useState<Record<string, string>>({});

  const run = async (req: PrepaymentCalcRequest) => {
    setSubmitted(req); setLoading(true); setError(null);
    try {
      const [q, s] = await Promise.all([
        calculatorsApi.prepayment(req),
        calculatorsApi.schedule({ principal: req.principal, termMonths: req.termMonths, annualRate: req.annualRate, startDate: req.startDate, paymentDay: req.paymentDay, methods: [req.repaymentMethod] }),
      ]);
      setQuote(q); setSeries(feeSeries(s, q, req));
    } catch (err) { setError(err); } finally { setLoading(false); }
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const errors: Record<string, string> = {};
    if (principal === null || principal < 1_000_000) errors.principal = "원금은 1,000,000원 이상이에요.";
    if (termMonths === null || termMonths < 1 || termMonths > 120) errors.termMonths = "기간은 1~120회예요.";
    if (annualRate === null || annualRate < 0 || annualRate > 20) errors.annualRate = "연이율은 0~20%예요.";
    if (feeRate === null || feeRate < 0 || feeRate > 5) errors.feeRate = "수수료율은 0~5%예요.";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate)) errors.startDate = "실행일을 날짜로 넣어요.";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(prepaymentDate)) errors.prepaymentDate = "상환일을 날짜로 넣어요.";
    else if (prepaymentDate < startDate) errors.prepaymentDate = "상환일은 실행일 이후여야 해요.";
    if (partial !== null && principal !== null && partial >= principal) errors.partial = "일부 상환 원금은 원금보다 작아야 해요. 전액이면 비워 둬요.";
    setFieldError(errors);
    if (Object.keys(errors).length) return;
    run({ principal: principal!, termMonths: termMonths!, annualRate: annualRate!, repaymentMethod: method, startDate, paymentDay, prepaymentDate, feeRate: feeRate!, principalAmount: partial });
  };

  const paidCount = submitted ? series.filter(p => p.installmentNo > 0 && p.date <= submitted.prepaymentDate).length : 0;
  const current = quote ? { installmentNo: paidCount, fee: quote.isFull ? quote.fee : Math.floor(quote.outstandingPrincipal * (quote.feeRate / 100) * quote.remainingDays / (quote.loanDays || 1) + 1e-7) } : null;

  return (
    <>
      <SubPageHeader
        section="calculators"
        current="/calculators/prepayment"
        title="중도상환 견적"
        description="대출 조건과 상환일을 넣으면 그날 갚아야 할 잔액·경과이자·중도상환수수료·총액을 계산해요. 잔존기간이 줄수록 수수료가 어떻게 작아지는지 추이로 보여 주고, 일부만 갚으면 남은 회차를 재산정한 회차표를 같이 보여 줘요."
        meta={<>기본값은 계산 예시 5(예시 1 조건에서 6회차 납입 뒤 2026-07-25 전액 상환) · 일부 3,000,000원이면 예시 5-2</>}
      />
      <main className="page-main calc">
        <div className="page-grid">
          <div className="calc-main">
            <form className="calc-form panel" onSubmit={submit} aria-labelledby="prepay-form-title" noValidate>
              <h2 id="prepay-form-title">대출 조건과 상환일</h2>
              <div className="calc-fields">
                <MoneyInput label="원금" value={principal} onChange={setPrincipal} required error={fieldError.principal} />
                <NumberField label="기간" value={termMonths} onChange={setTermMonths} min={1} max={120} unit="회" error={fieldError.termMonths} />
                <RateInput label="연이율" value={annualRate} onChange={setAnnualRate} required error={fieldError.annualRate} />
                <SelectField label="상환 방식" value={method} options={METHODS.map(m => ({ value: m, label: METHOD_LABEL[m] }))} onChange={setMethod} />
                <DateField label="실행일" value={startDate} onChange={setStartDate} error={fieldError.startDate} />
                <SelectField label="납입일" value={paymentDay} options={PAYMENT_DAY_OPTIONS} onChange={setPaymentDay} />
                <DateField label="상환일" value={prepaymentDate} onChange={setPrepaymentDate} error={fieldError.prepaymentDate} hint="상환일까지의 회차는 약정일에 모두 냈다고 봐요" />
                <RateInput label="수수료율" value={feeRate} onChange={setFeeRate} required max={5} error={fieldError.feeRate} hint="신용대출 0.70%, 자동차 할부 1.50%" />
                <MoneyInput label="일부 상환 원금" value={partial} onChange={setPartial} error={fieldError.partial} hint="비우면 전액 상환. 넣으면 남은 회차를 재산정해요" />
              </div>
              <div className="form-actions">
                <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? "견적을 계산하고 있어요…" : "견적 받기"}</button>
              </div>
            </form>

            <section className="calc-results" aria-live="polite">
              {!!error && <LoadError error={error} onRetry={() => submitted && run(submitted)} />}
              {!error && !quote && (loading ? <Loading message="견적을 계산하고 있어요" minHeight={200} /> : (
                <div className="state-box is-empty"><h3>아직 견적을 받지 않았어요</h3><p>위 조건으로 "견적 받기"를 누르면 상환일 기준 총액과 수수료 추이가 여기에 나와요.</p></div>
              ))}
              {quote && submitted && (
                <div className="stack calc-stack">
                  <table className="table calc-quote">
                    <caption>{quote.isFull ? "전액" : "일부"} 중도상환 견적 · 상환일 {formatDate(quote.asOf)}<span className="table-caption-note">경과이자와 수수료는 일할(연 365일)로 계산하고 원 미만은 절사한다. 수수료는 대출 실행 3년 뒤부터 면제된다.</span></caption>
                    <thead><tr><th scope="col">항목</th><th scope="col">계산 근거</th><th scope="col" className="num">금액</th></tr></thead>
                    <tbody>
                      <tr><th scope="row">상환 시점 잔액</th><td>{paidCount > 0 ? `${paidCount}회차 납입 후 잔액` : "실행 직후(납입 전) 잔액"}</td><td className="num"><Money value={quote.outstandingPrincipal} /></td></tr>
                      <tr><th scope="row">갚는 원금</th><td>{quote.isFull ? "잔액 전부" : `일부 상환 원금(잔액의 ${Math.round((quote.principalAmount / quote.outstandingPrincipal) * 100)}%)`}</td><td className="num"><Money value={quote.principalAmount} /></td></tr>
                      <tr><th scope="row">경과이자</th><td>잔액 × {pct(submitted.annualRate)} × {quote.accruedDays}일 ÷ 365 — 직전 약정일부터 상환일까지</td><td className="num"><Money value={quote.accruedInterest} /></td></tr>
                      {quote.overdueInterest > 0 && <tr><th scope="row">연체이자</th><td>미납 연체이자</td><td className="num"><Money value={quote.overdueInterest} /></td></tr>}
                      <tr><th scope="row">중도상환수수료</th><td>{quote.feeWaived ? "실행 3년 경과로 면제" : <>갚는 원금 × {pct(quote.feeRate)} × 잔존 {quote.remainingDays}일 ÷ 대출기간 {quote.loanDays}일</>}</td><td className="num"><Money value={quote.fee} /></td></tr>
                    </tbody>
                    <tfoot><tr><th scope="row">상환일에 내는 총액</th><td>원금 + 경과이자 + 수수료</td><td className="num"><Money value={quote.totalDue} strong /></td></tr></tfoot>
                  </table>
                  {!quote.isFull && (
                    <dl className="def-list calc-partial">
                      <div><dt>상환 후 잔액</dt><dd><Money value={quote.outstandingPrincipal - quote.principalAmount} /></dd></div>
                      <div><dt>남은 회차</dt><dd>{quote.remainingSchedule.length}회 · 기간은 그대로, 납입액만 재산정</dd></div>
                      {quote.newMonthlyPayment !== null && <div><dt>재산정 월 납입액</dt><dd><Money value={quote.newMonthlyPayment} strong /></dd></div>}
                    </dl>
                  )}
                  {series.length > 1 && <FeeTrendChart points={series} current={current} feeRate={quote.feeRate} />}
                  {!quote.isFull && quote.remainingSchedule.length > 0 && (
                    <ScheduleTable rows={quote.remainingSchedule} caption={`일부 상환 뒤 재산정 회차표 · ${quote.remainingSchedule.length}회`} captionNote="재산정 회차의 이자는 상환일이 아닌 다음 약정일 기준 월 이율 × 잔액이다(경과이자는 이미 정산)." recalculatedFrom={quote.remainingSchedule[0].installmentNo} />
                  )}
                  <Disclosure data={quote.disclosure} />
                </div>
              )}
            </section>
          </div>

          <aside aria-label="계산식 안내">
            <div className="panel">
              <h3>수수료는 왜 줄어드나</h3>
              <dl className="def-list calc-howto">
                <div><dt>계산식</dt><dd>갚는 원금 × 수수료율 × 잔존일수 ÷ 대출기간 일수, 원 미만 절사.</dd></div>
                <div><dt>두 번 줄어든다</dt><dd>회차가 지나면 잔액이 줄고 잔존일수도 줄어, 수수료는 선처럼 꾸준히 내려간다.</dd></div>
                <div><dt>면제</dt><dd>실행일부터 3년이 지나면 수수료를 받지 않는다(교육용 가정값).</dd></div>
                <div><dt>연체 중이면</dt><dd>먼저 연체분을 정리해야 중도상환할 수 있다(샌드박스에서 OVERDUE_FIRST).</dd></div>
              </dl>
            </div>
            <div className="panel panel-soft">
              <h3>이어서</h3>
              <ul className="calc-links">
                <li><Link to="/learn/prepayment-and-fee">개념 12 · 중도상환과 수수료</Link></li>
                <li><Link to="/calculators/schedule">같은 조건의 회차표 보기</Link></li>
              </ul>
            </div>
          </aside>
        </div>
        <nav className="next-actions" aria-label="다음 행동">
          <Link to="/sandbox">내 모의 여신에서 실제 계약으로 견적 받기 <Icon name="next" size={16} /></Link>
          <Link to="/calculators/screening">심사 시뮬레이터 <Icon name="next" size={16} /></Link>
        </nav>
      </main>
    </>
  );
}
