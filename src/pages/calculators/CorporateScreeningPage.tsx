import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import {
  CUSTOMER_TYPE_LABEL,
  INDUSTRIES,
  corporateApi,
  type CorporateCustomerType,
  type CorporateScreeningRequest,
  type CorporateScreeningResult,
} from "../../api/corporate";
import LimitLadder, { type LimitCandidate } from "../../components/charts/LimitLadder";
import RateWaterfall, { type RateStep } from "../../components/charts/RateWaterfall";
import Disclosure from "../../components/Disclosure";
import EmptyState from "../../components/EmptyState";
import Icon from "../../components/Icon";
import LoadError from "../../components/LoadError";
import Loading from "../../components/Loading";
import MoneyInput from "../../components/MoneyInput";
import SubPageHeader from "../../components/SubPageHeader";
import { formatNumber } from "../../lib/format";
import {
  CorporateAuthorityTable,
  CorporateDecisionSummary,
  CorporateGradeLadder,
  CorporateRatioTable,
  CorporateReasons,
  SignedMoneyField,
} from "./CorporateScreeningParts";
import { NumberField, SelectField } from "./parts/fields";
import { won } from "./parts/labels";
import "../../styles/corporate-screening.css";

/** 상품 허용 기간(business-rules WP32 §32.6). 서버가 규칙 세트로 다시 검사하며 밖이면 PRODUCT_CONSTRAINT 로 거절한다. */
const TERMS = [12, 24, 36, 48, 60];
const MAX_AMOUNT = 10_000_000_000_000;

/** 기본값은 계산 예시 19-1(법인 · 제조업 · 업력 7년 · 신청 6억 · 36회 → 조건부 승인). */
const DEFAULTS = {
  customerType: "CORPORATION" as CorporateCustomerType,
  industryCode: "MANUFACTURING",
  businessYears: 7,
  revenue: 2_000_000_000,
  operatingIncome: 240_000_000,
  interestExpense: 40_000_000,
  totalBorrowings: 700_000_000,
  equity: 500_000_000,
  totalLiabilities: 900_000_000,
  requestedAmount: 600_000_000,
  termMonths: 36,
};

/** 개인사업자 예시 19-2(숙박·음식점업 · 업력 4년 · 신청 5천만 · 24회 → 자동 승인). */
const SOLE_EXAMPLE = {
  customerType: "SOLE_PROPRIETOR" as CorporateCustomerType,
  industryCode: "ACCOMMODATION_FOOD",
  businessYears: 4,
  revenue: 600_000_000,
  operatingIncome: 54_000_000,
  interestExpense: 6_000_000,
  totalBorrowings: 150_000_000,
  equity: 120_000_000,
  totalLiabilities: 180_000_000,
  requestedAmount: 50_000_000,
  termMonths: 24,
};

/** 법인 거절 예시 19-3(건설업 · 업력 1년 · 완전자본잠식 → 거절, 사유 3개). */
const REJECT_EXAMPLE = {
  customerType: "CORPORATION" as CorporateCustomerType,
  industryCode: "CONSTRUCTION",
  businessYears: 1,
  revenue: 800_000_000,
  operatingIncome: -20_000_000,
  interestExpense: 30_000_000,
  totalBorrowings: 600_000_000,
  equity: -50_000_000,
  totalLiabilities: 900_000_000,
  requestedAmount: 100_000_000,
  termMonths: 36,
};

type Draft = { [K in keyof typeof DEFAULTS]: (typeof DEFAULTS)[K] | null } & { customerType: CorporateCustomerType; industryCode: string; termMonths: number };

function rateSteps(r: CorporateScreeningResult): RateStep[] {
  if (!r.rate) return [];
  return [
    { label: `${r.score.grade}등급 스프레드`, delta: r.rate.gradeSpread, note: "내부등급 가산" },
    { label: "업종 가산", delta: r.rate.industrySurcharge, note: r.industry.label },
  ];
}

function limitCandidates(r: CorporateScreeningResult): LimitCandidate[] {
  return (r.limits?.candidates ?? []).map(c => ({ name: c.name, amount: c.amount, binding: c.binding, note: c.rule.replace("CORP-LIMIT-", "") }));
}

/**
 * 기업 심사 시뮬레이터(S-320, FR-53): 폼 → 결정 요약 → 재무비율 표 → 등급 사다리 → 금리 구성 → 한도 사다리(병목 강조)
 * → 전결 권한 표 → 근거표 → Disclosure. 계산은 POST /calculators/corporate-screening 한 번, 수치는 규칙 세트 corporate 키(교육용 가정값).
 */
