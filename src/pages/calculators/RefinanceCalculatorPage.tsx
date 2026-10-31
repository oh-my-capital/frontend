import { useState, type CSSProperties, type FormEvent } from "react";
import { Link } from "react-router-dom";
import type { RepaymentMethod } from "../../api/types";
import { refinanceApi, type RefinanceRequest, type RefinanceResult } from "../../api/refinance";
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
import { DateField, NumberField, SelectField } from "./parts/fields";
import { METHOD_LABEL, METHODS } from "./parts/labels";
import RefinanceSavingChart from "./parts/RefinanceSavingChart";
import { RefinanceCompareTable, RefinanceRowsTable } from "./parts/RefinanceTables";
import "../../styles/refinance.css";

/** 기본값은 계산 예시 14(기존 2,000만 원 · 15.90% · 잔존 24회 → 9.90% · 24회 · 부대비용 15만 원, 2026-07-15). */
const DEFAULTS: RefinanceRequest = {
  existing: { balance: 20_000_000, annualRate: 15.9, remainingInstallments: 24, repaymentMethod: "EQUAL_PAYMENT", prepaymentFeeRate: 0.7, startDate: "2025-07-15" },
  newLoan: { annualRate: 9.9, termMonths: 24, repaymentMethod: "EQUAL_PAYMENT", upfrontCost: 150_000 },
  refinanceDate: "2026-07-15",
};
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const methodOptions = METHODS.map(m => ({ value: m, label: METHOD_LABEL[m] }));

/** 판정 문장: 비용 회수 회차·순이익·월 납입 변화. */
function verdictSentence(r: RefinanceResult): string {
  const monthly = r.monthlyPaymentDifference > 0 ? ` 첫 회 납입액은 ${formatNumber(r.monthlyPaymentDifference)}원 줄어요.`
    : r.monthlyPaymentDifference < 0 ? ` 첫 회 납입액은 ${formatNumber(-r.monthlyPaymentDifference)}원 늘어요.` : " 첫 회 납입액은 같아요.";
  if (r.beneficial) {
    return `갈아타기 비용 ${formatNumber(r.cost.total)}원을 ${r.breakevenInstallment}회차에 회수하고, 남은 기간 이자를 ${formatNumber(r.interestSaving)}원 아껴 순이익은 ${formatNumber(r.netBenefit)}원이에요.${monthly}`;
  }
  const loss = `새 대출 이자와 갈아타기 비용을 합하면 기존 대출을 유지할 때보다 ${formatNumber(-r.netBenefit)}원 더 들어요.`;
  if (r.breakevenInstallment !== null) return `${r.breakevenInstallment}회차에 비용을 회수하지만 새 기간이 길어 뒤 회차 이자가 더 붙어요. ${loss}${monthly}`;
  return `${loss}${monthly}`;
}

/**
 * 대환대출 비교(S-170, FR-33): 기존·새 대출 입력 나란히 → 판정 + 지표 줄(비용·절감·순이익·손익분기) →
 * 누적 절감 vs 비용 그림(손익분기 표시) → 두 대출 비교 표 → 회차별 비교 표 → Disclosure.
 * 계산은 POST /calculators/refinance 한 번. 수수료 공식·손익분기 정의는 business-rules WP17 절.
 */
