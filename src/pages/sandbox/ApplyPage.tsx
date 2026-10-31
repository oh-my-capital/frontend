import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { errorMessage } from "../../api/client";
import { sandboxApi } from "../../api/sandbox";
import type { ApplicationRequest, Product, RepaymentMethod, Sandbox } from "../../api/types";
import EmptyState from "../../components/EmptyState";
import Icon from "../../components/Icon";
import LoadError from "../../components/LoadError";
import Loading from "../../components/Loading";
import Money from "../../components/Money";
import MoneyInput from "../../components/MoneyInput";
import Stepper from "../../components/Stepper";
import SubPageHeader from "../../components/SubPageHeader";
import { formatDate, formatNumber } from "../../lib/format";
import { CheckField, SelectField } from "../calculators/parts/fields";
import { METHOD_LABEL, PAYMENT_DAY_OPTIONS, pct } from "../calculators/parts/labels";
import { useLoad } from "../calculators/parts/useLoad";

const STEPS = ["상품 선택", "조건 입력", "확인·신청"];

/**
 * 대출 신청(S-13): Stepper 3단계 — 상품 선택(표) → 조건(금액·기간·방식·납입일·자동이체·차량) → 확인·신청.
 * POST /sandbox/applications 는 접수와 동시에 자동 심사를 끝내므로 응답을 받으면 바로 S-14 결과 화면으로 간다.
 * 키보드만으로 완료할 수 있게 라디오·셀렉트·버튼만 쓴다.
 */
