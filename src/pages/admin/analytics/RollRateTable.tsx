import type { RiskState, RollRateCell, RollRateMatrix } from "../../../api/adminAnalytics";
import Money from "../../../components/Money";
import { shortMoney } from "../../../components/charts/chartShell";
import { formatNumber } from "../../../lib/format";
import { formatMonth } from "../parts/adminLabels";
import { STATE_LABEL, STATE_ORDER, pct } from "./riskLabels";

export type RollBasis = "balance" | "contracts";

/** 칸의 방향: 왼쪽(더 나은 구간)·대각선(유지)·오른쪽(더 나쁜 구간)·완제·종료. 색 계열과 화면 낭독용 낱말에 쓴다. */
type Direction = "better" | "same" | "worse" | "paid";
const DIRECTION_WORD: Record<Direction, string> = { better: "개선", same: "유지", worse: "악화", paid: "완제·종료" };

function direction(from: RiskState, to: RiskState): Direction {
  if (to === "PAID_OFF") return "paid";
  const a = STATE_ORDER.indexOf(from);
  const b = STATE_ORDER.indexOf(to);
  return b < a ? "better" : b === a ? "same" : "worse";
}

/** 농도 6단계(0 = 0%, 5 = 75% 초과). 색만으로 읽지 않도록 칸에는 항상 숫자가 같이 있다. */
function heat(ratio: number): number {
  if (ratio <= 0) return 0;
  if (ratio <= 10) return 1;
  if (ratio <= 25) return 2;
  if (ratio <= 50) return 3;
  if (ratio <= 75) return 4;
  return 5;
}

/**
 * 롤레이트 히트맵(S-220): 행 = 전월 말 구간, 열 = 당월 말 상태. 칸 = 비율 글자 + 건수(또는 잔액) 작은 글자, 배경 농도는 비율.
 * 방향(개선·유지·악화·완제)은 색 계열로 나누고 같은 낱말을 화면 낭독용으로 칸에 넣는다(ui-guidelines §2 색만으로 말하지 않기).
 */
export default function RollRateTable({ matrix, basis }: { matrix: RollRateMatrix; basis: RollBasis }) {
  const cellOf = (cells: RollRateCell[], to: RiskState) => cells.find(c => c.to === to);
  const basisLabel = basis === "balance" ? "잔액 기준" : "건수 기준";
  return (
    <div className="table-scroll rr-scroll">
      <table className="table table-compact rr-table">
        <caption>
          롤레이트 행렬 — {matrix.previousMonth ? formatMonth(matrix.previousMonth) : "—"} 말 → {matrix.month ? formatMonth(matrix.month) : "—"} 말({basisLabel})
          <span className="table-caption-note">
            행은 전월 말 구간, 열은 한 달 뒤 상태다. 각 행의 비율 합은 100%이고, 잔액 기준은 전월 말 잔액이 어디로 옮겨 갔는지를 본다. 당월 월마감 전인 계약은 “미마감”으로 빼고 셈한다.
          </span>
        </caption>
        <thead>
          <tr>
            <th scope="col" className="rr-corner">전월 말 \ 당월 말</th>
            {STATE_ORDER.map(s => <th key={s} scope="col" className="num">{STATE_LABEL[s]}</th>)}
            <th scope="col" className="num">모집단</th>
            <th scope="col" className="num">미마감</th>
          </tr>
        </thead>
        <tbody>
          {matrix.rows.map(row => (
            <tr key={row.from}>
              <th scope="row" className="nowrap">{STATE_LABEL[row.from]}</th>
              {STATE_ORDER.map(to => {
                const cell = cellOf(row.cells, to);
                const ratio = cell ? (basis === "balance" ? cell.balanceRatio : cell.contractRatio) : 0;
                const dir = direction(row.from, to);
                const empty = row.contracts === 0;
                return (
                  <td key={to} className={`num rr-cell rr-${dir} rr-heat-${empty ? 0 : heat(ratio)}`}>
                    {empty ? <span className="faint">—</span> : (
                      <>
                        <span className="rr-ratio">{pct(ratio)}</span>
                        <span className="rr-sub">{basis === "balance" ? shortMoney(cell?.balance ?? 0) : `${formatNumber(cell?.contracts ?? 0)}건`}</span>
                        <span className="sr-only">{DIRECTION_WORD[dir]}</span>
                      </>
                    )}
                  </td>
                );
              })}
              <td className="num">
                <span className="rr-ratio">{formatNumber(row.contracts)}건</span>
                <span className="rr-sub"><Money value={row.balance} /></span>
              </td>
              <td className="num">{row.unclosed > 0 ? `${formatNumber(row.unclosed)}건` : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** 히트맵 범례: 방향 4가지 색 계열 + 농도 설명. 표 바깥에 글로 둔다. */
export function RollRateLegend() {
  return (
    <ul className="rr-legend" aria-label="히트맵 읽는 법">
      <li><i className="rr-swatch rr-better rr-heat-4" aria-hidden="true" />개선(더 나은 구간으로)</li>
      <li><i className="rr-swatch rr-same rr-heat-4" aria-hidden="true" />유지(같은 구간)</li>
      <li><i className="rr-swatch rr-worse rr-heat-4" aria-hidden="true" />악화(더 나쁜 구간으로)</li>
      <li><i className="rr-swatch rr-paid rr-heat-4" aria-hidden="true" />완제·종료(청약철회 포함)</li>
      <li className="faint">색이 짙을수록 비율이 높다(0 · 10 · 25 · 50 · 75% 경계)</li>
    </ul>
  );
}
