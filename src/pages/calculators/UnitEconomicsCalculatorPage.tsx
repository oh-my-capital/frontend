import { useState, type CSSProperties, type FormEvent } from "react";
import { Link } from "react-router-dom";
import type { RepaymentMethod } from "../../api/types";
import { unitEconomicsApi, type UnitEconomicsRequest, type UnitEconomicsResult } from "../../api/unitEconomics";
import DataTable, { type Column } from "../../components/DataTable";
import Disclosure from "../../components/Disclosure";
import Icon from "../../components/Icon";
import LoadError from "../../components/LoadError";
import Loading from "../../components/Loading";
import Money from "../../components/Money";
import MoneyInput from "../../components/MoneyInput";
import RateInput from "../../components/RateInput";
import StatusChip from "../../components/StatusChip";
import SubPageHeader from "../../components/SubPageHeader";
import { formatNumber, formatRate } from "../../lib/format";
import { NumberField, SelectField } from "./parts/fields";
import { METHOD_LABEL, METHODS } from "./parts/labels";
import { useLoad } from "./parts/useLoad";
import UnitEconomicsSensitivityTable from "./UnitEconomicsSensitivityTable";
import UnitEconomicsWaterfall from "./UnitEconomicsWaterfall";
import "../../styles/refinance.css";
import "../../styles/unit-economics.css";

/**
 * 첫 화면 값 = 계산 예시 20(1,000만 원 · 36회 · 연 14% · 원리금균등). 가정 칸의 값은 규칙 세트 unitEconomics 기본값과 같은
 * 교육용 가정값이며, 계산 결과의 assumptions(근거 메모)로 다시 보여 준다.
 */
const DEFAULT_REQUEST: UnitEconomicsRequest = {
  principal: 10_000_000, termMonths: 36, annualRate: 14, repaymentMethod: "EQUAL_PAYMENT",
  fundingRate: 4.5, annualLossRate: 4, annualOpexRate: 2.5, acquisitionFeeRate: 1, leverage: 8,
};
const methodOptions = METHODS.map(m => ({ value: m, label: METHOD_LABEL[m] }));

function verdict(r: UnitEconomicsResult): string {
  const annual = r.items.find(i => i.code === "PRETAX_PROFIT")?.annualAmount ?? 0;
  if (r.pretaxProfit < 0) {
    return `이 조건이면 회사는 이 대출로 기간 동안 ${formatNumber(Math.abs(r.pretaxProfit))}원 손해를 봐요(ROA ${formatRate(r.roa)}). 연 대손율이 손익분기 ${formatRate(r.breakevenLossRate)}보다 높거나 금리가 비용을 덮지 못해요.`;
  }
  return `이 조건이면 회사는 기간 동안 세전 ${formatNumber(r.pretaxProfit)}원(연 ${formatNumber(annual)}원)을 벌어요. 평잔의 연 ${formatRate(r.roa)}이고, 연 대손율이 ${formatRate(r.breakevenLossRate)}를 넘으면 손해로 바뀌어요.`;
}

/**
 * 대출 한 건의 손익(S-330, FR-54): 대출 조건 + 회사 가정 → 판정 + 지표 줄(ROA·ROE·손익분기·최고금리 한계) →
 * 손익 워터폴 → 항목 표 → 민감도 표 → Disclosure. 계산은 POST /calculators/unit-economics 한 번(business-rules WP33 §33.2).
 */