export default function ApplyPage() {
  const navigate = useNavigate();
  const summary = useLoad<Sandbox>(signal => sandboxApi.summary(signal), []);
  const products = useLoad<Product[]>(signal => sandboxApi.products(signal), []);
  const [step, setStep] = useState(0);
  // WP23: 상품 안내의 "모의 신청"(?product=CODE)이면 그 상품을 미리 고른다. 목록에 없는 코드면 기본 상품.
  const [searchParams] = useSearchParams();
  const [pickedCode, setProductCode] = useState(searchParams.get("product") ?? "CREDIT_LOAN");
  const productCode = products.data && !products.data.some(p => p.code === pickedCode) ? "CREDIT_LOAN" : pickedCode;
  const [amount, setAmount] = useState<number | null>(10_000_000);
  const [termMonths, setTermMonths] = useState(12);
  const [method, setMethod] = useState<RepaymentMethod>("EQUAL_PAYMENT");
  const [paymentDay, setPaymentDay] = useState(15);
  const [autoDebit, setAutoDebit] = useState(true);
  const [purpose, setPurpose] = useState("");
  const [vehicleDesc, setVehicleDesc] = useState("");
  const [vehicleValue, setVehicleValue] = useState<number | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const product = products.data?.find(p => p.code === productCode) ?? null;
  /** 상품을 바꾸면 그 상품이 허용하는 기간·방식으로 맞춘다. */
  const chooseProduct = (code: string) => {
    setProductCode(code);
    const next = products.data?.find(p => p.code === code);
    if (!next) return;
    if (!next.allowedTerms.includes(termMonths)) setTermMonths(next.allowedTerms[0]);
    if (!next.allowedMethods.includes(method)) setMethod(next.allowedMethods[0]);
  };

  const validateConditions = (): boolean => {
    const next: Record<string, string> = {};
    if (!product) next.product = "상품을 골라요.";
    if (amount === null || amount <= 0) next.amount = "신청 금액을 넣어요.";
    else if (product && amount < product.minAmount) next.amount = `${product.name}은 ${formatNumber(product.minAmount)}원부터 신청할 수 있어요.`;
    else if (product?.maxAmount && amount > product.maxAmount) next.amount = `${product.name}은 ${formatNumber(product.maxAmount)}원까지 신청할 수 있어요.`;
    // WP23: 담보 한도는 상품별 LTV(자동차 할부 90%, 중고차 할부 70%)로 계산한다.
    const ltv = product?.ltvRate ?? 0;
    if (product?.requiresCollateral && (vehicleValue === null || vehicleValue <= 0)) next.vehicleValue = "담보 상품은 차량가(감정가)가 있어야 해요.";
    if (product?.requiresCollateral && amount !== null && vehicleValue !== null && amount > Math.floor((vehicleValue * ltv) / 100)) next.amount = `차량가의 ${ltv}%인 ${formatNumber(Math.floor((vehicleValue * ltv) / 100))}원까지만 신청할 수 있어요.`;
    if (purpose.length > 100) next.purpose = "용도는 100자까지예요.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const request: ApplicationRequest | null = product && amount !== null ? {
    productCode: product.code, requestedAmount: amount, termMonths, repaymentMethod: method, paymentDay, autoDebit,
    purpose: purpose || undefined, collateral: product.requiresCollateral ? { description: vehicleDesc || "차량", appraisedValue: vehicleValue ?? 0 } : null,
  } : null;

  const submit = async () => {
    if (!request) return;
    setSubmitting(true); setSubmitError("");
    try {
      const app = await sandboxApi.apply(request);
      navigate(`/sandbox/applications/${app.id}`);
    } catch (err) {
      setSubmitError(errorMessage(err, "신청을 접수하지 못했어요. 조건을 확인하고 다시 시도해요."));
      setSubmitting(false);
    }
  };

  const businessDate = summary.data?.businessDate;

  return (
    <>
      <SubPageHeader
        section="sandbox"
        current="/sandbox/apply"
        title="대출 신청"
        description="상품을 고르고 금액·기간·상환 방식·납입일을 정하면 접수와 동시에 규칙 심사가 끝나요. 결과 화면에서 금리·한도 근거를 보고 승인이면 실행해 계약을 만들어요."
        meta={businessDate ? <>신청일 = 영업일 {formatDate(businessDate)} · 실행하면 그날이 대출 실행일이 돼요</> : undefined}
      />
      <main className="page-main sandbox">
        {summary.error ? <LoadError error={summary.error} onRetry={summary.reload} /> : products.error ? <LoadError error={products.error} onRetry={products.reload} /> : !summary.data || !products.data ? <Loading message="상품과 프로필을 불러오고 있어요" minHeight={300} /> : !summary.data.profile ? (
          <EmptyState title="가상 고객 프로필이 아직 없어요" description="심사에는 소득·부채·신용점수가 필요해요. 프로필을 먼저 만들고 돌아와요." action={{ to: "/sandbox/profile", label: "프로필 만들기" }} />
        ) : (
          <div className="page-grid">
            <div className="apply">
              <Stepper steps={STEPS} activeIndex={step} />

              {step === 0 && (
                <fieldset className="apply-step" aria-describedby="apply-step1-hint">
                  <legend>1단계 · 상품 선택</legend>
                  <p id="apply-step1-hint" className="muted">모든 상품이 교육용 가정값이에요. 담보 상품은 차량가 × LTV까지만, 원리금균등만 가능해요. 상품별 조건과 대표 예시는 <Link to="/products">상품 안내</Link>에서 볼 수 있어요.</p>
                  <div className="table-scroll">
                    <table className="table apply-products">
                      <caption>상품 {products.data.length}개<span className="table-caption-note">선택 칸의 라디오를 고르면 아래 조건 입력이 그 상품이 허용하는 기간·상환 방식으로 맞춰진다.</span></caption>
                      <thead><tr><th scope="col">선택</th><th scope="col">상품</th><th scope="col">금액 범위</th><th scope="col">기간</th><th scope="col" className="num">기준금리</th><th scope="col">상환 방식</th><th scope="col" className="num">중도상환수수료</th></tr></thead>
                      <tbody>
                        {products.data.map(p => (
                          <tr key={p.code} className={p.code === productCode ? "is-selected" : undefined}>
                            <td className="apply-pick"><label className="apply-pick-label"><input type="radio" name="product" id={`product-${p.code}`} value={p.code} checked={p.code === productCode} onChange={() => chooseProduct(p.code)} aria-label={`${p.name} 고르기`} /></label></td>
                            <th scope="row"><label htmlFor={`product-${p.code}`}>{p.name}</label><span className="admin-sub faint">{p.description}</span></th>
                            <td>{formatNumber(p.minAmount)}원 ~ {p.maxAmount ? `${formatNumber(p.maxAmount)}원` : `차량가 ${p.ltvRate ?? 0}%`}</td>
                            <td>{p.allowedTerms.join("·")}회</td>
                            <td className="num">{pct(p.baseRate)}</td>
                            <td>{p.allowedMethods.map(m => METHOD_LABEL[m]).join(" · ")}</td>
                            <td className="num">{pct(p.prepaymentFeeRate)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="form-actions"><button type="button" className="btn btn-primary" onClick={() => setStep(1)}>조건 입력으로 <Icon name="next" size={16} /></button></div>
                </fieldset>
              )}

              {step === 1 && product && (
                <fieldset className="apply-step">
                  <legend>2단계 · 조건 입력 — {product.name}</legend>
                  <div className="calc-fields">
                    <MoneyInput label="신청 금액" value={amount} onChange={setAmount} required error={errors.amount} hint={`${formatNumber(product.minAmount)}원 ~ ${product.maxAmount ? `${formatNumber(product.maxAmount)}원` : `차량가 ${product.ltvRate ?? 0}%`}`} />
                    <SelectField label="기간" value={termMonths} options={product.allowedTerms.map(t => ({ value: t, label: `${t}회` }))} onChange={setTermMonths} />
                    <SelectField label="상환 방식" value={method} options={product.allowedMethods.map(m => ({ value: m, label: METHOD_LABEL[m] }))} onChange={setMethod} />
                    <SelectField label="납입일" value={paymentDay} options={PAYMENT_DAY_OPTIONS} onChange={setPaymentDay} hint="1회차는 실행일 다음 달의 이 날. 토·일이면 다음 월요일" />
                    {product.requiresCollateral && (
                      <>
                        <MoneyInput label="차량가(감정가)" value={vehicleValue} onChange={setVehicleValue} required error={errors.vehicleValue} hint={`한도 = 차량가 × ${product.ltvRate ?? 0}%`} />
                        <div className="field">
                          <label className="field-label" htmlFor="apply-vehicle">차량 설명<span className="optional">(선택)</span></label>
                          <input id="apply-vehicle" className="field-input" type="text" maxLength={100} value={vehicleDesc} onChange={event => setVehicleDesc(event.target.value)} />
                        </div>
                      </>
                    )}
                    <div className="field">
                      <label className="field-label" htmlFor="apply-purpose">용도<span className="optional">(선택)</span></label>
                      <input id="apply-purpose" className="field-input" type="text" maxLength={100} value={purpose} onChange={event => setPurpose(event.target.value)} aria-invalid={errors.purpose ? true : undefined} />
                      {errors.purpose && <p className="field-error" role="alert">{errors.purpose}</p>}
                    </div>
                    <CheckField label="자동이체 신청(금리 우대 0.20%p)" hint="납입일 일마감에 결제계좌에서 자동으로 빠져나가요. 잔액이 모자라면 한 푼도 빼지 않고 연체가 돼요. 끄면 납입일에 직접 상환해야 해요." checked={autoDebit} onChange={setAutoDebit} />
                  </div>
                  <div className="form-actions">
                    <button type="button" className="btn btn-secondary" onClick={() => setStep(0)}><Icon name="prev" size={16} /> 상품 선택으로</button>
                    <button type="button" className="btn btn-primary" onClick={() => { if (validateConditions()) setStep(2); }}>확인으로 <Icon name="next" size={16} /></button>
                  </div>
                </fieldset>
              )}

              {step === 2 && product && request && (
                <section className="apply-step" aria-labelledby="apply-confirm-title">
                  <h2 id="apply-confirm-title">3단계 · 확인·신청</h2>
                  <table className="table apply-confirm">
                    <caption>신청 내용 · 접수하면 바로 자동 심사가 끝나요</caption>
                    <tbody>
                      <tr><th scope="row">상품</th><td>{product.name}</td></tr>
                      <tr><th scope="row">신청 금액</th><td><Money value={request.requestedAmount} strong /></td></tr>
                      <tr><th scope="row">기간 · 상환 방식</th><td>{request.termMonths}회 · {METHOD_LABEL[request.repaymentMethod]}</td></tr>
                      <tr><th scope="row">납입일</th><td>매월 {request.paymentDay}일</td></tr>
                      <tr><th scope="row">자동이체</th><td>{request.autoDebit ? "신청(우대 0.20%p)" : "신청 안 함 — 납입일에 직접 상환"}</td></tr>
                      {request.collateral && <tr><th scope="row">담보</th><td>{request.collateral.description} · 차량가 <Money value={request.collateral.appraisedValue} /></td></tr>}
                      {request.purpose && <tr><th scope="row">용도</th><td>{request.purpose}</td></tr>}
                      <tr><th scope="row">심사에 쓰는 프로필</th><td>신용점수 {summary.data.profile.creditScore}점 · 연소득 <Money value={summary.data.profile.annualIncome} /> · 기존 연 원리금 <Money value={summary.data.profile.existingAnnualDebtService} /></td></tr>
                    </tbody>
                  </table>
                  {submitError && <p className="form-error" role="alert">{submitError}</p>}
                  <div className="form-actions">
                    <button type="button" className="btn btn-secondary" disabled={submitting} onClick={() => setStep(1)}><Icon name="prev" size={16} /> 조건 수정</button>
                    <button type="button" className="btn btn-primary" disabled={submitting} onClick={submit}>{submitting ? "접수하고 심사하고 있어요…" : "신청하기"}</button>
                  </div>
                </section>
              )}
            </div>

            <aside aria-label="안내">
              <div className="panel">
                <h3>신청 뒤에는</h3>
                <ol className="sandbox-steps">
                  <li>자격 → 금리 → 한도 → 결정 순서로 자동 심사</li>
                  <li>승인이면 "실행" → 계약 생성, 원금이 결제계좌에 입금</li>
                  <li>조건부 승인이면 제안 한도로 수락하거나 취소</li>
                  <li>거절이면 사유 코드와 근거 표 확인</li>
                </ol>
              </div>
              <div className="panel panel-soft">
                <h3>예시 11 조건</h3>
                <p className="muted">신용대출 10,000,000원 · 12회 · 원리금균등 · 납입일 15일 · 자동이체. 820점 프로필이면 7.70%로 즉시 승인이에요.</p>
                <Link to="/calculators/screening" className="panel-link">심사 시뮬레이터에서 먼저 돌려 보기 <Icon name="next" size={16} /></Link>
              </div>
            </aside>
          </div>
        )}
      </main>
    </>
  );
}
