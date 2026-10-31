import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { calculatorsApi } from "../../api/calculators";
import type { EmploymentType, Product, RepaymentMethod, ScreeningRequest, ScreeningResult } from "../../api/types";
import LimitLadder, { type LimitCandidate } from "../../components/charts/LimitLadder";
import RateWaterfall, { type RateStep } from "../../components/charts/RateWaterfall";
import Disclosure from "../../components/Disclosure";
import EmptyState from "../../components/EmptyState";
import Icon from "../../components/Icon";
import LoadError from "../../components/LoadError";
import Loading from "../../components/Loading";
import MoneyInput from "../../components/MoneyInput";
import SubPageHeader from "../../components/SubPageHeader";
import DecisionSummary from "./parts/DecisionSummary";
import { CheckField, DateField, NumberField, SelectField } from "./parts/fields";
import { EMPLOYMENT_LABEL, METHOD_LABEL, todayIso } from "./parts/labels";
import LimitBreakdown from "./parts/LimitBreakdown";
import RateBreakdown from "./parts/RateBreakdown";
import ScreeningReasons from "./parts/ScreeningReasons";
import { useLoad } from "./parts/useLoad";

/** 법정 최고금리(business-rules §3.2). 금리 워터폴의 기준선으로만 쓴다. */
const RATE_CAP = 20;

/** 적용 금리 워터폴 입력: 기준금리에서 시작해 밴드 스프레드를 올리고 자동이체 우대를 내린다. */
function rateSteps(result: ScreeningResult): RateStep[] {
  const { rate } = result;
  if (!rate) return [];
  const steps: RateStep[] = [{ label: `신용 밴드 ${result.creditBand ?? "—"}`, delta: rate.spread, note: "상품별 가산" }];
  if (rate.discount > 0) steps.push({ label: "자동이체 우대", delta: -rate.discount });
  return steps;
}

/** 한도 사다리 입력: 담보(LTV) 또는 상품 최대 · 소득배수 · DSR 역산. 병목은 서버가 준 bindingRule 로 표시한다. */
function limitCandidates(result: ScreeningResult, productName: string | undefined, ltvRate: number | null): LimitCandidate[] {
  const { limits, dsr } = result;
  if (!limits) return [];
  const list: LimitCandidate[] = [];
  const mark = (code: string) => limits.bindingRule === code;
  if (limits.ltvCap !== null) list.push({ name: ltvRate !== null ? `담보(LTV ${ltvRate}%)` : "담보(LTV)", amount: limits.ltvCap, note: ltvRate !== null ? `차량가 × ${ltvRate}%` : undefined, binding: mark("LIMIT-LTV") });
  else if (limits.productCap !== null) list.push({ name: "상품 최대", amount: limits.productCap, note: productName, binding: mark("LIMIT-PRODUCT") });
  if (limits.incomeCap !== null) list.push({ name: "소득배수", amount: limits.incomeCap, note: `밴드 ${result.creditBand ?? "—"} 배수`, binding: mark("LIMIT-INCOME") });
  if (limits.dsrCap !== null) list.push({ name: "DSR 역산", amount: limits.dsrCap, note: dsr ? `DSR ${dsr.limit}% 여유로 역산` : undefined, binding: mark("LIMIT-DSR") });
  return list;
}

/** 신용 밴드 표(business-rules §3.2). 보조 열의 규칙 안내용이며 계산은 서버(또는 mock 엔진)가 한다. */
const BAND_TABLE = [
  { band: "A", score: "900~1000", credit: "+0.0", auto: "+0.0", multiple: "1.5" },
  { band: "B", score: "800~899", credit: "+2.0", auto: "+1.0", multiple: "1.2" },
  { band: "C", score: "700~799", credit: "+5.0", auto: "+2.5", multiple: "1.0" },
  { band: "D", score: "600~699", credit: "+9.0", auto: "+4.5", multiple: "0.6" },
];

