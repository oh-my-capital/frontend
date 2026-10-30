import Money from "../../../components/Money";
import type { ScreeningResult } from "../../../api/types";
import { pct } from "./labels";

/** 금리 구성 표: 기준금리 + 스프레드(밴드) − 우대(자동이체) = 적용 금리. 20%를 넘으면 상한으로 자른 것을 표시한다. */
export default function RateBreakdown({ result, autoDebit, monthlyPayment }: { result: ScreeningResult; autoDebit: boolean; monthlyPayment?: number | null }) {
  const { rate, creditBand } = result;
  const raw = Math.round((rate.base + rate.spread - rate.discount) * 100) / 100;
  return (
    <table className="table table-compact breakdown">
      <caption>금리 구성<span className="table-caption-note">기준금리 + 신용 스프레드 − 우대 = 적용 금리. 신용 밴드는 점수 구간으로 정해진다.</span></caption>
      <thead><tr><th scope="col">항목</th><th scope="col">근거</th><th scope="col" className="num">값</th></tr></thead>
      <tbody>
        <tr><th scope="row">기준금리</th><td>상품의 기준금리</td><td className="num">{pct(rate.base)}</td></tr>
        <tr><th scope="row">+ 신용 스프레드</th><td>{creditBand ? `신용 밴드 ${creditBand}` : "밴드 없음(자격 미충족)"}</td><td className="num">+{pct(rate.spread)}</td></tr>
        <tr><th scope="row">− 우대</th><td>{autoDebit ? "자동이체 신청 0.20%p" : "우대 없음(자동이체 미신청)"}</td><td className="num">−{pct(rate.discount)}</td></tr>
        {rate.capped && <tr><th scope="row">최고금리 상한</th><td>계산값 {pct(raw)}이 20.00%를 넘어 상한으로 제한</td><td className="num">20.00%</td></tr>}
      </tbody>
      <tfoot>
        <tr><th scope="row">= 적용 금리</th><td>{monthlyPayment !== null && monthlyPayment !== undefined ? <>신청 조건의 월 납입액 <Money value={monthlyPayment} /></> : "연 %, 소수 둘째 자리"}</td><td className="num is-strong">{pct(rate.applied)}</td></tr>
      </tfoot>
    </table>
  );
}