export default function RefinanceCalculatorPage() {
  const [balance, setBalance] = useState<number | null>(DEFAULTS.existing.balance);
  const [oldRate, setOldRate] = useState<number | null>(DEFAULTS.existing.annualRate);
  const [remaining, setRemaining] = useState<number | null>(DEFAULTS.existing.remainingInstallments);
  const [oldMethod, setOldMethod] = useState<RepaymentMethod>(DEFAULTS.existing.repaymentMethod);
  const [feeRate, setFeeRate] = useState<number | null>(DEFAULTS.existing.prepaymentFeeRate);
  const [startDate, setStartDate] = useState(DEFAULTS.existing.startDate);
  const [newRate, setNewRate] = useState<number | null>(DEFAULTS.newLoan.annualRate);
  const [term, setTerm] = useState<number | null>(DEFAULTS.newLoan.termMonths);
  const [newMethod, setNewMethod] = useState<RepaymentMethod>(DEFAULTS.newLoan.repaymentMethod);
  const [upfront, setUpfront] = useState<number | null>(DEFAULTS.newLoan.upfrontCost);
  const [refinanceDate, setRefinanceDate] = useState(DEFAULTS.refinanceDate);
  const [submitted, setSubmitted] = useState<RefinanceRequest | null>(null);
  const [result, setResult] = useState<RefinanceResult | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(false);
  const [fieldError, setFieldError] = useState<Record<string, string>>({});

  const run = async (req: RefinanceRequest) => {
    setSubmitted(req); setLoading(true); setError(null);
    try { setResult(await refinanceApi.refinance(req)); } catch (err) { setError(err); } finally { setLoading(false); }
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const errors: Record<string, string> = {};
    if (balance === null || balance < 1 || balance > 1_000_000_000) errors.balance = "잔액은 1원 이상 10억 원 이하로 넣어요.";
    if (oldRate === null || oldRate < 0 || oldRate > 20) errors.oldRate = "연이율은 0~20%예요(최고금리 20%).";
    if (remaining === null || !Number.isInteger(remaining) || remaining < 1 || remaining > 120) errors.remaining = "잔존 회차는 1~120회 사이의 정수예요.";
    if (feeRate === null || feeRate < 0 || feeRate > 10) errors.feeRate = "수수료율은 0~10%예요.";
    if (!DATE.test(startDate)) errors.startDate = "실행일을 날짜로 넣어요.";
    if (newRate === null || newRate < 0 || newRate > 20) errors.newRate = "연이율은 0~20%예요(최고금리 20%).";
    if (term === null || !Number.isInteger(term) || term < 1 || term > 120) errors.term = "기간은 1~120회 사이의 정수예요.";
    if (upfront === null || upfront < 0 || upfront > 100_000_000) errors.upfront = "부대비용은 0원 이상 1억 원 이하로 넣어요. 없으면 0이에요.";
    if (!DATE.test(refinanceDate)) errors.refinanceDate = "갈아타는 날을 날짜로 넣어요.";
    else if (DATE.test(startDate) && refinanceDate < startDate) errors.refinanceDate = "갈아타는 날은 기존 대출 실행일 이후여야 해요.";
    setFieldError(errors);
    if (Object.keys(errors).length) return;
    run({
      existing: { balance: balance!, annualRate: oldRate!, remainingInstallments: remaining!, repaymentMethod: oldMethod, prepaymentFeeRate: feeRate!, startDate },
      newLoan: { annualRate: newRate!, termMonths: term!, repaymentMethod: newMethod, upfrontCost: upfront! },
      refinanceDate,
    });
  };

  return (
    <>
      <SubPageHeader
        section="calculators"
        current="/calculators/refinance"
        title="대환대출 비교"
        description="지금 대출과 갈아탈 대출의 조건을 넣으면 갈아타는 데 드는 비용(중도상환수수료 + 부대비용)과 남은 기간 이자 차이를 견줘 순이익과 비용을 회수하는 회차(손익분기)를 계산해요."
        meta={<>기본값은 계산 예시 14(잔액 2,000만 원 · 연 15.90% · 잔존 24회 → 연 9.90% · 24회 · 부대비용 15만 원)</>}
      />
      <main className="page-main calc refi">
        <div className="page-grid">
          <div className="calc-main">
            <form className="calc-form panel" onSubmit={submit} aria-labelledby="refi-form-title" noValidate>
              <h2 id="refi-form-title">지금 대출과 갈아탈 대출</h2>
              <div className="refi-sides">
                <fieldset className="calc-fieldset">
                  <legend>지금 대출(기존)</legend>
                  <div className="calc-fields">
                    <MoneyInput label="잔액" value={balance} onChange={setBalance} required error={fieldError.balance} hint="갈아타는 날 납입 직후 남은 원금" />
                    <RateInput label="연이율" value={oldRate} onChange={setOldRate} required error={fieldError.oldRate} />
                    <NumberField label="잔존 회차" value={remaining} onChange={setRemaining} min={1} max={120} unit="회" error={fieldError.remaining} />
                    <SelectField label="상환 방식" value={oldMethod} options={methodOptions} onChange={setOldMethod} />
                    <RateInput label="중도상환수수료율" value={feeRate} onChange={setFeeRate} required max={10} error={fieldError.feeRate} hint="신용대출 0.70%, 자동차 할부 1.50%" />
                    <DateField label="실행일" value={startDate} onChange={setStartDate} error={fieldError.startDate} hint="3년이 지나면 수수료 면제" />
                  </div>
                </fieldset>
                <fieldset className="calc-fieldset">
                  <legend>갈아탈 대출(새)</legend>
                  <div className="calc-fields">
                    <RateInput label="연이율" value={newRate} onChange={setNewRate} required error={fieldError.newRate} />
                    <NumberField label="기간" value={term} onChange={setTerm} min={1} max={120} unit="회" error={fieldError.term} />
                    <SelectField label="상환 방식" value={newMethod} options={methodOptions} onChange={setNewMethod} />
                    <MoneyInput label="부대비용" value={upfront} onChange={setUpfront} required error={fieldError.upfront} hint="인지세·보증료 등. 없으면 0" />
                  </div>
                  <p className="refi-note">새 대출 원금은 기존 잔액과 같다고 봐요. 수수료와 부대비용은 원금에 얹지 않고 갈아탈 때 따로 내요.</p>
                </fieldset>
              </div>
              <div className="calc-fields refi-date">
                <DateField label="갈아타는 날" value={refinanceDate} onChange={setRefinanceDate} error={fieldError.refinanceDate} hint="기존 대출 납입일 직후로 봐요(경과이자 0)" />
              </div>
              <div className="form-actions">
                <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? "비교하고 있어요…" : "비교하기"}</button>
              </div>
            </form>

            <section className="calc-results" aria-live="polite">
              {!!error && <LoadError error={error} onRetry={() => submitted && run(submitted)} />}
              {!error && !result && (loading ? <Loading message="두 대출의 회차표를 만들고 있어요" minHeight={200} /> : (
                <EmptyState
                  title="아직 비교하지 않았어요"
                  description={'위 조건으로 "비교하기"를 누르면 갈아타기 비용, 이자 절감, 순이익과 손익분기 회차가 여기에 나와요. 중도상환수수료가 왜 붙는지 궁금하면 개념 글을 먼저 읽어요.'}
                  action={{ to: "/learn/prepayment-and-fee", label: "개념 12 · 중도상환과 수수료 읽기" }}
                />
              ))}
              {result && (
                <div className="stack calc-stack">
                  <div className="refi-verdict">
                    <p className="refi-verdict-line">
                      <StatusChip label={result.beneficial ? "갈아타면 이득" : "유지가 유리"} tone={result.beneficial ? "good" : "warn"} />
                      <span>{verdictSentence(result)}</span>
                    </p>
                    <dl className="figure-row" style={{ "--figure-cols": 4 } as CSSProperties}>
                      <div><dt>갈아타기 비용</dt><dd><Money value={result.cost.total} /><small>수수료 {formatNumber(result.cost.prepaymentFee)}{result.cost.feeWaived ? "(면제)" : ""} + 부대비용 {formatNumber(result.cost.upfrontCost)}</small></dd></div>
                      <div><dt>이자 절감</dt><dd className={result.interestSaving < 0 ? "danger" : undefined}><Money value={result.interestSaving} /></dd></div>
                      <div><dt>순이익</dt><dd className={result.netBenefit > 0 ? "accent" : "danger"}><Money value={result.netBenefit} /><small>{result.netBenefit > 0 ? "이득" : "손해"}</small></dd></div>
                      <div><dt>손익분기 회차</dt><dd>{result.breakevenInstallment !== null ? <>{result.breakevenInstallment}<span className="money-unit">회차</span></> : "없음"}</dd></div>
                    </dl>
                  </div>
                  <RefinanceSavingChart rows={result.rows} cost={result.cost.total} breakeven={result.breakevenInstallment} />
                  <RefinanceCompareTable result={result} />
                  <RefinanceRowsTable result={result} />
                  <Disclosure data={result.disclosure} />
                </div>
              )}
            </section>
          </div>

          <aside aria-label="계산식 안내">
            <div className="panel">
              <h3>갈아탈지 이렇게 판단해요</h3>
              <dl className="def-list calc-howto">
                <div><dt>비용</dt><dd>기존 대출 중도상환수수료(잔액 × 수수료율 × 잔존일수 ÷ 대출기간 일수) + 새 대출 부대비용.</dd></div>
                <div><dt>절감</dt><dd>기존을 유지할 때 남은 총이자 − 새 대출 총이자.</dd></div>
                <div><dt>순이익</dt><dd>절감 − 비용. 0보다 커야 갈아타는 쪽이 낫다.</dd></div>
                <div><dt>손익분기</dt><dd>회차별 이자 절감을 더해 비용 이상이 되는 첫 회차. 새 기간이 길면 뒤에서 다시 줄 수 있어 판단은 순이익으로 한다.</dd></div>
              </dl>
            </div>
            <div className="panel panel-soft">
              <h3>이어서</h3>
              <ul className="calc-links">
                <li><Link to="/learn/prepayment-and-fee">개념 12 · 중도상환과 수수료</Link></li>
                <li><Link to="/calculators/prepayment">기존 대출 중도상환 견적 보기</Link></li>
                <li><Link to="/calculators/dsr">갈아탄 뒤 DSR 계산하기</Link></li>
              </ul>
            </div>
          </aside>
        </div>
        <nav className="next-actions" aria-label="다음 행동">
          <Link to="/calculators/dsr">DSR 계산기 <Icon name="next" size={16} /></Link>
          <Link to="/calculators/schedule">새 대출 조건의 회차표 보기 <Icon name="next" size={16} /></Link>
        </nav>
      </main>
    </>
  );
}
