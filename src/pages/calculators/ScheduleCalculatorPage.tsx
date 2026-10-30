import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { calculatorsApi } from "../../api/calculators";
import type { RepaymentMethod, ScheduleRequest, ScheduleResponse } from "../../api/types";
import Disclosure from "../../components/Disclosure";
import Icon from "../../components/Icon";
import LoadError from "../../components/LoadError";
import Loading from "../../components/Loading";
import Money from "../../components/Money";
import MoneyInput from "../../components/MoneyInput";
import RateInput from "../../components/RateInput";
import SubPageHeader from "../../components/SubPageHeader";
import { formatDate } from "../../lib/format";
import { DateField, NumberField, SelectField } from "./parts/fields";
import { METHOD_DESCRIPTION, METHOD_LABEL, METHODS, PAYMENT_DAY_OPTIONS } from "./parts/labels";
import ScheduleTable from "./parts/ScheduleTable";
import Tabs from "./parts/Tabs";

/** 기본값은 계산 예시 1(10,000,000 · 12회 · 12.00% · 2026-01-15 · 15일). 입력은 URL 쿼리로 공유한다. */
const DEFAULTS: ScheduleRequest = { principal: 10_000_000, termMonths: 12, annualRate: 12, startDate: "2026-01-15", paymentDay: 15 };

function fromQuery(params: URLSearchParams): ScheduleRequest | null {
  if (!params.has("principal")) return null;
  const n = (key: string, fallback: number) => { const v = Number(params.get(key)); return Number.isFinite(v) && params.has(key) ? v : fallback; };
  return { principal: n("principal", DEFAULTS.principal), termMonths: n("term", DEFAULTS.termMonths), annualRate: n("rate", DEFAULTS.annualRate), startDate: params.get("start") ?? DEFAULTS.startDate, paymentDay: n("day", DEFAULTS.paymentDay) };
}
function toQuery(req: ScheduleRequest): Record<string, string> {
  return { principal: String(req.principal), term: String(req.termMonths), rate: String(req.annualRate), start: req.startDate, day: String(req.paymentDay) };
}

/**
 * 상환 스케줄 계산기(S-06): 폼 → 세 방식 요약 비교표 → 방식 탭별 회차표(원금/이자 비중 막대, 이연 표시, 모바일 4열) → Disclosure.
 * 계산은 POST /calculators/schedule 한 번으로 세 방식을 모두 받는다. 제출하면 URL 쿼리에 입력을 남겨 주소로 공유할 수 있다.
 */
