import type { UnitEconomicsResult } from "../../api/unitEconomics";
import { formatNumber, formatRate } from "../../lib/format";

/**
 * 민감도 표(S-330): 행 = 연 대손율, 열 = 조달금리, 칸 = ROA(굵게) + 기간 세전이익(작게).
 * 손해 칸은 붉은 tint 와 "손해" 글자, 입력 그대로인 칸은 "입력" 글자를 함께 둔다(색만으로 말하지 않는다).
 */
export default function UnitEconomicsSensitivityTable({ result }: { result: UnitEconomicsResult }) {
  const { lossRates, fundingRates, cells } = result.sensitivity;
  const cellOf = (loss: number, funding: number) => cells.find(c => c.annualLossRate === loss && c.fundingRate === funding);
  return (
    <section aria-labelledby="ue-sens-title">
      <div className="section-head">
        <div>
          <h2 id="ue-sens-title">대손율·조달금리가 바뀌면</h2>
          <p>다른 조건은 그대로 두고 연 대손율(행)과 조달금리(열)만 바꿔 ROA를 다시 계산했다. 둘 다 평잔에 비례하므로 1%p 오르면 ROA가 거의 1%p 내려간다.</p>
        </div>
      </div>
      <div className="table-scroll ue-sens-scroll">
        <table className="table table-compact ue-sens">
          <caption>민감도 표 <span className="table-caption-note">칸 = ROA(연환산) · 아래 작은 글자는 기간 세전이익</span></caption>
          <thead>
            <tr>
              <th scope="col" className="ue-sens-corner">연 대손율 \ 조달금리</th>
              {fundingRates.map(f => <th key={f} scope="col" className="num">{formatRate(f)}</th>)}
            </tr>
          </thead>
          <tbody>
            {lossRates.map(l => (
              <tr key={l}>
                <th scope="row" className="num">{formatRate(l)}</th>
                {fundingRates.map(f => {
                  const c = cellOf(l, f);
                  if (!c) return <td key={f} className="num">—</td>;
                  const loss = c.pretaxProfit < 0;
                  return (
                    <td key={f} className={`num ue-sens-cell${loss ? " is-loss" : ""}${c.base ? " is-base" : ""}`}>
                      <span className="ue-sens-roa">{formatRate(c.roa)}</span>
                      <span className="ue-sens-sub">{formatNumber(c.pretaxProfit)}원</span>
                      {(loss || c.base) && <span className="ue-sens-tag">{[c.base ? "입력" : "", loss ? "손해" : ""].filter(Boolean).join(" · ")}</span>}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
