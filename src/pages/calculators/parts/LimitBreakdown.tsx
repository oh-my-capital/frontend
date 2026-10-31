import Money from "../../../components/Money";
import StatusChip from "../../../components/StatusChip";
import type { ScreeningResult } from "../../../api/types";
import { pct, won } from "./labels";

/**
 * 한도 요소 근거 표: 상품 최대(또는 LTV) · 소득배수 · DSR 역산 → 최종 한도(만 원 절사).
 * 요소 길이 비교와 병목은 위 그림(LimitLadder)이 막대로 보여 주므로 여기서는 역산 근거 숫자를 적는다.
 */
/** ltvRate 는 상품의 담보인정비율(%). 상품마다 다르다(신차 90 · 중고차 70, WP23). */
export default function LimitBreakdown({ result, requestedAmount, ltvRate = null }: { result: ScreeningResult; requestedAmount: number; ltvRate?: number | null }) {
  const { limits, dsr } = result;
  // 자격 단계에서 걸리면 서버가 한도·DSR 을 아예 계산하지 않는다(limits·dsr 이 null).
  if (!limits || !dsr || limits.finalLimit === null) {
    return <p className="muted breakdown-none">자격 단계에서 미충족이라 한도를 계산하지 않았어요. 아래 근거 표에서 어느 규칙이 걸렸는지 확인해요.</p>;
  }
  const rows: { code: string; label: string; basis: string; value: number | null }[] = [
    limits.ltvCap !== null
      ? { code: "LIMIT-LTV", label: ltvRate !== null ? `담보(LTV ${ltvRate}%)` : "담보(LTV)", basis: `차량가 × ${ltvRate !== null ? `${ltvRate}%` : "상품 LTV"}, 원 미만 절사`, value: limits.ltvCap }
      : { code: "LIMIT-PRODUCT", label: "상품 최대", basis: "상품이 정한 최대 금액", value: limits.productCap },
    { code: "LIMIT-INCOME", label: "소득배수", basis: `연소득 × 밴드 ${result.creditBand ?? "—"} 배수`, value: limits.incomeCap },
    { code: "LIMIT-DSR", label: "DSR 역산", basis: `허용 연 원리금 = 연소득 × ${dsr.limit}% − 기존 ${won(dsr.existingAnnual)} → 월 여유로 역산한 최대 원금, 만 원 절사`, value: limits.dsrCap },
  ];
  return (
    <div className="table-scroll"><table className="table table-compact breakdown">
      <caption>한도 요소 근거<span className="table-caption-note">위 그림과 같은 값이다. 가장 작은 요소(병목)가 최종 한도를 정하고 만 원 단위로 절사한다.</span></caption>
      <thead><tr><th scope="col">요소</th><th scope="col">근거</th><th scope="col" className="num">한도</th></tr></thead>
      <tbody>
        {rows.map(row => (
          <tr key={row.code} className={row.code === limits.bindingRule ? "is-binding" : undefined}>
            <th scope="row">{row.label}{row.code === limits.bindingRule && <> <StatusChip label="병목" tone="warn" /></>}</th>
            <td>{row.basis}</td>
            <td className="num"><Money value={row.value} /></td>
          </tr>
        ))}
        <tr>
          <th scope="row">DSR(참고)</th>
          <td>(기존 {won(dsr.existingAnnual)} + 신규 {won(dsr.newAnnual)}) ÷ 연소득 — 신규는 요청 {won(requestedAmount)} 조건의 첫 12회 납입액 합</td>
          <td className="num">{pct(dsr.ratio)} {dsr.ratio <= dsr.limit ? `≤ ${dsr.limit}%` : `> ${dsr.limit}%`}</td>
        </tr>
      </tbody>
      <tfoot>
        <tr><th scope="row">최종 한도</th><td>min(위 요소) → 만 원 절사{limits.bindingRule && ` · 병목 ${limits.bindingRule}`}</td><td className="num is-strong"><Money value={limits.finalLimit} strong /></td></tr>
      </tfoot>
    </table></div>
  );
}