export default function ScheduleCalculatorPage() {
  const [params, setParams] = useSearchParams();
  const initial = fromQuery(params) ?? DEFAULTS;
  const [principal, setPrincipal] = useState<number | null>(initial.principal);
  const [termMonths, setTermMonths] = useState<number | null>(initial.termMonths);
  const [annualRate, setAnnualRate] = useState<number | null>(initial.annualRate);
  const [startDate, setStartDate] = useState(initial.startDate);
  const [paymentDay, setPaymentDay] = useState(initial.paymentDay);
  const [request, setRequest] = useState<ScheduleRequest | null>(null);
  const [result, setResult] = useState<ScheduleResponse | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<RepaymentMethod>("EQUAL_PAYMENT");
  const [fieldError, setFieldError] = useState<Partial<Record<keyof ScheduleRequest, string>>>({});

  const run = useCallback(async (req: ScheduleRequest) => {
    setRequest(req); setLoading(true); setError(null);
    try { setResult(await calculatorsApi.schedule(req)); } catch (err) { setError(err); } finally { setLoading(false); }
  }, []);
  // 주소에 입력이 있으면(공유 링크) 처음 한 번 바로 계산한다.
  const initialRequest = useRef(fromQuery(params));
  useEffect(() => { if (initialRequest.current) run(initialRequest.current); }, [run]);

  const validate = (): ScheduleRequest | null => {
    const errors: typeof fieldError = {};
    if (principal === null || principal < 1_000_000 || principal > 500_000_000) errors.principal = "원금은 1,000,000원 이상 500,000,000원 이하로 넣어요.";
    if (termMonths === null || termMonths < 1 || termMonths > 120 || !Number.isInteger(termMonths)) errors.termMonths = "기간은 1~120회 사이의 정수예요.";
    if (annualRate === null || annualRate < 0 || annualRate > 20) errors.annualRate = "연이율은 0~20% 사이예요(최고금리 20%).";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate)) errors.startDate = "실행일을 날짜로 넣어요.";
    setFieldError(errors);
    if (Object.keys(errors).length) return null;
    return { principal: principal!, termMonths: termMonths!, annualRate: annualRate!, startDate, paymentDay };
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const req = validate();
    if (!req) return;
    setParams(toQuery(req), { replace: true });
    run(req);
  };

  const summaryRows = result?.results ?? [];

  return (
    <>
      <SubPageHeader
        section="calculators"
        current="/calculators/schedule"
        title="상환 스케줄 계산기"
        description="원금·기간·금리·실행일·납입일을 넣으면 원리금균등·원금균등·만기일시 세 방식의 월 납입액과 총이자를 한 표에서 비교하고, 방식마다 회차표를 보여 줘요. 약정일이 토·일이면 다음 월요일로 이연한 실제 납입일을 같이 적어요."
        meta={request ? <>이 주소를 복사하면 같은 조건이 열려요 · 규칙 세트 v1</> : <>기본값은 계산 예시 1(1,000만 원 · 12회 · 연 12.00%)이에요</>}
      />
      <main className="page-main calc">
        <div className="page-grid">
          <div className="calc-main">
            <form className="calc-form panel" onSubmit={submit} aria-labelledby="calc-form-title" noValidate>
              <h2 id="calc-form-title">대출 조건</h2>
              <div className="calc-fields">
                <MoneyInput label="원금" value={principal} onChange={setPrincipal} required error={fieldError.principal} hint="1,000,000~500,000,000원" />
                <NumberField label="기간" value={termMonths} onChange={setTermMonths} min={1} max={120} unit="회" error={fieldError.termMonths} hint="1~120회(월 단위)" />
                <RateInput label="연이율" value={annualRate} onChange={setAnnualRate} required error={fieldError.annualRate} hint="약정이율" />
                <DateField label="실행일" value={startDate} onChange={setStartDate} error={fieldError.startDate} hint="1회차 약정일은 실행일 다음 달의 납입일" />
                <SelectField label="납입일" value={paymentDay} options={PAYMENT_DAY_OPTIONS} onChange={setPaymentDay} hint="1~28일. 토·일이면 다음 월요일로 이연" />
              </div>
              <div className="form-actions">
                <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? "회차표를 계산하고 있어요…" : "세 방식 비교하기"}</button>
                {request && <span className="faint">실행일 {formatDate(request.startDate)} · 매월 {request.paymentDay}일 납입</span>}
              </div>
            </form>

            <section className="calc-results" aria-labelledby="calc-results-title" aria-live="polite">
              <h2 id="calc-results-title" className="sr-only">계산 결과</h2>
              {!!error && <LoadError error={error} onRetry={() => request && run(request)} />}
              {!error && !result && (loading ? <Loading message="회차표를 계산하고 있어요" minHeight={200} /> : (
                <div className="state-box is-empty"><h3>아직 계산하지 않았어요</h3><p>위 조건으로 "세 방식 비교하기"를 누르면 요약 비교표와 회차표가 여기에 나와요.</p></div>
              ))}
              {result && (
                <>
                  <div className="table-scroll"><table className="table calc-compare">
                    <caption>세 방식 요약 비교<span className="table-caption-note">같은 원금·기간·금리에서 상환 방식만 바꿨을 때. 총이자가 가장 적은 방식이 원금균등이고 월 부담이 가장 작은 방식이 만기일시이다.</span></caption>
                    <thead>
                      <tr><th scope="col">항목</th>{summaryRows.map(r => <th key={r.method} scope="col" className="num">{METHOD_LABEL[r.method]}</th>)}</tr>
                    </thead>
                    <tbody>
                      <tr><th scope="row">월 납입액</th>{summaryRows.map(r => <td key={r.method} className="num">{r.monthlyPayment !== null ? <Money value={r.monthlyPayment} strong /> : <span className="muted">회차마다 다름</span>}</td>)}</tr>
                      <tr><th scope="row">첫 회 납입</th>{summaryRows.map(r => <td key={r.method} className="num"><Money value={r.firstPayment} /></td>)}</tr>
                      <tr><th scope="row">마지막 회 납입</th>{summaryRows.map(r => <td key={r.method} className="num"><Money value={r.lastPayment} /></td>)}</tr>
                      <tr><th scope="row">총이자</th>{summaryRows.map(r => <td key={r.method} className="num"><Money value={r.totalInterest} strong /></td>)}</tr>
                      <tr><th scope="row">총납입</th>{summaryRows.map(r => <td key={r.method} className="num"><Money value={r.totalPayment} /></td>)}</tr>
                    </tbody>
                  </table></div>

                  <Tabs
                    label="상환 방식별 회차표"
                    current={tab}
                    onChange={id => setTab(id as RepaymentMethod)}
                    items={summaryRows.map(r => ({
                      id: r.method,
                      label: METHOD_LABEL[r.method],
                      content: (
                        <>
                          <p className="calc-method-note">{METHOD_DESCRIPTION[r.method]}</p>
                          <ScheduleTable rows={r.rows} caption={`${METHOD_LABEL[r.method]} 회차표 · ${r.rows.length}회`} />
                        </>
                      ),
                    }))}
                  />
                  <Disclosure data={result.disclosure} />
                </>
              )}
            </section>
          </div>

          <aside aria-label="읽는 법">
            <div className="panel">
              <h3>표 읽는 법</h3>
              <dl className="def-list calc-howto">
                <div><dt>원금 비중 막대</dt><dd>납입액 중 원금이 차지하는 비율이다. 원리금균등은 회차가 지날수록 막대가 길어진다.</dd></div>
                <div><dt>이연</dt><dd>약정일이 토·일이면 실제 납입일을 다음 월요일로 옮긴다. 이연으로 늘어난 일수에 이자를 더 붙이지 않는다(교육용 단순화).</dd></div>
                <div><dt>마지막 회차</dt><dd>원금은 남은 잔액 전부라 납입액이 몇 원 다를 수 있다. 절사 누적 보정이며 정상이다.</dd></div>
              </dl>
            </div>
            <div className="panel panel-soft">
              <h3>이어서</h3>
              <ul className="calc-links">
                {METHODS.map(m => <li key={m}><Link to={`/glossary/${m === "EQUAL_PAYMENT" ? "equal-payment" : m === "EQUAL_PRINCIPAL" ? "equal-principal" : "bullet"}`}>{METHOD_LABEL[m]} 용어 보기</Link></li>)}
                <li><Link to="/learn/repayment-methods">개념 6 · 상환 방식 3가지와 총이자</Link></li>
              </ul>
            </div>
          </aside>
        </div>
        <nav className="next-actions" aria-label="다음 행동">
          <Link to="/calculators/screening">이 조건으로 심사 시뮬레이터 <Icon name="next" size={16} /></Link>
          <Link to="/calculators/prepayment">중도상환 견적 <Icon name="next" size={16} /></Link>
          <Link to="/sandbox/apply">모의 여신에서 실제로 신청해 보기 <Icon name="next" size={16} /></Link>
        </nav>
      </main>
    </>
  );
}