export default function CorporateScreeningPage() {
  const [draft, setDraft] = useState<Draft>(DEFAULTS);
  const [submitted, setSubmitted] = useState<CorporateScreeningRequest | null>(null);
  // 결과와 그 결과를 만든 요청을 함께 둔다(다시 심사하는 동안 새 요청 금액이 이전 결과와 섞이지 않게).
  const [shown, setShown] = useState<{ req: CorporateScreeningRequest; result: CorporateScreeningResult } | null>(null);
  const result = shown?.result ?? null;
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(false);
  const [fieldError, setFieldError] = useState<Record<string, string>>({});
  const set = <K extends keyof Draft>(key: K) => (value: Draft[K]) => setDraft(d => ({ ...d, [key]: value }));

  const run = async (req: CorporateScreeningRequest) => {
    setSubmitted(req); setLoading(true); setError(null);
    try { setShown({ req, result: await corporateApi.screen(req) }); } catch (err) { setError(err); } finally { setLoading(false); }
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const d = draft;
    const errors: Record<string, string> = {};
    const money = (key: keyof Draft, label: string, min = 0) => {
      const v = d[key] as number | null;
      if (v === null || v < min || Math.abs(v) > MAX_AMOUNT) errors[key] = `${label}을 넣어요${min > 0 ? "(1원 이상)" : ". 없으면 0"}.`;
    };
    if (d.businessYears === null || !Number.isInteger(d.businessYears) || d.businessYears < 0 || d.businessYears > 100) errors.businessYears = "업력은 0~100년 사이의 정수예요.";
    money("revenue", "매출액");
    if (d.operatingIncome === null) errors.operatingIncome = "영업이익을 넣어요. 적자면 아래 체크.";
    money("interestExpense", "이자비용");
    money("totalBorrowings", "총차입금");
    if (d.equity === null) errors.equity = "자기자본을 넣어요. 자본잠식이면 아래 체크.";
    money("totalLiabilities", "부채총계");
    money("requestedAmount", "신청 금액", 1);
    if (!errors.totalBorrowings && !errors.totalLiabilities && d.totalBorrowings! > d.totalLiabilities!) errors.totalBorrowings = "총차입금은 부채총계 이하예요(차입금은 부채의 일부).";
    setFieldError(errors);
    if (Object.keys(errors).length) return;
    run({
      customerType: d.customerType, industryCode: d.industryCode, businessYears: d.businessYears!, revenue: d.revenue!, operatingIncome: d.operatingIncome!,
      interestExpense: d.interestExpense!, totalBorrowings: d.totalBorrowings!, equity: d.equity!, totalLiabilities: d.totalLiabilities!,
      requestedAmount: d.requestedAmount!, termMonths: d.termMonths,
    });
  };

  const fill = (example: typeof DEFAULTS) => { setDraft(example); setFieldError({}); };

  return (
    <>
      <SubPageHeader
        section="calculators"
        current="/calculators/corporate"
        title="기업 심사 시뮬레이터"
        description="개인사업자·법인의 재무제표 숫자를 넣으면 재무비율 → 내부등급 → 금리 → 한도 → 결정 → 전결 권한 순서로 심사해요. 개인 심사가 소득·DSR을 보는 자리에 기업 심사는 재무비율과 상환능력을 보고, 금액이 클수록 더 높은 단계가 승인한다는 점을 규칙별 근거와 함께 보여 줘요."
        meta={<>기본값은 계산 예시 19-1(법인 · 제조업 · 신청 6억 원 · 36회) · 모든 수치는 교육용 가정값 · 규칙 세트 v1</>}
      />
      <main className="page-main calc corp">
        <div className="page-grid">
          <div className="calc-main">
            <form className="calc-form panel" onSubmit={submit} aria-labelledby="corp-form-title" noValidate>
              <h2 id="corp-form-title">가상 기업과 신청 조건</h2>
              <div className="btn-row">
                <span className="field-hint">계산 예시로 채우기</span>
                <button type="button" className="btn btn-secondary btn-small" onClick={() => fill(DEFAULTS)}>19-1 법인 조건부</button>
                <button type="button" className="btn btn-secondary btn-small" onClick={() => fill(SOLE_EXAMPLE)}>19-2 개인사업자 승인</button>
                <button type="button" className="btn btn-secondary btn-small" onClick={() => fill(REJECT_EXAMPLE)}>19-3 법인 거절</button>
              </div>
              <fieldset className="calc-fieldset">
                <legend>고객</legend>
                <div className="calc-fields">
                  <SelectField label="고객 유형" value={draft.customerType} onChange={set("customerType")}
                    options={(Object.keys(CUSTOMER_TYPE_LABEL) as CorporateCustomerType[]).map(value => ({ value, label: CUSTOMER_TYPE_LABEL[value] }))}
                    hint="최소 업력·매출 대비 한도 비율·상품 최대가 유형별로 달라요" />
                  <SelectField label="업종" value={draft.industryCode} onChange={set("industryCode")}
                    options={INDUSTRIES.map(i => ({ value: i.code, label: i.surcharge === null ? `${i.label}(교육용 제외)` : `${i.label} +${i.surcharge.toFixed(2)}%p` }))}
                    hint="업종 가산은 업황 위험을 단순화한 교육용 가정값이에요" />
                  <NumberField label="업력" value={draft.businessYears} onChange={set("businessYears")} min={0} max={100} unit="년" error={fieldError.businessYears} hint="개인사업자 1년 · 법인 2년 이상" />
                </div>
              </fieldset>
              <fieldset className="calc-fieldset">
                <legend>재무제표(최근 1년, 가상 숫자)</legend>
                <div className="calc-fields">
                  <MoneyInput label="매출액" value={draft.revenue} onChange={set("revenue")} required error={fieldError.revenue} />
                  <SignedMoneyField label="영업이익" value={draft.operatingIncome} onChange={set("operatingIncome")} negativeLabel="영업손실(적자)" error={fieldError.operatingIncome} />
                  <MoneyInput label="이자비용" value={draft.interestExpense} onChange={set("interestExpense")} required error={fieldError.interestExpense} hint="한 해 동안 낸 차입금 이자" />
                  <MoneyInput label="총차입금" value={draft.totalBorrowings} onChange={set("totalBorrowings")} required error={fieldError.totalBorrowings} hint="이자가 붙는 빚. 부채총계 이하" />
                  <SignedMoneyField label="자기자본" value={draft.equity} onChange={set("equity")} negativeLabel="완전자본잠식(음수)" error={fieldError.equity} hint="자산 − 부채. 개인사업자는 장부상 자본" />
                  <MoneyInput label="부채총계" value={draft.totalLiabilities} onChange={set("totalLiabilities")} required error={fieldError.totalLiabilities} hint="차입금 + 매입채무 등 모든 부채" />
                </div>
              </fieldset>
              <fieldset className="calc-fieldset">
                <legend>신청 조건(기업 운전자금 · 원리금균등)</legend>
                <div className="calc-fields">
                  <MoneyInput label="신청 금액" value={draft.requestedAmount} onChange={set("requestedAmount")} required error={fieldError.requestedAmount} hint="1,000만 원부터 개인사업자 5억 원 · 법인 20억 원까지" />
                  <SelectField label="기간" value={draft.termMonths} onChange={set("termMonths")} options={TERMS.map(t => ({ value: t, label: `${t}회` }))} />
                </div>
              </fieldset>
              <div className="form-actions">
                <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? "심사하고 있어요…" : "기업 심사하기"}</button>
              </div>
            </form>

            <section className="calc-results" aria-live="polite">
              {!!error && <LoadError error={error} onRetry={() => submitted && run(submitted)} />}
              {!error && !result && (loading ? <Loading message="재무비율과 등급을 차례로 계산하고 있어요" minHeight={200} /> : (
                <EmptyState
                  title="아직 심사하지 않았어요"
                  description={'"기업 심사하기"를 누르면 재무비율 점수, 내부등급, 금리 구성, 한도가 어디서 막혔는지, 누가 승인하는지가 그림과 근거 표로 나와요. 개인 심사부터 보려면 심사 시뮬레이터를 먼저 써 봐요.'}
                  action={{ to: "/calculators/screening", label: "개인 심사 시뮬레이터" }}
                />
              ))}
              {result && shown && (
                <div className="stack calc-stack">
                  <CorporateDecisionSummary result={result} requested={shown.req.requestedAmount} />
                  <CorporateRatioTable result={result} />
                  <CorporateGradeLadder score={result.score} />
                  {result.rate ? (
                    <RateWaterfall base={{ label: "기준금리", delta: result.rate.base, note: "기업 운전자금" }} steps={rateSteps(result)} finalRate={result.rate.applied} capRate={result.rate.cap} />
                  ) : <p className="corp-skip">자격 또는 내부등급 기준에서 거절이라 금리·한도·전결은 계산하지 않았다.</p>}
                  {result.limits && (
                    <>
                      <LimitLadder candidates={limitCandidates(result)} finalAmount={result.limits.finalLimit} requestedAmount={shown.req.requestedAmount} />
                      <div className="panel">
                        <h3>상환능력 한도는 이렇게 셈한다</h3>
                        <dl className="def-list calc-howto corp-howto">
                          <div><dt>상환 재원</dt><dd>영업이익 − 이자비용 = {won(result.limits.repayment.source)}</dd></div>
                          <div><dt>허용 연 원리금</dt><dd>재원 ÷ 요구 상환배율 {result.limits.repayment.requiredCoverage.toFixed(2)} = {won(result.limits.repayment.allowedAnnual)}</dd></div>
                          <div><dt>월 상환 여력</dt><dd>÷ 12 = {won(result.limits.repayment.monthlyCapacity)}</dd></div>
                          <div><dt>역산 원금</dt><dd>{result.rate?.applied.toFixed(2)}% · {shown.req.termMonths}회 원리금균등으로 {won(result.limits.repayment.beforeRounding)} → 만 원 절사</dd></div>
                        </dl>
                      </div>
                    </>
                  )}
                  <CorporateAuthorityTable authority={result.authority} grade={result.score.grade} />
                  <CorporateReasons reasons={result.reasons} />
                  <Disclosure data={result.disclosure} />
                </div>
              )}
            </section>
          </div>

          <aside aria-label="규칙 안내">
            <div className="panel">
              <h3>개인 심사와 다른 점</h3>
              <dl className="def-list calc-howto">
                <div><dt>상환능력</dt><dd>소득·DSR 대신 재무제표(영업이익·이자비용·차입금)로 본다.</dd></div>
                <div><dt>등급</dt><dd>외부 신용점수 밴드 대신 재무비율·업력 점수로 매기는 내부등급 1~10.</dd></div>
                <div><dt>금리</dt><dd>기준금리 + 등급 스프레드 + 업종 가산, 법정 최고금리 20% 상한.</dd></div>
                <div><dt>한도</dt><dd>매출 대비·상환능력·동일인 한도·상품 최대 중 가장 작은 값.</dd></div>
                <div><dt>전결</dt><dd>금액 구간과 등급에 따라 자동 승인 → 심사역 → 심사팀장 → 심사위원회.</dd></div>
                <div><dt>보증</dt><dd>대표자 연대보증은 제한·폐지 추세라 이 시뮬레이터는 보증을 반영하지 않는다.</dd></div>
              </dl>
            </div>
            <table className="table table-compact">
              <caption>업종 가산 · 교육용 가정값</caption>
              <thead><tr><th scope="col">업종</th><th scope="col" className="num">가산</th></tr></thead>
              <tbody>
                {INDUSTRIES.map(i => (
                  <tr key={i.code}><th scope="row">{i.label}{i.note && <><br /><span className="faint">{i.note}</span></>}</th><td className="num">{i.surcharge === null ? "제외" : `+${i.surcharge.toFixed(2)}%p`}</td></tr>
                ))}
              </tbody>
            </table>
            <div className="panel panel-soft">
              <h3>이어서</h3>
              <ul className="calc-links">
                <li><Link to="/calculators/screening">개인 심사 시뮬레이터와 비교</Link></li>
                <li><Link to="/learn/credit-score-and-screening">개념 8 · 신용점수와 심사</Link></li>
                <li><Link to="/methodology">방법론에서 규칙 세트 가정값 보기</Link></li>
              </ul>
              <p className="field-hint">동일인 한도는 가상 회사 자기자본 {formatNumber(100_000_000_000)}원 × 1.00%로 가정한다.</p>
            </div>
          </aside>
        </div>
        <nav className="next-actions" aria-label="다음 행동">
          <Link to="/calculators/screening">개인 심사 시뮬레이터 <Icon name="next" size={16} /></Link>
          <Link to="/calculators/dsr">DSR 계산기 <Icon name="next" size={16} /></Link>
          <Link to="/methodology">방법론에서 규칙 전체 보기 <Icon name="next" size={16} /></Link>
        </nav>
      </main>
    </>
  );
}
