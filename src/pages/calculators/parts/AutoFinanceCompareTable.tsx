import type { ReactNode } from "react";
import type { AutoFinanceOption, AutoFinanceResponse } from "../../../api/autoFinance";
import Money from "../../../components/Money";
import StatusChip from "../../../components/StatusChip";
import { formatNumber } from "../../../lib/format";
import { ASSUMED_LABEL, ownershipText, settlementText } from "./autoFinanceLabels";
import { pct } from "./labels";

type Row = { key: string; label: ReactNode; cell: (o: AutoFinanceOption) => ReactNode; strong?: boolean };

/**
 * 네 방식 비교표(S-160). 열 = 할부·금융리스·운용리스·장기렌트, 행 = 금리 → 월 부담 → 총 지출 → 만기 → 실질 비용 순.
 * 실질 비용이 가장 작은 열은 머리와 마지막 줄에 글자 라벨("실질 비용 가장 작음")을 함께 단다(색만으로 말하지 않는다).
 */
export default function AutoFinanceCompareTable({ result }: { result: AutoFinanceResponse }) {
  const options = result.options;
  const minCost = Math.min(...options.map(o => o.effectiveCost));
  const maxCost = Math.max(...options.map(o => o.effectiveCost));
  const spread = result.assumptions.rateSpreads;

  const rows: Row[] = [
    {
      key: "rate",
      label: "적용 연이율",
      cell: o => <>{pct(o.annualRate)}<small className="af-cell-note">{spread[o.type] > 0 ? `가산 +${spread[o.type].toFixed(2)}%p` : "입력 연이율 그대로"}</small></>,
    },
    { key: "financed", label: "빌리는 원금", cell: o => <Money value={o.financedAmount} /> },
    { key: "balloon", label: <>만기 잔존 원금<span className="af-row-note">풍선, 잔존가치 − 보증금</span></>, cell: o => (o.balloonAmount > 0 ? <Money value={o.balloonAmount} /> : <span className="muted">없음</span>) },
    {
      key: "monthly",
      label: "월 부담",
      strong: true,
      cell: o => (
        <>
          <Money value={o.monthlyPayment} strong />
          {o.monthlyIncludedCost > 0 && <small className="af-cell-note">리스료 {formatNumber(o.monthlyFinancePayment)} + 포함 비용 {formatNumber(o.monthlyIncludedCost)}</small>}
          {o.lastFinancePayment !== o.monthlyFinancePayment && <small className="af-cell-note">마지막 회 {formatNumber(o.lastFinancePayment + o.monthlyIncludedCost)}</small>}
        </>
      ),
    },
    { key: "upkeep", label: <>별도 유지비(월)<span className="af-row-note">보험·자동차세·정비</span></>, cell: o => (o.monthlyUpkeep > 0 ? <Money value={o.monthlyUpkeep} /> : <span className="muted">렌트료에 포함</span>) },
    { key: "monthlyAll", label: "월 합계(유지비 포함)", cell: o => <Money value={o.monthlyPayment + o.monthlyUpkeep} /> },
    { key: "upfront", label: <>초기 납입<span className="af-row-note">선수금·선납금 + 보증금</span></>, cell: o => <Money value={o.upfrontPayment} /> },
    { key: "interest", label: "총이자", cell: o => <Money value={o.totalInterest} /> },
    { key: "settlement", label: <>만기 정산<span className="af-row-note">기준 시나리오</span></>, cell: o => <>{settlementText(o.maturitySettlement)}<small className="af-cell-note">{ASSUMED_LABEL[o.assumedMaturityOption]} 기준</small></> },
    { key: "spend", label: "총 지출", strong: true, cell: o => <Money value={o.totalSpend} strong /> },
    { key: "owner", label: "차량 명의", cell: o => <span className="af-text">{ownershipText(o)}</span> },
    { key: "choices", label: "만기 선택지", cell: o => <span className="af-text">{o.maturityOptions.map(c => c.label).join(" · ")}</span> },
    { key: "owned", label: "만기에 내 것인 차량 가치", cell: o => (o.ownedVehicleValue > 0 ? <Money value={o.ownedVehicleValue} /> : <span className="muted">없음(반납)</span>) },
    {
      key: "effective",
      label: <>실질 비용<span className="af-row-note">총 지출 − 내 것인 차량 가치</span></>,
      strong: true,
      cell: o => (
        <>
          <Money value={o.effectiveCost} strong />
          <small className="af-cell-note">{o.effectiveCost === minCost ? "가장 작음" : `가장 작은 방식보다 +${formatNumber(o.effectiveCost - minCost)}원`}</small>
        </>
      ),
    },
    {
      key: "effectiveBar",
      label: "실질 비용 비교",
      cell: o => (
        <span className="bar-cell">
          <span className="bar-track" role="img" aria-label={`${o.label} 실질 비용 ${formatNumber(o.effectiveCost)}원, 가장 큰 방식의 ${maxCost > 0 ? Math.round((o.effectiveCost / maxCost) * 100) : 0}%`}>
            <i style={{ width: `${maxCost > 0 ? (o.effectiveCost / maxCost) * 100 : 0}%` }} />
          </span>
        </span>
      ),
    },
  ];

  return (
    <div className="table-scroll">
      <table className="table af-compare">
        <caption>
          네 방식 비교
          <span className="table-caption-note">
            같은 차량가 {formatNumber(result.input.vehiclePrice)}원 · {result.input.termMonths}개월 · 잔존가치율 {pct(result.input.residualValueRate)}
            {result.input.residualValueRateDefaulted ? "(기간별 기본값)" : ""}에서 방식만 바꿨을 때다. 금액 단위는 원이다.
          </span>
        </caption>
        <thead>
          <tr>
            <th scope="col">항목</th>
            {options.map(o => (
              <th key={o.type} scope="col" className={`num${o.type === result.cheapestType ? " is-cheapest" : ""}`}>
                {o.label}
                {o.type === result.cheapestType && <span className="af-head-chip"><StatusChip label="실질 비용 가장 작음" tone="info" /></span>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr key={row.key} className={row.strong ? "is-strong" : undefined}>
              <th scope="row">{row.label}</th>
              {options.map(o => (
                <td key={o.type} className={`num${o.type === result.cheapestType ? " is-cheapest" : ""}`}>{row.cell(o)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** 방식별 만기 선택지 상세 표(선택 · 정산 · 설명). */
export function MaturityOptionsTable({ result }: { result: AutoFinanceResponse }) {
  return (
    <div className="table-scroll">
      <table className="table af-maturity">
        <caption>
          만기에 할 수 있는 일
          <span className="table-caption-note">정산은 + 내는 돈, − 돌려받는 돈이다. "기준"은 총 지출을 계산할 때 쓴 선택이다.</span>
        </caption>
        <thead>
          <tr><th scope="col">방식</th><th scope="col">선택</th><th scope="col" className="num">만기 정산</th><th scope="col">설명</th></tr>
        </thead>
        <tbody>
          {result.options.flatMap(o => o.maturityOptions.map((c, i) => (
            <tr key={`${o.type}-${c.code}`}>
              {i === 0 && <th scope="rowgroup" rowSpan={o.maturityOptions.length}>{o.label}</th>}
              <td>{c.label}{c.code === o.assumedMaturityOption && <span className="af-basis"><StatusChip label="기준" tone="neutral" /></span>}</td>
              <td className="num">{c.settlement === null ? <span className="muted">새 계약</span> : <Money value={c.settlement} />}</td>
              <td className="af-desc">{c.description}</td>
            </tr>
          )))}
        </tbody>
      </table>
    </div>
  );
}