export default function UnitEconomicsCalculatorPage() {
  const [principal, setPrincipal] = useState<number | null>(DEFAULT_REQUEST.principal);
  const [term, setTerm] = useState<number | null>(DEFAULT_REQUEST.termMonths);
  const [rate, setRate] = useState<number | null>(DEFAULT_REQUEST.annualRate);
  const [method, setMethod] = useState<RepaymentMethod>(DEFAULT_REQUEST.repaymentMethod);
  const [funding, setFunding] = useState<number | null>(DEFAULT_REQUEST.fundingRate ?? null);
  const [loss, setLoss] = useState<number | null>(DEFAULT_REQUEST.annualLossRate ?? null);
  const [opex, setOpex] = useState<number | null>(DEFAULT_REQUEST.annualOpexRate ?? null);
  const [acquisition, setAcquisition] = useState<number | null>(DEFAULT_REQUEST.acquisitionFeeRate ?? null);
  const [leverage, setLeverage] = useState<number | null>(DEFAULT_REQUEST.leverage ?? null);
  const [submitted, setSubmitted] = useState<UnitEconomicsRequest>(DEFAULT_REQUEST);
  const [fieldError, setFieldError] = useState<Record<string, string>>({});
  const { data: result, error, loading, reload } = useLoad(signal => unitEconomicsApi.calculate(submitted, signal), [submitted]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const errors: Record<string, string> = {};
    if (principal === null || principal < 1_000_000 || principal > 500_000_000) errors.principal = "대출금은 100만 원 이상 5억 원 이하로 넣어요.";
    if (term === null || !Number.isInteger(term) || term < 1 || term > 120) errors.term = "기간은 1~120회 사이의 정수예요.";
    if (rate === null || rate < 0 || rate > 20) errors.rate = "연이율은 0~20%예요(법정 최고금리 20%).";
    if (funding !== null && (funding < 0 || funding > 20)) errors.funding = "조달금리는 0~20%예요.";
    if (loss !== null && (loss < 0 || loss > 50)) errors.loss = "연 대손율은 0~50%예요.";
    if (opex !== null && (opex < 0 || opex > 20)) errors.opex = "연 판관비율은 0~20%예요.";
    if (acquisition !== null && (acquisition < 0 || acquisition > 10)) errors.acquisition = "모집수수료율은 0~10%예요.";
    if (leverage !== null && (leverage < 1 || leverage > 30)) errors.leverage = "레버리지는 1~30배예요.";
    setFieldError(errors);
    if (Object.keys(errors).length) return;
    // 비운 가정 칸은 보내지 않아 서버가 규칙 세트 기본값으로 채운다(응답 defaultsApplied).
    setSubmitted({
      principal: principal!, termMonths: term!, annualRate: rate!, repaymentMethod: method,
      fundingRate: funding, annualLossRate: loss, annualOpexRate: opex, acquisitionFeeRate: acquisition, leverage,
    });
  };

  return (
    <>
      <SubPageHeader
        section="calculators"
        current="/calculators/unit-economics"
        title="대출 한 건의 손익"
        description="캐피탈 회사가 대출 한 건으로 얼마를 버는지 계산해요. 받는 이자에서 돈을 빌려 온 비용(조달), 돌려받지 못할 돈(대손), 운영비(판관비), 모집 비용을 빼면 세전이익이 남아요."
        meta={<>기본값은 계산 예시 20(1,000만 원 · 36회 · 연 14% · 원리금균등) · 회사 가정은 모두 교육용 가정값이에요</>}
      />
      <main className="page-main calc unit-economics">
        <div className="page-grid">
          <div className="calc-main">
            <form className="calc-form panel" onSubmit={submit} aria-labelledby="ue-form-title" noValidate>
              <h2 id="ue-form-title">대출 조건과 회사 가정</h2>
              <fieldset className="calc-fieldset">
                <legend>대출 조건</legend>
                <div className="calc-fields">
                  <MoneyInput label="대출금" value={principal} onChange={setPrincipal} required error={fieldError.principal} />
                  <NumberField label="기간" value={term} onChange={setTerm} min={1} max={120} unit="회" error={fieldError.term} />
                  <RateInput label="연이율" value={rate} onChange={setRate} required error={fieldError.rate} />
                  <SelectField label="상환 방식" value={method} options={methodOptions} onChange={setMethod} />
                </div>
              </fieldset>
              <fieldset className="calc-fieldset">
                <legend>회사 가정 <StatusChip label="교육용 가정값" tone="warn" /></legend>
                <p className="field-hint ue-assume-hint">칸을 비우면 규칙 세트 기본값으로 계산해요. 실제 캐피탈 회사의 수치가 아니에요.</p>
                <div className="calc-fields">
                  <RateInput label="조달금리" value={funding} onChange={setFunding} error={fieldError.funding} />
                  <RateInput label="연 대손율" value={loss} onChange={setLoss} max={50} error={fieldError.loss} />
                  <RateInput label="연 판관비율" value={opex} onChange={setOpex} error={fieldError.opex} />
                  <RateInput label="모집수수료율(선지급)" value={acquisition} onChange={setAcquisition} max={10} error={fieldError.acquisition} />
                  <NumberField label="레버리지" value={leverage} onChange={setLeverage} required={false} min={1} max={30} step={0.5} unit="배"
                    hint={leverage ? `자산 ÷ 자기자본. 자기자본비율 ${formatRate(100 / leverage)}와 같아요` : "자산 ÷ 자기자본"} error={fieldError.leverage} />
                </div>
              </fieldset>
              <div className="form-actions">
                <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? "계산하고 있어요…" : "손익 계산하기"}</button>
              </div>
            </form>

            <section className="calc-results" aria-live="polite">
              {!!error && <LoadError error={error} onRetry={reload} />}
              {!error && !result && loading && <Loading message="회차표를 만들고 비용을 빼고 있어요" minHeight={200} />}
              {result && (
                <div className="stack calc-stack">
                  <div className="refi-verdict">
                    <p className="refi-verdict-line">
                      <StatusChip label={result.pretaxProfit >= 0 ? "이익" : "손해"} tone={result.pretaxProfit >= 0 ? "good" : "danger"} />
                      <span>{verdict(result)}</span>
                    </p>
                    <dl className="figure-row" style={{ "--figure-cols": 4 } as CSSProperties}>
                      <div><dt>ROA(연환산)</dt><dd className={result.roa < 0 ? "danger" : undefined}>{formatRate(result.roa)}<small>세전이익 ÷ 평잔</small></dd></div>
                      <div><dt>세전 ROE</dt><dd>{formatRate(result.roe)}<small>ROA × 레버리지 {result.input.leverage.toFixed(2)}배</small></dd></div>
                      <div><dt>손익분기 대손율</dt><dd className="accent">{formatRate(result.breakevenLossRate)}<small>입력 {formatRate(result.input.annualLossRate)}</small></dd></div>
                      <div><dt>최고금리 {formatRate(result.rateCap.rateCap)}의 한계 대손율</dt><dd>{formatRate(result.rateCap.marginalLossRate)}<small>이보다 위험하면 빌려줄 수 없다</small></dd></div>
                    </dl>
                  </div>
                  <UnitEconomicsWaterfall items={result.items} />
                  <ItemTable result={result} />
                  <UnitEconomicsSensitivityTable result={result} />
                  <Disclosure data={result.disclosure} />
                </div>
              )}
            </section>
          </div>

          <aside aria-label="캐피탈의 수익 구조">
            <div className="panel">
              <h3>캐피탈은 리스크에 가격을 매기는 업</h3>
              <p className="ue-aside-lead">캐피탈은 예금을 받지 않아 회사채·차입으로 돈을 빌려 와 더 높은 금리로 빌려준다. 금리에는 빌려 온 값, 운영비, 그리고 돌려받지 못할 돈(예상 손실)이 들어 있다. 위험한 고객에게 금리가 높은 이유가 이 마지막 몫이다.</p>
              <dl className="def-list calc-howto">
                <div><dt>스프레드</dt><dd>연이율 − 조달금리. 이 계산에서는 {result ? `${result.spread.toFixed(2)}%p` : "—"}. 여기서 대손·판관비·모집비를 덮어야 이익이 남는다.</dd></div>
                <div><dt>대손비용</dt><dd>평균잔액 × 연 대손율 × 연수. 빌려준 돈 가운데 돌려받지 못할 것으로 보는 몫이다.</dd></div>
                <div><dt>손익분기 대손율</dt><dd>세전이익이 0이 되는 연 대손율. 고객군의 실제 대손율이 이보다 높으면 금리를 올리거나 빌려주지 않는다.</dd></div>
                <div><dt>최고금리의 한계</dt><dd>법정 최고금리를 받아도 덮을 수 있는 대손율에는 끝이 있다. 그보다 위험한 고객은 제도권 대출을 받기 어렵다.</dd></div>
              </dl>
            </div>
            {result && (
              <div className="panel panel-soft">
                <h3>기본 가정값과 근거</h3>
                <dl className="def-list ue-assumptions">
                  {result.assumptions.map(a => (
                    <div key={a.field}>
                      <dt>{a.label}</dt>
                      <dd><strong>{a.field === "leverage" ? `${a.value.toFixed(2)}배` : formatRate(a.value)}</strong> {a.note}</dd>
                    </div>
                  ))}
                </dl>
                {result.input.defaultsApplied.length > 0 && <p className="faint">이번 계산에서 기본값으로 채운 칸: {result.input.defaultsApplied.length}개</p>}
              </div>
            )}
            <div className="panel panel-soft">
              <h3>이어서</h3>
              <ul className="calc-links">
                <li><Link to="/calculators/screening">심사 시뮬레이터에서 밴드별 금리 보기</Link></li>
                <li><Link to="/calculators/schedule">같은 조건의 회차표 보기</Link></li>
                <li><Link to="/methodology">규칙 세트의 가정값·최고금리 보기</Link></li>
              </ul>
            </div>
          </aside>
        </div>
        <nav className="next-actions" aria-label="다음 행동">
          <Link to="/calculators/screening">심사 시뮬레이터 <Icon name="next" size={16} /></Link>
          <Link to="/calculators/schedule">상환 스케줄 <Icon name="next" size={16} /></Link>
        </nav>
      </main>
    </>
  );
}

