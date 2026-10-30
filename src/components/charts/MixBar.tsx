import { formatNumber } from "../../lib/format";

export interface MixSlice { label: string; value: number; color: string }

/**
 * 한 줄짜리 100% 구성 막대. 건전성 5단계 잔액 분포, 납입액의 원금·이자 구성처럼
 * "전체를 100으로 봤을 때의 몫"을 보여 줄 때 쓴다. 범례가 라벨·금액·비중을 글로 함께 말한다.
 */
export default function MixBar({ title, slices, total, unit = "원", note }: {
  title: string;
  slices: MixSlice[];
  total: number;
  unit?: string;
  note?: string;
}) {
  const sum = total > 0 ? total : slices.reduce((acc, s) => acc + s.value, 0);
  const shown = slices.filter(s => s.value > 0);
  const summary = sum > 0
    ? shown.map(s => `${s.label} ${((s.value / sum) * 100).toFixed(1)}%`).join(" · ")
    : "표시할 값이 없다.";

  return (
    <figure className="chart">
      <figcaption><strong>{title}</strong>{note && <span>{note}</span>}</figcaption>
      <div className="mixbar-wrap">
        <div className="mixbar" role="img" aria-label={`${title}. ${summary}`}>
          {shown.map(s => (
            <span key={s.label} style={{ width: `${(s.value / sum) * 100}%`, background: s.color }} />
          ))}
        </div>
        <div className="mixbar-scale" aria-hidden="true"><span>0%</span><span>50%</span><span>100%</span></div>
      </div>
      <div className="chart-legend">
        {slices.map(s => (
          <span key={s.label}>
            <i style={{ background: s.color }} aria-hidden="true" />
            {s.label}
            <b>{sum > 0 ? ((s.value / sum) * 100).toFixed(1) : "0.0"}%</b>
            <span className="faint">{formatNumber(s.value)}{unit}</span>
          </span>
        ))}
      </div>
      <p className="chart-summary">합계 {formatNumber(sum)}{unit}. {summary}.</p>
    </figure>
  );
}
