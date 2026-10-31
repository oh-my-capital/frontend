import type { RefinanceResult } from "../../../api/refinance";
import Money from "../../../components/Money";
import StatusChip from "../../../components/StatusChip";
import { formatDate, formatNumber } from "../../../lib/format";
import { METHOD_LABEL, pct } from "./labels";

/** 부호를 붙인 차이(갈아타기 − 유지). 0이면 "같음". */
function Diff({ value, unit = "원" }: { value: number; unit?: string }) {
  if (value === 0) return <span className="refi-diff">같음</span>;
  return <span className={`refi-diff ${value < 0 ? "is-down" : "is-up"}`}>{value > 0 ? "+" : "−"}{formatNumber(Math.abs(value))}{unit}</span>;
}

/**
 * 두 대출 비교 표(S-170): 기존 유지 vs 갈아타기, 차이 = 갈아타기 − 유지. 마지막 줄 총비용(남은 이자 + 갈아타기 비용)의 차이가 순이익이다.
 * 중도상환수수료 근거(잔존일수 ÷ 대출기간 일수)를 표 설명에 적는다. 모바일은 차이 열을 숨긴다(순이익·절감은 지표 줄에 있다).
 */
export function RefinanceCompareTable({ result }: { result: RefinanceResult }) {
  const { existing: ex, newLoan: nw, cost } = result;
  const keepTotal = ex.totalInterest;
  const switchTotal = nw.totalInterest + cost.total;
  const rateDiff = Math.round((nw.annualRate - ex.annualRate) * 100) / 100;
  return (
    <div className="table-scroll">
      <table className="table refi-compare">
        <caption>
          기존 유지와 갈아타기 비교
          <span className="table-caption-note">
            {cost.feeWaived
              ? "기존 대출 실행 3년이 지나 중도상환수수료는 면제다."
              : <>중도상환수수료 = 잔액 {formatNumber(ex.principal)}원 × {pct(cost.feeRate)} × 잔존 {formatNumber(cost.remainingDays)}일 ÷ 대출기간 {formatNumber(cost.loanDays)}일, 원 미만 절사.</>}
            {" "}갈아타는 날은 기존 대출 납입일 직후로 보아 경과이자는 0이다. 기존 유지의 남은 이자는 잔액·잔존 회차로 다시 만든 회차표의 이자 합이다.
          </span>
        </caption>
        <thead>
          <tr><th scope="col">항목</th><th scope="col" className="num">기존 유지</th><th scope="col" className="num">갈아타기</th><th scope="col" className="num hide-sm">차이</th></tr>
        </thead>
        <tbody>
          <tr><th scope="row">연이율 · 방식</th><td className="num">{pct(ex.annualRate)} · {METHOD_LABEL[ex.repaymentMethod]}</td><td className="num">{pct(nw.annualRate)} · {METHOD_LABEL[nw.repaymentMethod]}</td><td className="num hide-sm">{rateDiff === 0 ? <span className="refi-diff">같음</span> : <span className={`refi-diff ${rateDiff < 0 ? "is-down" : "is-up"}`}>{rateDiff > 0 ? "+" : "−"}{Math.abs(rateDiff).toFixed(2)}%p</span>}</td></tr>
          <tr><th scope="row">남은 회차 · 만기</th><td className="num">{ex.installments}회 · {formatDate(ex.maturityDate)}</td><td className="num">{nw.installments}회 · {formatDate(nw.maturityDate)}</td><td className="num hide-sm"><Diff value={nw.installments - ex.installments} unit="회" /></td></tr>
          <tr><th scope="row">첫 회 납입액</th><td className="num"><Money value={ex.firstPayment} /></td><td className="num"><Money value={nw.firstPayment} /></td><td className="num hide-sm"><Diff value={nw.firstPayment - ex.firstPayment} /></td></tr>
          <tr><th scope="row">남은 총이자</th><td className="num"><Money value={ex.totalInterest} /></td><td className="num"><Money value={nw.totalInterest} /></td><td className="num hide-sm"><Diff value={nw.totalInterest - ex.totalInterest} /></td></tr>
          <tr><th scope="row">중도상환수수료</th><td className="num"><Money value={0} /></td><td className="num"><Money value={cost.prepaymentFee} /></td><td className="num hide-sm"><Diff value={cost.prepaymentFee} /></td></tr>
          <tr><th scope="row">새 대출 부대비용</th><td className="num"><Money value={0} /></td><td className="num"><Money value={cost.upfrontCost} /></td><td className="num hide-sm"><Diff value={cost.upfrontCost} /></td></tr>
        </tbody>
        <tfoot>
          <tr><th scope="row">총비용(이자 + 비용)</th><td className="num"><Money value={keepTotal} strong /></td><td className="num"><Money value={switchTotal} strong /></td><td className="num hide-sm"><Diff value={switchTotal - keepTotal} /></td></tr>
        </tfoot>
      </table>
    </div>
  );
}

/**
 * 회차별 비교 표: 기존·새 납입과 이자, 이자 절감, 누적 절감, 비용 회수 여부. 손익분기 회차 줄은 is-current 와 글자 라벨로 표시한다.
 * 모바일(≤740px)은 납입·이자 네 열을 숨기고 회차·절감·누적·회수 4열만 둔다(회차표와 같은 방식).
 */
export function RefinanceRowsTable({ result }: { result: RefinanceResult }) {
  const be = result.breakevenInstallment;
  return (
    <div className="table-scroll">
      <table className="table refi-rows">
        <caption>
          회차별 이자 비교 · {result.rows.length}회
          <span className="table-caption-note">k회차 이자 절감 = 기존 k회차 이자 − 새 k회차 이자. 한쪽이 먼저 끝나면 그쪽 이자·납입은 0이다. 누적 절감이 갈아타기 비용 {formatNumber(result.cost.total)}원 이상이 되는 첫 회차가 손익분기다.</span>
        </caption>
        <thead>
          <tr>
            <th scope="col">회차</th>
            <th scope="col" className="num hide-sm">기존 납입</th>
            <th scope="col" className="num hide-sm">새 납입</th>
            <th scope="col" className="num hide-sm">기존 이자</th>
            <th scope="col" className="num hide-sm">새 이자</th>
            <th scope="col" className="num">이자 절감</th>
            <th scope="col" className="num">누적 절감</th>
            <th scope="col">비용 회수</th>
          </tr>
        </thead>
        <tbody>
          {result.rows.map(r => (
            <tr key={r.installmentNo} className={r.installmentNo === be ? "is-current" : undefined}>
              <th scope="row">{r.installmentNo}회</th>
              <td className="num hide-sm">{r.existingPayment ? formatNumber(r.existingPayment) : "끝남"}</td>
              <td className="num hide-sm">{r.newPayment ? formatNumber(r.newPayment) : "끝남"}</td>
              <td className="num hide-sm">{formatNumber(r.existingInterest)}</td>
              <td className="num hide-sm">{formatNumber(r.newInterest)}</td>
              <td className="num"><span className={r.interestSaving < 0 ? "refi-negative" : undefined}>{formatNumber(r.interestSaving)}</span></td>
              <td className="num"><span className={r.cumulativeSaving < 0 ? "refi-negative" : undefined}>{formatNumber(r.cumulativeSaving)}</span></td>
              <td>{r.installmentNo === be ? <StatusChip label="손익분기" tone="good" /> : <span className={r.recovered ? "refi-recovered" : "faint"}>{r.recovered ? "회수" : "회수 전"}</span>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