function ItemTable({ result }: { result: UnitEconomicsResult }) {
  const columns: Column<UnitEconomicsResult["items"][number]>[] = [
    { key: "label", header: "항목", rowHeader: true, nowrap: true, render: i => i.label },
    { key: "lifetime", header: `기간 합계(${result.input.termMonths}회)`, numeric: true, render: i => <Money value={i.code === "INTEREST_INCOME" || i.code === "PRETAX_PROFIT" ? i.lifetimeAmount : -i.lifetimeAmount} strong={i.code === "PRETAX_PROFIT"} /> },
    { key: "annual", header: "연 금액", numeric: true, render: i => <Money value={i.code === "INTEREST_INCOME" || i.code === "PRETAX_PROFIT" ? i.annualAmount : -i.annualAmount} /> },
    { key: "ratio", header: "평잔 대비 연율", numeric: true, render: i => formatRate(i.ratio) },
  ];
  return (
    <DataTable
      caption="손익 항목"
      captionNote={`평균잔액 ${formatNumber(result.schedule.averageBalance)}원 · 총이자 ${formatNumber(result.schedule.totalInterest)}원${result.schedule.monthlyPayment ? ` · 월 납입 ${formatNumber(result.schedule.monthlyPayment)}원` : ""}. 비용은 음수로 적었다.`}
      columns={columns}
      rows={result.items}
      rowKey={i => i.code}
      scroll
      compact
    />
  );
}
