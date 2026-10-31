import type { AutoFinanceOption, AutoFinanceType } from "../../../api/autoFinance";
import { ChartShell } from "../../../components/charts/chartShell";
import { formatNumber } from "../../../lib/format";

/** 막대 한 줄의 SVG 좌표계. 높이는 CSS 가 정하고 가로만 늘어난다(preserveAspectRatio="none"). */
const W = 1000;
const H = 28;

const SEGMENTS = [
  { key: "vehicleUsage", label: "차량 사용분(차량가 − 잔존가치)", color: "var(--series-principal)", className: "chart-bar-principal" },
  { key: "interest", label: "이자", color: "var(--series-interest)", className: "chart-bar-interest" },
  { key: "upkeep", label: "유지비(보험·자동차세·정비)", color: "var(--series-fee)", className: "chart-bar-fee" },
  { key: "retainedVehicleValue", label: "만기에 남는 차량 가치", color: "var(--primary-line)", className: "af-bar-retained" },
] as const;

/**
 * 총 지출 구성(S-160). 네 방식을 같은 자로 잰 가로 쌓은 막대로 늘어놓는다.
 * 순서는 차량 사용분 → 이자 → 유지비 → 만기에 남는 차량 가치. 진한 세 조각의 길이가 실질 비용이고,
 * 옅은 마지막 조각(할부·금융리스만)이 만기에 내 것으로 남는 몫이다. 범례·요약 문장·값 표가 같은 숫자를 글로 반복한다.
 */
export default function AutoFinanceSpendChart({ options, cheapestType }: { options: AutoFinanceOption[]; cheapestType: AutoFinanceType }) {
  if (options.length === 0) return null;
  const scale = Math.max(...options.map(o => o.totalSpend), 1);
  const bySpend = [...options].sort((a, b) => a.totalSpend - b.totalSpend);
  const cheapest = options.find(o => o.type === cheapestType) ?? options[0];
  const summary = `총 지출이 가장 작은 방식은 ${bySpend[0].label}(${formatNumber(bySpend[0].totalSpend)}원), 가장 큰 방식은 ${bySpend[bySpend.length - 1].label}(${formatNumber(bySpend[bySpend.length - 1].totalSpend)}원)이다. 만기에 남는 차량 가치를 빼면 실질 비용은 ${cheapest.label}가 ${formatNumber(cheapest.effectiveCost)}원으로 가장 작다.`;

  return (
    <ChartShell
      title="총 지출 구성"
      note="가로 길이 = 금액(원), 네 막대가 같은 자를 쓴다. 진한 부분까지가 실질 비용이다"
      legend={SEGMENTS.map(s => ({ color: s.color, label: s.label }))}
      summary={summary}
      data={
        // 7열 값 표는 375px 보다 넓다. 다른 그림의 값 표처럼 가로 스크롤 상자에 담는다(WP28-U1).
        <div className="table-scroll">
        <table className="table">
          <caption className="sr-only">방식별 총 지출 구성 값</caption>
          <thead>
            <tr><th scope="col">방식</th><th scope="col" className="num">차량 사용분</th><th scope="col" className="num">이자</th><th scope="col" className="num">유지비</th><th scope="col" className="num">남는 차량 가치</th><th scope="col" className="num">총 지출</th><th scope="col" className="num">실질 비용</th></tr>
          </thead>
          <tbody>
            {options.map(o => (
              <tr key={o.type}>
                <th scope="row">{o.label}</th>
                <td className="num">{formatNumber(o.breakdown.vehicleUsage)}</td>
                <td className="num">{formatNumber(o.breakdown.interest)}</td>
                <td className="num">{formatNumber(o.breakdown.upkeep)}</td>
                <td className="num">{formatNumber(o.breakdown.retainedVehicleValue)}</td>
                <td className="num">{formatNumber(o.totalSpend)}</td>
                <td className="num">{formatNumber(o.effectiveCost)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      }
    >
      <ul className="af-bars">
        {options.map(o => {
          let x = 0;
          const parts = SEGMENTS.map(s => {
            const value = o.breakdown[s.key];
            const width = (value / scale) * W;
            const rect = { ...s, value, x, width };
            x += width;
            return rect;
          });
          const effectiveX = ((o.totalSpend - o.breakdown.retainedVehicleValue) / scale) * W;
          const label = `${o.label} 총 지출 ${formatNumber(o.totalSpend)}원: ${parts.filter(p => p.value > 0).map(p => `${p.label} ${formatNumber(p.value)}원`).join(", ")}. 실질 비용 ${formatNumber(o.effectiveCost)}원.`;
          return (
            <li key={o.type} className={`af-bar-row${o.type === cheapest.type ? " is-cheapest" : ""}`}>
              <span className="name">{o.label}{o.type === cheapest.type && <span className="af-bar-tag">실질 비용 가장 작음</span>}</span>
              <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label={label} className="af-bar-svg">
                <title>{label}</title>
                <rect className="chart-bar-muted" x={0} y={0} width={W} height={H} />
                {parts.filter(p => p.width > 0).map(p => (
                  <rect key={p.key} className={p.className} x={p.x} y={0} width={p.width} height={H} />
                ))}
                {o.breakdown.retainedVehicleValue > 0 && <line className="af-bar-cut" x1={effectiveX} x2={effectiveX} y1={0} y2={H} />}
              </svg>
              <span className="value">
                <b>{formatNumber(o.totalSpend)}원</b>
                <span className="faint">실질 {formatNumber(o.effectiveCost)}원</span>
              </span>
            </li>
          );
        })}
      </ul>
    </ChartShell>
  );
}
