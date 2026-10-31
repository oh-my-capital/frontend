import { useCallback, useEffect, useRef, useState, type CSSProperties, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { autoFinanceApi, type AutoFinanceRequest, type AutoFinanceResponse } from "../../api/autoFinance";
import { ApiError } from "../../api/client";
import Disclosure from "../../components/Disclosure";
import EmptyState from "../../components/EmptyState";
import Icon from "../../components/Icon";
import LoadError from "../../components/LoadError";
import Loading from "../../components/Loading";
import Money from "../../components/Money";
import MoneyInput from "../../components/MoneyInput";
import { setDocumentTitle } from "../../components/PageTitle";
import RateInput from "../../components/RateInput";
import SubPageHeader from "../../components/SubPageHeader";
import { formatNumber } from "../../lib/format";
import "../../styles/auto-finance.css";
import AutoFinanceCompareTable, { MaturityOptionsTable } from "./parts/AutoFinanceCompareTable";
import AutoFinanceSpendChart from "./parts/AutoFinanceSpendChart";
import { AUTO_FINANCE_DESCRIPTION, AUTO_FINANCE_LABEL, AUTO_FINANCE_TERMS, AUTO_FINANCE_TYPES } from "./parts/autoFinanceLabels";
import { SelectField } from "./parts/fields";
import { pct } from "./parts/labels";

/** 기본값은 계산 예시 12(차량가 4,000만 · 선수금 400만 · 보증금 0 · 36개월 · 연 6.00% · 잔존가치율 45%). */
const DEFAULTS: AutoFinanceRequest = { vehiclePrice: 40_000_000, downPayment: 4_000_000, deposit: 0, termMonths: 36, annualRate: 6, residualValueRate: 45 };

type FieldKey = keyof AutoFinanceRequest;

function fromQuery(params: URLSearchParams): AutoFinanceRequest | null {
  if (!params.has("price")) return null;
  const n = (key: string, fallback: number) => { const v = Number(params.get(key)); return params.has(key) && Number.isFinite(v) ? v : fallback; };
  const rv = params.get("rv");
  return {
    vehiclePrice: n("price", DEFAULTS.vehiclePrice), downPayment: n("down", 0), deposit: n("deposit", 0),
    termMonths: n("term", DEFAULTS.termMonths), annualRate: n("rate", DEFAULTS.annualRate),
    residualValueRate: rv === null || rv === "" || !Number.isFinite(Number(rv)) ? null : Number(rv),
  };
}
function toQuery(req: AutoFinanceRequest): Record<string, string> {
  const q: Record<string, string> = { price: String(req.vehiclePrice), down: String(req.downPayment), deposit: String(req.deposit), term: String(req.termMonths), rate: String(req.annualRate) };
  if (req.residualValueRate !== null && req.residualValueRate !== undefined) q.rv = String(req.residualValueRate);
  return q;
}

/**
 * 자동차 금융 비교(S-160, FR-29): 입력 폼 → 핵심 수치 줄 → 네 방식 비교표 → 총 지출 구성 그림 → 만기 선택지 표 → 가정값 표 → Disclosure.
 * 계산은 POST /calculators/auto-finance 한 번으로 네 방식을 모두 받는다. 제출하면 입력을 URL 쿼리에 남겨 주소로 공유할 수 있다.
 */
export default function AutoFinanceCalculatorPage() {
  const [params, setParams] = useSearchParams();
  const initial = fromQuery(params) ?? DEFAULTS;
  const [vehiclePrice, setVehiclePrice] = useState<number | null>(initial.vehiclePrice);
  const [downPayment, setDownPayment] = useState<number | null>(initial.downPayment);
  const [deposit, setDeposit] = useState<number | null>(initial.deposit);
  const [termMonths, setTermMonths] = useState<number>(initial.termMonths);
  const [annualRate, setAnnualRate] = useState<number | null>(initial.annualRate);
  const [residualValueRate, setResidualValueRate] = useState<number | null>(initial.residualValueRate ?? null);
  const [request, setRequest] = useState<AutoFinanceRequest | null>(null);
  const [result, setResult] = useState<AutoFinanceResponse | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(false);
  const [fieldError, setFieldError] = useState<Partial<Record<FieldKey, string>>>({});

  const run = useCallback(async (req: AutoFinanceRequest) => {
    setRequest(req); setLoading(true); setError(null);
    try {
      setResult(await autoFinanceApi.compare(req));
    } catch (err) {
      // 서버가 규칙 세트 범위로 거절하면(400 VALIDATION) 필드 옆에 사유를 보여 준다.
      if (err instanceof ApiError && err.code === "VALIDATION" && err.details.length) {
        const errors: Partial<Record<FieldKey, string>> = {};
        for (const d of err.details) if (d.field && d.message) errors[d.field as FieldKey] = d.message;
        setFieldError(errors);
      }
      setResult(null);
      setError(err);
    } finally { setLoading(false); }
  }, []);
  // 주소에 입력이 있으면(공유 링크) 처음 한 번 바로 계산한다.
  const initialRequest = useRef(fromQuery(params));
  useEffect(() => { if (initialRequest.current) run(initialRequest.current); }, [run]);
  // 문서 제목 목록(PageTitle, WP15 소유)에 이 경로가 아직 없어 화면에서 직접 맞춘다.
  useEffect(() => { setDocumentTitle("자동차 금융 비교"); }, []);

  const validate = (): AutoFinanceRequest | null => {
    const errors: typeof fieldError = {};
    if (vehiclePrice === null || vehiclePrice < 10_000_000 || vehiclePrice > 200_000_000) errors.vehiclePrice = "차량가는 10,000,000원 이상 200,000,000원 이하로 넣어요.";
    if (downPayment === null || downPayment < 0) errors.downPayment = "선수금이 없으면 0을 넣어요.";
    else if (vehiclePrice !== null && downPayment >= vehiclePrice) errors.downPayment = "선수금은 차량가보다 작아야 해요.";
    if (deposit === null || deposit < 0) errors.deposit = "보증금이 없으면 0을 넣어요.";
    if (annualRate === null || annualRate < 0 || annualRate > 20) errors.annualRate = "연이율은 0~20% 사이예요(최고금리 20%).";
    if (residualValueRate !== null && (residualValueRate < 10 || residualValueRate > 70)) errors.residualValueRate = "잔존가치율은 10~70% 사이예요. 비우면 기간별 기본값을 써요.";
    setFieldError(errors);
    if (Object.keys(errors).length) return null;
    return { vehiclePrice: vehiclePrice!, downPayment: downPayment!, deposit: deposit!, termMonths, annualRate: annualRate!, residualValueRate };
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const req = validate();
    if (!req) return;
    setParams(toQuery(req), { replace: true });
    run(req);
  };

  const options = result?.options ?? [];
  const cheapest = options.find(o => o.type === result?.cheapestType) ?? null;
  const lowestMonthly = options.length ? options.reduce((min, o) => (o.monthlyPayment + o.monthlyUpkeep < min.monthlyPayment + min.monthlyUpkeep ? o : min), options[0]) : null;
  const costGap = options.length ? Math.max(...options.map(o => o.effectiveCost)) - Math.min(...options.map(o => o.effectiveCost)) : 0;
  const assumptions = result?.assumptions;

  return (
    <>
      <SubPageHeader
        section="calculators"
        current="/calculators/auto-finance"
        title="자동차 금융 비교"
        description="같은 차를 할부·금융리스·운용리스·장기렌트로 탈 때 월 부담·총 지출·만기 명의·만기 선택지·실질 비용이 어떻게 다른지 한 표에서 비교해요. 실질 비용은 총 지출에서 만기에 내 것으로 남는 차량 가치를 뺀 금액이에요."
        meta={request ? <>이 주소를 복사하면 같은 조건이 열려요 · 규칙 세트 {result?.ruleSetVersion ?? "v1"}</> : <>기본값은 계산 예시 12(4,000만 원 · 36개월 · 연 6.00% · 잔존가치율 45%)예요</>}
      />
      <main className="page-main calc af">
        <div className="page-grid">
          <div className="calc-main">
            <form className="calc-form panel" onSubmit={submit} aria-labelledby="af-form-title" noValidate>
              <h2 id="af-form-title">차량과 금융 조건</h2>
              <div className="calc-fields">
                <MoneyInput label="차량가" value={vehiclePrice} onChange={setVehiclePrice} required error={fieldError.vehiclePrice} hint="10,000,000~200,000,000원" />
                <SelectField label="기간" value={termMonths} options={AUTO_FINANCE_TERMS} onChange={setTermMonths} hint="12~60개월, 12개월 단위" />
                <MoneyInput label="선수금(선납금)" value={downPayment} onChange={setDownPayment} required error={fieldError.downPayment} hint="네 방식 모두 원금에서 뺀다. 없으면 0" />
                <MoneyInput label="보증금" value={deposit} onChange={setDeposit} required error={fieldError.deposit} hint="리스·렌트만. 만기에 돌려받거나 인수가에서 뺀다" />
                <RateInput label="연이율" value={annualRate} onChange={setAnnualRate} required error={fieldError.annualRate} hint="할부 금리. 리스·렌트는 방식별 가산을 더한다." />
                <RateInput label="잔존가치율" value={residualValueRate} onChange={setResidualValueRate} min={10} max={70} error={fieldError.residualValueRate} hint="비우면 규칙 세트의 기간별 기본값을 쓴다." />
              </div>
              <div className="form-actions">
                <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? "네 방식을 계산하고 있어요…" : "네 방식 비교하기"}</button>
                {request && <span className="faint">차량가 {formatNumber(request.vehiclePrice)}원 · {request.termMonths}개월 · 연 {pct(request.annualRate)}</span>}
              </div>
            </form>

            <section className="calc-results" aria-labelledby="af-results-title" aria-live="polite">
              <h2 id="af-results-title" className="sr-only">계산 결과</h2>
              {!!error && <LoadError error={error} onRetry={() => request && run(request)} />}
              {!error && !result && (loading ? <Loading message="네 방식을 계산하고 있어요" minHeight={200} /> : (
                <EmptyState
                  title="아직 계산하지 않았어요"
                  description={'위 조건으로 "네 방식 비교하기"를 누르면 비교표·총 지출 구성 그림·만기 선택지가 여기에 나와요. 리스가 무엇인지부터 짚고 싶다면 개념 글을 먼저 읽어요.'}
                  action={{ to: "/learn/lease-basics", label: "개념 4 · 리스의 소유권과 잔존가치 읽기" }}
                />
              ))}
              {result && cheapest && lowestMonthly && assumptions && (
                <div className="stack calc-stack">
                  <div>
                    <p className="calc-figure-head">
                      <strong>네 방식 요약</strong>
                      <span>차량가 {formatNumber(result.input.vehiclePrice)}원 · 선수금 {formatNumber(result.input.downPayment)}원 · 보증금 {formatNumber(result.input.deposit)}원 · {result.input.termMonths}개월 · 연 {pct(result.input.annualRate)}</span>
                    </p>
                    <dl className="figure-row" style={{ "--figure-cols": 4 } as CSSProperties}>
                      <div>
                        <dt>잔존가치(만기 차량 가치)</dt>
                        <dd><Money value={result.residualValue} /><small>잔존가치율 {pct(result.input.residualValueRate)}{result.input.residualValueRateDefaulted ? "(기간별 기본값)" : ""}</small></dd>
                      </div>
                      <div><dt>월 합계가 가장 작은 방식</dt><dd>{lowestMonthly.label}<small>{formatNumber(lowestMonthly.monthlyPayment + lowestMonthly.monthlyUpkeep)}원(유지비 포함)</small></dd></div>
                      <div><dt>실질 비용이 가장 작은 방식</dt><dd className="accent">{cheapest.label}<small>{formatNumber(cheapest.effectiveCost)}원</small></dd></div>
                      <div><dt>실질 비용 차이</dt><dd><Money value={costGap} /><small>가장 큰 방식 − 가장 작은 방식</small></dd></div>
                    </dl>
                  </div>

                  <AutoFinanceCompareTable result={result} />
                  <AutoFinanceSpendChart options={result.options} cheapestType={result.cheapestType} />
                  <MaturityOptionsTable result={result} />

                  <div className="table-scroll">
                    <table className="table af-assumptions">
                      <caption>
                        이 계산의 가정값
                        <span className="table-caption-note">규칙 세트 {result.ruleSetVersion}의 autoFinance 키에 있는 교육용 가정값이다. 실제 리스·렌트 견적이 아니다.</span>
                      </caption>
                      <tbody>
                        <tr>
                          <th scope="row">방식별 가산 금리</th>
                          <td>{AUTO_FINANCE_TYPES.map(t => `${AUTO_FINANCE_LABEL[t]} +${(assumptions.rateSpreads[t] ?? 0).toFixed(2)}%p`).join(" · ")}. 적용 연이율은 최고금리 20%를 넘지 않는다.</td>
                        </tr>
                        <tr>
                          <th scope="row">고객이 따로 내는 유지비(월)</th>
                          <td>보험 {formatNumber(assumptions.ownerUpkeepMonthly.insurance)} · 자동차세 {formatNumber(assumptions.ownerUpkeepMonthly.carTax)} · 정비 {formatNumber(assumptions.ownerUpkeepMonthly.maintenance)} = <b className="num">{formatNumber(assumptions.ownerUpkeepMonthly.total)}원</b>. 할부·금융리스·운용리스에 적용한다.</td>
                        </tr>
                        <tr>
                          <th scope="row">장기렌트 포함 비용(월)</th>
                          <td>보험 {formatNumber(assumptions.rentIncludedMonthly.insurance)} · 자동차세 {formatNumber(assumptions.rentIncludedMonthly.carTax)} · 정비 {formatNumber(assumptions.rentIncludedMonthly.maintenance)} = <b className="num">{formatNumber(assumptions.rentIncludedMonthly.total)}원</b>. 렌트 차량은 영업용 번호판이라 자동차세가 낮다.</td>
                        </tr>
                        <tr>
                          <th scope="row">계산 전제</th>
                          <td><ul className="af-notes">{assumptions.notes.map(note => <li key={note}>{note}</li>)}</ul></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <Disclosure data={result.disclosure} />
                </div>
              )}
            </section>
          </div>

          <aside aria-label="읽는 법">
            <div className="panel">
              <h3>표 읽는 법</h3>
              <dl className="def-list calc-howto">
                <div><dt>잔존가치</dt><dd>만기에 차량이 가질 것으로 보는 가치다. 차량가 × 잔존가치율이고, 이 계산은 만기 시세도 같은 값이라고 가정한다.</dd></div>
                <div><dt>만기 잔존 원금</dt><dd>리스·렌트는 잔존가치만큼을 기간 내내 빌려 두고 만기에 한 번에 정리한다(풍선). 그래서 월 부담은 작아도 그 몫의 이자가 매달 붙는다.</dd></div>
                <div><dt>선납금과 보증금</dt><dd>선납금은 원금에서 빠지고 돌려받지 않는다. 보증금은 원금과 만기 잔존 원금에서 함께 빠지고, 반납하면 돌려받고 인수하면 인수가에서 뺀다.</dd></div>
                <div><dt>실질 비용</dt><dd>총 지출에서 만기에 내 것으로 남는 차량 가치를 뺀 금액이다. 차를 갖는 방식과 반납하는 방식을 같은 자로 비교하려고 쓴다.</dd></div>
              </dl>
            </div>
            <div className="panel panel-soft">
              <h3>네 방식</h3>
              <dl className="def-list calc-howto">
                {AUTO_FINANCE_TYPES.map(t => <div key={t}><dt>{AUTO_FINANCE_LABEL[t]}</dt><dd>{AUTO_FINANCE_DESCRIPTION[t]}</dd></div>)}
              </dl>
            </div>
            <div className="panel panel-soft">
              <h3>이어서</h3>
              <ul className="calc-links">
                <li><Link to="/learn/lease-basics">개념 4 · 리스: 운용리스·금융리스, 소유권·잔존가치</Link></li>
                <li><Link to="/glossary/residual-value">잔존가치 용어 보기</Link></li>
                <li><Link to="/glossary/finance-lease">금융리스 용어 보기</Link></li>
                <li><Link to="/glossary/operating-lease">운용리스 용어 보기</Link></li>
                <li><Link to="/glossary/lease-payment">리스료 용어 보기</Link></li>
              </ul>
            </div>
          </aside>
        </div>
        <nav className="next-actions" aria-label="다음 행동">
          <Link to="/calculators/schedule">할부 원금으로 상환 스케줄 보기 <Icon name="next" size={16} /></Link>
          <Link to="/calculators/screening">자동차 할부 심사 시뮬레이터 <Icon name="next" size={16} /></Link>
          <Link to="/methodology">규칙 세트·가정값 방법론 <Icon name="next" size={16} /></Link>
        </nav>
      </main>
    </>
  );
}
