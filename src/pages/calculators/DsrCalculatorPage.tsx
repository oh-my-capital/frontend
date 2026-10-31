import { useRef, useState, type CSSProperties, type FormEvent } from "react";
import { Link } from "react-router-dom";
import type { RepaymentMethod } from "../../api/types";
import { DSR_MAX_DEBTS_DEFAULT, refinanceApi, type DsrRequest, type DsrResult } from "../../api/refinance";
import Disclosure from "../../components/Disclosure";
import EmptyState from "../../components/EmptyState";
import Icon from "../../components/Icon";
import LoadError from "../../components/LoadError";
import Loading from "../../components/Loading";
import Money from "../../components/Money";
import MoneyInput from "../../components/MoneyInput";
import RateInput from "../../components/RateInput";
import StatusChip from "../../components/StatusChip";
import SubPageHeader from "../../components/SubPageHeader";
import { formatNumber } from "../../lib/format";
import DsrDebtEditor, { type DebtDraft } from "./parts/DsrDebtEditor";
import DsrGauge from "./parts/DsrGauge";
import { DsrDebtTable, DsrLimitTable } from "./parts/DsrTables";
import { NumberField, SelectField } from "./parts/fields";
import { METHOD_LABEL, METHODS, pct } from "./parts/labels";
import "../../styles/refinance.css";

/** 기본값은 계산 예시 15(연소득 4,800만 원 · 기존 3건 · 새 대출 연 9.90% · 36회 · 원리금균등). */
const DEFAULT_DEBTS: Omit<DebtDraft, "key">[] = [
  { type: "CREDIT_LOAN", balance: 15_000_000, annualRate: 8.5, remainingMonths: 36, repaymentMethod: "EQUAL_PAYMENT" },
  { type: "AUTO_LOAN", balance: 12_000_000, annualRate: 5.5, remainingMonths: 48, repaymentMethod: "EQUAL_PRINCIPAL" },
  { type: "CREDIT_LOAN", balance: 10_000_000, annualRate: 7, remainingMonths: 12, repaymentMethod: "BULLET" },
];
const methodOptions = METHODS.map(m => ({ value: m, label: METHOD_LABEL[m] }));

/** 결과 한 줄 요약(aria-live 영역 맨 위). */
function dsrSentence(r: DsrResult): string {
  const head = r.debts.length
    ? `기존 대출 ${r.debts.length}건의 연 원리금 합 ${formatNumber(r.totalAnnualDebtService)}원은 연소득의 ${pct(r.dsrRatio)}예요.`
    : "기존 대출이 없어 합산 DSR은 0%예요.";
  if (r.exceeded) return `${head} 상한 ${pct(r.dsrLimit)}를 넘어서 더 빌릴 수 있는 금액이 없어요. 기존 대출을 줄이거나 소득이 늘어야 해요.`;
  const nl = r.newLoan;
  return `${head} 상한 ${pct(r.dsrLimit)}까지 연 ${formatNumber(r.remainingAnnualRoom)}원(월 ${formatNumber(r.monthlyRoom)}원)이 남아, 연 ${pct(nl.annualRate)} · ${nl.termMonths}회 · ${METHOD_LABEL[nl.repaymentMethod]}이면 ${formatNumber(r.additionalLimit)}원을 더 빌릴 수 있어요.`;
}

/**
 * DSR 계산기(S-171, FR-34): 연소득 + 기존 대출 행 추가/삭제(최대 10건) + 새 대출 조건 → 판정 + 지표 줄 →
 * 건별 연 원리금 표 → DSR 게이지(상한선) → 방식별 추가 한도 표 → Disclosure.
 * 계산은 POST /calculators/dsr 한 번. 연 원리금 정의·만기일시 환산·역산은 business-rules WP17 절.
 */
