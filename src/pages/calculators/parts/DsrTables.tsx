import { DEBT_TYPE_LABEL, type DsrDebtService, type DsrResult } from "../../../api/refinance";
import Money from "../../../components/Money";
import StatusChip from "../../../components/StatusChip";
import { formatNumber } from "../../../lib/format";
import { METHOD_LABEL, pct } from "./labels";

/** 건별 연 원리금의 근거 한 줄(business-rules WP17 절). */
function basisText(d: DsrDebtService, years: number): string {
  if (d.basis === "BULLET_CONVERTED") {
    const months = Math.min(12, d.remainingMonths);
    return `원금 ÷ ${years}년 + ${months}회 이자`;
  }
  return d.remainingMonths < 12 ? `남은 ${d.remainingMonths}회 납입 합` : "향후 12회 납입 합";
}

/** 건별 연 원리금 표: 잔액·금리·잔존·방식 → 연 원금·연 이자·연 원리금·근거, 합계 줄. 열이 많아 .table-scroll 안에 둔다. */
export function DsrDebtTable({ result }: { result: DsrResult }) {
  return (
    <div className="table-scroll">
      <table className="table dsr-table">
        <caption>
          건별 연 원리금 · {result.debts.length}건
          <span className="table-caption-note">
            원리금균등·원금균등은 잔액과 잔존 개월로 만든 회차표의 향후 12회 납입액 합이다(12회 미만이면 전체). 만기일시는 만기 전 원금 상환이 없어 원금을 {result.bulletPrincipalYears}년에 나눠 갚는다고 보고(교육용 가정값) 12회 이자를 더한다.
          </span>
        </caption>
        <thead>
          <tr>
            <th scope="col">대출</th>
            <th scope="col" className="num">잔액</th>
            <th scope="col" className="num">금리 · 잔존</th>
            <th scope="col">방식</th>
            <th scope="col" className="num">연 원금</th>
            <th scope="col" className="num">연 이자</th>
            <th scope="col" className="num">연 원리금</th>
            <th scope="col">근거</th>
          </tr>
        </thead>
        <tbody>
          {result.debts.length === 0 && <tr><td colSpan={8} className="faint">기존 대출이 없다. 연 원리금 합은 0원이다.</td></tr>}
          {result.debts.map(d => (
            <tr key={d.index}>
              <th scope="row">{d.index} · {DEBT_TYPE_LABEL[d.type]}</th>
              <td className="num"><Money value={d.balance} /></td>
              <td className="num">{pct(d.annualRate)} · {d.remainingMonths}개월</td>
              <td>{METHOD_LABEL[d.repaymentMethod]}</td>
              <td className="num">{formatNumber(d.annualPrincipal)}</td>
              <td className="num">{formatNumber(d.annualInterest)}</td>
              <td className="num"><Money value={d.annualDebtService} strong /></td>
              <td className="dsr-basis">{basisText(d, result.bulletPrincipalYears)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <th scope="row">합계</th>
            <td className="num"><Money value={result.debts.reduce((s, d) => s + d.balance, 0)} /></td>
            <td colSpan={2} />
            <td className="num">{formatNumber(result.debts.reduce((s, d) => s + d.annualPrincipal, 0))}</td>
            <td className="num">{formatNumber(result.debts.reduce((s, d) => s + d.annualInterest, 0))}</td>
            <td className="num"><Money value={result.totalAnnualDebtService} strong /></td>
            <td>연소득의 {pct(result.dsrRatio)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

/** 방식별 추가 한도 표: 같은 금리·기간에서 상환 방식만 바꿨을 때의 한도, 새 연 원리금, 빌린 뒤 DSR. 요청 방식 줄은 is-current + 글자 라벨. */
export function DsrLimitTable({ result }: { result: DsrResult }) {
  const nl = result.newLoan;
  return (
    <div className="table-scroll">
      <table className="table dsr-limits">
        <caption>
          방식별 추가 한도 · 연 {pct(nl.annualRate)} · {nl.termMonths}회
          <span className="table-caption-note">
            상한까지 남은 연 원리금 {formatNumber(result.remainingAnnualRoom)}원(월 여유 {formatNumber(result.monthlyRoom)}원)으로 빌릴 수 있는 최대 원금이다. 원리금균등·원금균등은 심사와 같은 DSR 역산(원금균등은 첫 회 납입 기준), 만기일시는 원금 ÷ {result.bulletPrincipalYears}년 + 연 이자 정의로 역산한다. 모두 만 원 절사.
          </span>
        </caption>
        <thead>
          <tr><th scope="col">상환 방식</th><th scope="col" className="num">추가 한도</th><th scope="col" className="num">새 대출 연 원리금</th><th scope="col" className="num">빌린 뒤 DSR</th></tr>
        </thead>
        <tbody>
          {result.limits.map(l => (
            <tr key={l.repaymentMethod} className={l.requested ? "is-current" : undefined}>
              <th scope="row">{METHOD_LABEL[l.repaymentMethod]}{l.requested && <> <StatusChip label="선택한 방식" tone="info" /></>}</th>
              <td className="num"><Money value={l.limit} strong={l.requested} /></td>
              <td className="num">{formatNumber(l.newAnnualDebtService)}</td>
              <td className="num">{pct(l.dsrAfter)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
