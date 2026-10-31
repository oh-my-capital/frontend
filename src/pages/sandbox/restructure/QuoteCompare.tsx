import { RESTRUCTURE_LABEL, type RestructureQuote, type RestructureTerms } from "../../../api/restructure";
import Money from "../../../components/Money";
import { formatDate } from "../../../lib/format";
import { diffClass, installmentRange, signedCount, signedWon } from "./text";

/** 이자만 내는 회차: "2~4회차 3회 · 회당 59,005원" 또는 "없음". */
function InterestOnly({ terms: t }: { terms: RestructureTerms }) {
  if (t.interestOnlyInstallments <= 0 || t.interestOnlyPayment === null) return <>없음</>;
  return <>{installmentRange(t.firstInstallmentNo, t.interestOnlyInstallments)} {t.interestOnlyInstallments}회 · 회당 <Money value={t.interestOnlyPayment} /></>;
}

/**
 * 견적 비교표(S-181): 전(현재 회차표의 남은 회차) / 후(재산정) / 차이. 금액은 오른쪽 정렬, 차이는 부호를 글자로 쓴다.
 * 아래에 재산정 회차표를 접어 둔다(이자만 내는 회차는 라벨로 표시).
 */
export default function QuoteCompare({ quote: q }: { quote: RestructureQuote }) {
  const { before: b, after: a, change } = q;
  const paymentDiff = a.remainingPayment - b.remainingPayment;
  return (
    <>
      <div className="table-scroll">
        <table className="table table-compact restructure-compare restructure-stack">
          <caption>
            {RESTRUCTURE_LABEL[q.type]} {q.months}개월 견적 · 영업일 {formatDate(q.asOf)} · 잔액 <Money value={q.outstandingPrincipal} /> · 연 {q.annualRate.toFixed(2)}%
            <span className="table-caption-note">견적은 저장되지 않는다. 적용하면 같은 계산으로 남은 회차를 다시 만든다.</span>
          </caption>
          <thead>
            <tr><th scope="col">항목</th><th scope="col" className="num">변경 전</th><th scope="col" className="num">변경 후</th><th scope="col" className="num">차이</th></tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">원금 상환 회차 월 납입액</th>
              <td data-label="변경 전" className="num"><Money value={b.monthlyPayment} /></td>
              <td data-label="변경 후" className="num"><Money value={a.monthlyPayment} strong /></td>
              <td data-label="차이" className={`num ${diffClass(change.monthlyPayment)}`}>{signedWon(change.monthlyPayment)}</td>
            </tr>
            <tr>
              <th scope="row">이자만 내는 회차</th>
              <td data-label="변경 전" className="num"><InterestOnly terms={b} /></td>
              <td data-label="변경 후" className="num"><InterestOnly terms={a} /></td>
              <td data-label="차이" className="num">{signedCount(a.interestOnlyInstallments - b.interestOnlyInstallments, "회")}</td>
            </tr>
            <tr>
              <th scope="row">남은 총이자</th>
              <td data-label="변경 전" className="num"><Money value={b.remainingInterest} /></td>
              <td data-label="변경 후" className="num"><Money value={a.remainingInterest} strong /></td>
              <td data-label="차이" className={`num ${diffClass(change.remainingInterest)}`}>{signedWon(change.remainingInterest)}</td>
            </tr>
            <tr>
              <th scope="row">남은 총납입(원금 + 이자)</th>
              <td data-label="변경 전" className="num"><Money value={b.remainingPayment} /></td>
              <td data-label="변경 후" className="num"><Money value={a.remainingPayment} /></td>
              <td data-label="차이" className={`num ${diffClass(paymentDiff)}`}>{signedWon(paymentDiff)}</td>
            </tr>
            <tr>
              <th scope="row">남은 회차</th>
              <td data-label="변경 전" className="num">{b.remainingInstallments}회 · {installmentRange(b.firstInstallmentNo, b.remainingInstallments)}</td>
              <td data-label="변경 후" className="num">{a.remainingInstallments}회 · {installmentRange(a.firstInstallmentNo, a.remainingInstallments)}</td>
              <td data-label="차이" className="num">{signedCount(change.installments, "회")}</td>
            </tr>
            <tr>
              <th scope="row">약정 기간 · 만기일</th>
              <td data-label="변경 전" className="num">{b.termMonths}개월 · {formatDate(b.maturityDate)}</td>
              <td data-label="변경 후" className="num">{a.termMonths}개월 · {formatDate(a.maturityDate)}</td>
              <td data-label="차이" className="num">{a.termMonths === b.termMonths ? "만기 그대로" : signedCount(a.termMonths - b.termMonths, "개월")}</td>
            </tr>
            <tr>
              <th scope="row">마지막 회차</th>
              <td data-label="변경 전" className="num">{formatDate(b.finalDueDate)} · <Money value={b.finalPayment} /></td>
              <td data-label="변경 후" className="num">{formatDate(a.finalDueDate)} · <Money value={a.finalPayment} /></td>
              <td data-label="차이" className="num">—</td>
            </tr>
          </tbody>
        </table>
      </div>
      <details className="fold restructure-rows">
        <summary>재산정 회차표 {q.schedule.length}회 보기</summary>
        <div className="table-scroll">
          <table className="table table-compact">
            <caption>재산정 후 남은 회차 · 납입일은 토·일이면 다음 월요일로 이연한 실제 납입일이다</caption>
            <thead>
              <tr><th scope="col">회차</th><th scope="col">실제 납입일</th><th scope="col" className="num">원금</th><th scope="col" className="num">이자</th><th scope="col" className="num">납입액</th><th scope="col" className="num">잔액</th></tr>
            </thead>
            <tbody>
              {q.schedule.map(r => (
                <tr key={r.installmentNo}>
                  <th scope="row">{r.installmentNo}회차{r.principal === 0 && r.balanceAfter > 0 && <span className="status status-warn restructure-row-tag">이자만</span>}</th>
                  <td>{formatDate(r.adjustedDueDate)}{r.adjustedDueDate !== r.dueDate && <span className="faint"> (약정 {formatDate(r.dueDate)})</span>}</td>
                  <td className="num"><Money value={r.principal} /></td>
                  <td className="num"><Money value={r.interest} /></td>
                  <td className="num"><Money value={r.payment} strong /></td>
                  <td className="num"><Money value={r.balanceAfter} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </>
  );
}