export default function DsrCalculatorPage() {
  const nextKey = useRef(DEFAULT_DEBTS.length);
  const [income, setIncome] = useState<number | null>(48_000_000);
  const [debts, setDebts] = useState<DebtDraft[]>(DEFAULT_DEBTS.map((d, i) => ({ ...d, key: i })));
  const [newRate, setNewRate] = useState<number | null>(9.9);
  const [term, setTerm] = useState<number | null>(36);
  const [newMethod, setNewMethod] = useState<RepaymentMethod>("EQUAL_PAYMENT");
  const [submitted, setSubmitted] = useState<DsrRequest | null>(null);
  const [result, setResult] = useState<DsrResult | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(false);
  const [fieldError, setFieldError] = useState<Record<string, string>>({});
  const maxDebts = result?.maxDebts ?? DSR_MAX_DEBTS_DEFAULT;

  const run = async (req: DsrRequest) => {
    setSubmitted(req); setLoading(true); setError(null);
    try { setResult(await refinanceApi.dsr(req)); } catch (err) { setError(err); } finally { setLoading(false); }
  };

  const changeDebt = (key: number, patch: Partial<DebtDraft>) => setDebts(list => list.map(d => (d.key === key ? { ...d, ...patch } : d)));
  const addDebt = () => setDebts(list => (list.length >= maxDebts ? list : [...list, { key: nextKey.current++, type: "CREDIT_LOAN", balance: null, annualRate: null, remainingMonths: null, repaymentMethod: "EQUAL_PAYMENT" }]));
  const removeDebt = (key: number) => setDebts(list => list.filter(d => d.key !== key));

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const errors: Record<string, string> = {};
    if (income === null || income < 1 || income > 10_000_000_000) errors.income = "연소득은 1원 이상 100억 원 이하로 넣어요.";
    for (const d of debts) {
      if (d.balance === null || d.balance < 1 || d.balance > 10_000_000_000) errors[`${d.key}.balance`] = "잔액은 1원 이상으로 넣어요.";
      if (d.annualRate === null || d.annualRate < 0 || d.annualRate > 20) errors[`${d.key}.annualRate`] = "연이율은 0~20%예요.";
      if (d.remainingMonths === null || !Number.isInteger(d.remainingMonths) || d.remainingMonths < 1 || d.remainingMonths > 480) errors[`${d.key}.remainingMonths`] = "잔존 개월은 1~480 사이의 정수예요.";
    }
    if (debts.length > maxDebts) errors.debts = `기존 대출은 최대 ${maxDebts}건까지예요.`;
    if (newRate === null || newRate < 0 || newRate > 20) errors.newRate = "연이율은 0~20%예요(최고금리 20%).";
    if (term === null || !Number.isInteger(term) || term < 1 || term > 120) errors.term = "기간은 1~120회 사이의 정수예요.";
    setFieldError(errors);
    if (Object.keys(errors).length) return;
    run({
      annualIncome: income!,
      debts: debts.map(d => ({ type: d.type, balance: d.balance!, annualRate: d.annualRate!, remainingMonths: d.remainingMonths!, repaymentMethod: d.repaymentMethod })),
      newLoan: { annualRate: newRate!, termMonths: term!, repaymentMethod: newMethod },
    });
  };

  const requested = result?.limits.find(l => l.requested) ?? null;

  return (
    <>
      <SubPageHeader
        section="calculators"
        current="/calculators/dsr"
        title="DSR 계산기"
        description="연소득과 지금 갚고 있는 대출을 여러 건 넣으면 건별 연 원리금과 합산 DSR, 규칙 세트 상한까지 남은 연 원리금, 새 대출 조건으로 더 빌릴 수 있는 금액을 계산해요."
        meta={<>기본값은 계산 예시 15(연소득 4,800만 원 · 기존 3건 · 새 대출 연 9.90% · 36회) · 규칙 세트의 DSR 상한을 써요</>}
      />
      <main className="page-main calc dsr">
        <div className="page-grid">
          <div className="calc-main">
            <form className="calc-form panel" onSubmit={submit} aria-labelledby="dsr-form-title" noValidate>
              <h2 id="dsr-form-title">소득과 대출</h2>
              <div className="calc-fields">
                <MoneyInput label="연소득" value={income} onChange={setIncome} required error={fieldError.income} hint="세전 연 소득" />
              </div>
              <DsrDebtEditor debts={debts} max={maxDebts} errors={fieldError} onChange={changeDebt} onAdd={addDebt} onRemove={removeDebt} />
              {fieldError.debts && <p className="field-error" role="alert">{fieldError.debts}</p>}
              <fieldset className="calc-fieldset">
                <legend>새로 빌릴 대출 조건</legend>
                <div className="calc-fields dsr-new-fields">
                  <RateInput label="연이율" value={newRate} onChange={setNewRate} required error={fieldError.newRate} />
                  <NumberField label="기간" value={term} onChange={setTerm} min={1} max={120} unit="회" error={fieldError.term} />
                  <SelectField label="상환 방식" value={newMethod} options={methodOptions} onChange={setNewMethod} hint="세 방식의 한도를 모두 보여 주고 선택한 방식을 표시해요" />
                </div>
              </fieldset>
              <div className="form-actions">
                <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? "계산하고 있어요…" : "DSR 계산하기"}</button>
              </div>
            </form>

            <section className="calc-results" aria-live="polite">
              {!!error && <LoadError error={error} onRetry={() => submitted && run(submitted)} />}
              {!error && !result && (loading ? <Loading message="대출마다 연 원리금을 계산하고 있어요" minHeight={200} /> : (
                <EmptyState
                  title="아직 계산하지 않았어요"
                  description={'위 조건으로 "DSR 계산하기"를 누르면 대출마다 한 해에 갚는 원리금, 합산 DSR과 상한까지 남은 여유, 더 빌릴 수 있는 금액이 여기에 나와요. DSR이 무엇인지부터 보려면 개념 글을 읽어요.'}
                  action={{ to: "/learn/dsr-ltv-limit", label: "개념 7 · 한도의 규칙 읽기" }}
                />
              ))}
              {result && (
                <div className="stack calc-stack">
                  <div className="refi-verdict">
                    <p className="refi-verdict-line">
                      <StatusChip label={result.exceeded ? "상한 초과" : "상한 이내"} tone={result.exceeded ? "danger" : "good"} />
                      <span>{dsrSentence(result)}</span>
                    </p>
                    <dl className="figure-row" style={{ "--figure-cols": 4 } as CSSProperties}>
                      <div><dt>합산 연 원리금</dt><dd><Money value={result.totalAnnualDebtService} /></dd></div>
                      <div><dt>합산 DSR</dt><dd className={result.exceeded ? "danger" : undefined}>{pct(result.dsrRatio)}<small>상한 {pct(result.dsrLimit)}</small></dd></div>
                      <div><dt>상한까지 남은 연 원리금</dt><dd><Money value={result.remainingAnnualRoom} /><small>월 {formatNumber(result.monthlyRoom)}</small></dd></div>
                      <div><dt>추가 한도({METHOD_LABEL[result.newLoan.repaymentMethod]})</dt><dd className="accent"><Money value={result.additionalLimit} /></dd></div>
                    </dl>
                  </div>
                  <DsrDebtTable result={result} />
                  <DsrGauge
                    dsr={result.dsrRatio}
                    limit={result.dsrLimit}
                    after={requested && requested.limit > 0 ? requested.dsrAfter : null}
                    afterAnnual={requested && requested.limit > 0 ? result.totalAnnualDebtService + requested.newAnnualDebtService : null}
                    exceeded={result.exceeded}
                    total={result.totalAnnualDebtService}
                    allowed={result.allowedAnnualDebtService}
                    methodLabel={METHOD_LABEL[result.newLoan.repaymentMethod]}
                  />
                  <DsrLimitTable result={result} />
                  <Disclosure data={result.disclosure} />
                </div>
              )}
            </section>
          </div>

          <aside aria-label="계산식 안내">
            <div className="panel">
              <h3>DSR은 이렇게 셈해요</h3>
              <dl className="def-list calc-howto">
                <div><dt>연 원리금</dt><dd>대출마다 앞으로 12회 낼 원금 + 이자. 12회가 안 남았으면 남은 회차만.</dd></div>
                <div><dt>만기일시</dt><dd>원금을 만기에 한 번에 갚아 이자만 보면 부담이 작아 보이므로, 원금을 정해진 연수로 나눠 연 원리금에 넣는다.</dd></div>
                <div><dt>합산 DSR</dt><dd>모든 대출의 연 원리금 합 ÷ 연소득. 상한(규칙 세트)을 넘으면 더 빌릴 수 없다.</dd></div>
                <div><dt>추가 한도</dt><dd>상한까지 남은 연 원리금으로 새 대출 조건에서 갚을 수 있는 최대 원금, 만 원 절사.</dd></div>
              </dl>
            </div>
            <div className="panel panel-soft">
              <h3>이어서</h3>
              <ul className="calc-links">
                <li><Link to="/learn/dsr-ltv-limit">개념 7 · 한도의 규칙: DSR·LTV·소득배수</Link></li>
                <li><Link to="/calculators/screening">합산 연 원리금으로 심사해 보기</Link></li>
                <li><Link to="/methodology">규칙 세트의 DSR 상한·가정값 보기</Link></li>
              </ul>
            </div>
          </aside>
        </div>
        <nav className="next-actions" aria-label="다음 행동">
          <Link to="/calculators/refinance">대환대출 비교 <Icon name="next" size={16} /></Link>
          <Link to="/calculators/screening">심사 시뮬레이터 <Icon name="next" size={16} /></Link>
        </nav>
      </main>
    </>
  );
}