/**
 * 심사 시뮬레이터(S-07): 폼(상품 선택 시 차량가 노출) → 결정 배지+문장 → 금리 구성 → 한도 구성(병목 강조) → 규칙별 근거 표 → Disclosure.
 * 기본값은 계산 예시 6(연소득 4,800만 · 기존 600만 · 820점 · 신용대출 3,000만 · 36회 · 원리금균등 · 자동이체 없음).
 */
export default function ScreeningCalculatorPage() {
  const products = useLoad<Product[]>(signal => calculatorsApi.products(signal), []);
  const [birthDate, setBirthDate] = useState("1995-03-02");
  const [annualIncome, setAnnualIncome] = useState<number | null>(48_000_000);
  const [existing, setExisting] = useState<number | null>(6_000_000);
  const [creditScore, setCreditScore] = useState<number | null>(820);
  const [employmentType, setEmploymentType] = useState<EmploymentType>("EMPLOYEE");
  const [productCode, setProductCode] = useState("CREDIT_LOAN");
  const [vehicleValue, setVehicleValue] = useState<number | null>(32_000_000);
  const [requestedAmount, setRequestedAmount] = useState<number | null>(30_000_000);
  const [termMonths, setTermMonths] = useState(36);
  const [method, setMethod] = useState<RepaymentMethod>("EQUAL_PAYMENT");
  const [autoDebit, setAutoDebit] = useState(false);
  const [asOf, setAsOf] = useState(todayIso());
  const [submitted, setSubmitted] = useState<ScreeningRequest | null>(null);
  const [result, setResult] = useState<ScreeningResult | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(false);
  const [fieldError, setFieldError] = useState<Record<string, string>>({});

  const product = products.data?.find(p => p.code === productCode) ?? null;
  const isAuto = product?.requiresCollateral ?? productCode === "AUTO_INSTALLMENT";
  // 자격 미충족 거절이면 서버가 rate·limits 를 null 로 주므로 그림을 건너뛴다.
  const rate = result?.rate ?? null;
  const finalLimit = result?.limits?.finalLimit ?? null;

  /** 상품을 바꾸면 그 상품이 허용하는 기간·방식으로 맞춘다. */
  const chooseProduct = (code: string) => {
    setProductCode(code);
    const next = products.data?.find(p => p.code === code);
    if (!next) return;
    if (!next.allowedTerms.includes(termMonths)) setTermMonths(next.allowedTerms[0]);
    if (!next.allowedMethods.includes(method)) setMethod(next.allowedMethods[0]);
  };
  const run = async (req: ScreeningRequest) => {
    setSubmitted(req); setLoading(true); setError(null);
    try { setResult(await calculatorsApi.screening(req)); } catch (err) { setError(err); } finally { setLoading(false); }
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const errors: Record<string, string> = {};
    if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) errors.birthDate = "생년월일을 날짜로 넣어요.";
    if (annualIncome === null) errors.annualIncome = "연소득을 넣어요. 소득이 없으면 0.";
    if (existing === null) errors.existing = "기존 연 원리금을 넣어요. 없으면 0.";
    if (creditScore === null || creditScore < 300 || creditScore > 1000) errors.creditScore = "신용점수는 300~1000점이에요.";
    if (requestedAmount === null || requestedAmount <= 0) errors.requestedAmount = "신청 금액을 넣어요.";
    if (isAuto && (vehicleValue === null || vehicleValue <= 0)) errors.vehicleValue = "자동차 할부는 차량가가 있어야 한도(LTV)를 정해요.";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(asOf)) errors.asOf = "기준일을 날짜로 넣어요.";
    setFieldError(errors);
    if (Object.keys(errors).length) return;
    run({ birthDate, annualIncome: annualIncome!, existingAnnualDebtService: existing!, creditScore: creditScore!, productCode, requestedAmount: requestedAmount!, termMonths, repaymentMethod: method, autoDebit, vehicleValue: isAuto ? vehicleValue : null, asOf, employmentType });
  };

  return (
    <>
      <SubPageHeader
        section="calculators"
        current="/calculators/screening"
        title="심사 시뮬레이터"
        description="가상 고객의 소득·기존 부채·신용점수와 신청 조건을 넣으면 자격 → 금리 → 한도 → 결정 순서로 심사해요. 결정만 보여 주지 않고 금리가 어떻게 구성됐는지, 한도가 어느 규칙에서 막혔는지 규칙별 입력·기준·결과를 표로 보여 줘요."
        meta={<>기본값은 계산 예시 6(연소득 4,800만 원 · 820점 · 신용대출 3,000만 원 · 36회) · 규칙 세트 v1</>}
      />
      <main className="page-main calc">
        <div className="page-grid">
          <div className="calc-main">
            <form className="calc-form panel" onSubmit={submit} aria-labelledby="screening-form-title" noValidate>
              <h2 id="screening-form-title">고객과 신청 조건</h2>
              <fieldset className="calc-fieldset">
                <legend>가상 고객</legend>
                <div className="calc-fields">
                  <DateField label="생년월일" value={birthDate} onChange={setBirthDate} error={fieldError.birthDate} hint="기준일 기준 만 19세 이상이어야 해요" />
                  <MoneyInput label="연소득" value={annualIncome} onChange={setAnnualIncome} required error={fieldError.annualIncome} hint="세전 연 소득" />
                  <MoneyInput label="기존 연 원리금" value={existing} onChange={setExisting} required error={fieldError.existing} hint="다른 대출로 한 해에 갚는 원금+이자" />
                  <SelectField label="고용형태" value={employmentType} onChange={setEmploymentType} options={(Object.keys(EMPLOYMENT_LABEL) as EmploymentType[]).map(value => ({ value, label: EMPLOYMENT_LABEL[value] }))} hint="직장인 신용대출은 근로소득자만 신청할 수 있어요" />
                  <NumberField label="신용점수" value={creditScore} onChange={setCreditScore} min={300} max={1000} unit="점" error={fieldError.creditScore} hint="300~1000점. 600점 미만은 거절" />
                  <DateField label="기준일" value={asOf} onChange={setAsOf} error={fieldError.asOf} hint="나이 계산 기준(샌드박스에서는 영업일)" />
                </div>
              </fieldset>
              <fieldset className="calc-fieldset">
                <legend>신청 조건</legend>
                <div className="calc-fields">
                  <SelectField label="상품" value={productCode} options={(products.data ?? []).map(p => ({ value: p.code, label: p.name }))} onChange={chooseProduct} hint={product?.description} disabled={!products.data} />
                  {isAuto && <MoneyInput label="차량가" value={vehicleValue} onChange={setVehicleValue} required error={fieldError.vehicleValue} hint={`담보 한도 = 차량가 × ${product?.ltvRate ?? "상품 LTV"}%`} />}
                  <MoneyInput label="신청 금액" value={requestedAmount} onChange={setRequestedAmount} required error={fieldError.requestedAmount} hint={product ? `${product.name} ${product.minAmount.toLocaleString("ko-KR")}원부터${product.maxAmount ? ` ${product.maxAmount.toLocaleString("ko-KR")}원까지` : ` 차량가 ${product.ltvRate ?? "—"}%까지`}` : undefined} />
                  <SelectField label="기간" value={termMonths} options={(product?.allowedTerms ?? [termMonths]).map(t => ({ value: t, label: `${t}회` }))} onChange={setTermMonths} />
                  <SelectField label="상환 방식" value={method} options={(product?.allowedMethods ?? [method]).map(m => ({ value: m, label: METHOD_LABEL[m] }))} onChange={setMethod} hint={isAuto ? "자동차 할부는 원리금균등만" : undefined} />
                  <CheckField label="자동이체 신청(우대 0.20%p)" checked={autoDebit} onChange={setAutoDebit} />
                </div>
              </fieldset>
              {!!products.error && <LoadError error={products.error} message="상품 목록을 불러오지 못했어요. 다시 시도해요." onRetry={products.reload} />}
              <div className="form-actions">
                <button type="submit" className="btn btn-primary" disabled={loading || !products.data}>{loading ? "심사하고 있어요…" : "심사하기"}</button>
              </div>
            </form>

            <section className="calc-results" aria-live="polite">
              {!!error && <LoadError error={error} onRetry={() => submitted && run(submitted)} />}
              {!error && !result && (loading ? <Loading message="규칙을 순서대로 평가하고 있어요" minHeight={200} /> : (
                <EmptyState
                  title="아직 심사하지 않았어요"
                  description={'위 조건으로 "심사하기"를 누르면 금리가 어떻게 쌓였는지, 한도가 어디서 막혔는지 그림과 근거 표로 나와요. 규칙부터 보고 싶다면 한도 개념을 먼저 읽어요.'}
                  action={{ to: "/learn/dsr-ltv-limit", label: "개념 7 · 한도의 규칙 읽기" }}
                />
              ))}
              {result && submitted && (
                <div className="stack calc-stack">
                  <DecisionSummary result={result} requestedAmount={submitted.requestedAmount} productMin={product?.minAmount ?? null} />
                  {rate && <RateWaterfall base={{ label: "기준금리", delta: rate.base, note: product?.name }} steps={rateSteps(result)} finalRate={rate.applied} capRate={RATE_CAP} />}
                  {finalLimit !== null && <LimitLadder candidates={limitCandidates(result, product?.name, product?.ltvRate ?? null)} finalAmount={finalLimit} requestedAmount={submitted.requestedAmount} />}
                  <RateBreakdown result={result} autoDebit={submitted.autoDebit} monthlyPayment={result.monthlyPayment} />
                  <LimitBreakdown result={result} requestedAmount={submitted.requestedAmount} ltvRate={product?.ltvRate ?? null} />
                  <ScreeningReasons reasons={result.reasons} />
                  <Disclosure data={result.disclosure} />
                </div>
              )}
            </section>
          </div>

          <aside aria-label="규칙 안내">
            <div className="panel">
              <h3>심사 순서</h3>
              <ol className="calc-steps">
                <li>자격: 만 19세 이상 · 연소득 0원 초과 · 신용점수 600점 이상 · 상품 범위 안</li>
                <li>금리: 기준금리 + 밴드 스프레드 − 자동이체 우대 0.2%p, 최고 20.00%</li>
                <li>한도: 상품 최대(자동차 할부는 차량가 × 상품 LTV — 신차 90%·중고차 70%) · 소득배수 · DSR 50% 역산 중 최소, 만 원 절사</li>
                <li>결정: 요청 ≤ 한도면 승인, 상품 최소 이상이면 조건부, 그 미만이면 거절</li>
              </ol>
            </div>
            <table className="table table-compact">
              <caption>신용 밴드와 스프레드 · 교육용 가정값</caption>
              <thead><tr><th scope="col">밴드</th><th scope="col">점수</th><th scope="col" className="num">신용대출</th><th scope="col" className="num">자동차할부</th><th scope="col" className="num">소득배수</th></tr></thead>
              <tbody>
                {BAND_TABLE.map(b => <tr key={b.band}><th scope="row">{b.band}</th><td>{b.score}</td><td className="num">{b.credit}%p</td><td className="num">{b.auto}%p</td><td className="num">×{b.multiple}</td></tr>)}
                <tr><th scope="row">—</th><td>600 미만</td><td className="num" colSpan={3}>거절</td></tr>
              </tbody>
            </table>
            <div className="panel panel-soft">
              <h3>이어서</h3>
              <ul className="calc-links">
                <li><Link to="/learn/interest-rate-structure">개념 5 · 금리의 구성</Link></li>
                <li><Link to="/learn/dsr-ltv-limit">개념 7 · 한도의 규칙: DSR·LTV·소득배수</Link></li>
                <li><Link to="/glossary/dsr">DSR 용어 보기</Link></li>
              </ul>
            </div>
          </aside>
        </div>
        <nav className="next-actions" aria-label="다음 행동">
          <Link to="/sandbox/profile">이 조건으로 가상 고객 프로필 만들기 <Icon name="next" size={16} /></Link>
          <Link to="/calculators/schedule">상환 스케줄 계산기 <Icon name="next" size={16} /></Link>
          <Link to="/methodology">방법론에서 규칙 전체 보기 <Icon name="next" size={16} /></Link>
        </nav>
      </main>
    </>
  );
}
