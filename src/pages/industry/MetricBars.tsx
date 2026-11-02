import { DIRECTION_LABEL, type MetricDirection } from "../../api/industry";
import { ChartShell, axisTicks } from "../../components/charts/chartShell";

export interface MetricBarRow { id: string; name: string; value: number }

/**
 * 지표 하나를 회사 세 곳에 같은 자로 잰 가로 막대(LimitLadder 와 같은 .ladder 모양). ChartShell 로 머리글 → 막대 → 범례 →
 * 한 문장 요약 → 접힌 값 표 순서를 지킨다. 해석 방향이 있으면 가장 좋은 회사를 강조하고 요약 문장이 같은 내용을 글로 말한다.
 */
export default function MetricBars({ title, direction, rows, format }: {
  title: string;
  direction: MetricDirection;
  rows: MetricBarRow[];
  format: (value: number) => string;
}) {
  const { top } = axisTicks(Math.max(...rows.map(r => r.value), 0));
  const values = rows.map(r => r.value);
  const target = direction === "LOWER" ? Math.min(...values) : direction === "HIGHER" ? Math.max(...values) : null;
  const best = target === null ? [] : rows.filter(r => r.value === target);
  const listed = rows.map(r => `${r.name} ${format(r.value)}`).join(", ");
  const summary = best.length > 0
    ? `${title}은(는) ${listed}이다. ${DIRECTION_LABEL[direction]} 지표라 ${best.map(r => r.name).join("·")}가 가장 ${direction === "LOWER" ? "낮아" : "높아"} 좋은 쪽이다.`
    : `${title}은(는) ${listed}이다. 좋고 나쁨보다 회사 유형의 차이를 읽는 지표다.`;
  return (
    <ChartShell
      title={title}
      note={`${DIRECTION_LABEL[direction]} · 눈금 0~${format(top)} · 가상 데이터`}
      legend={best.length > 0 ? [{ color: "var(--primary)", label: direction === "LOWER" ? "가장 낮음" : "가장 높음" }, { color: "var(--primary-tint)", label: "나머지 회사" }] : undefined}
      summary={summary}
      data={
        <table className="table table-compact">
          <thead><tr><th scope="col">회사</th><th scope="col" className="num">{title}</th></tr></thead>
          <tbody>{rows.map(r => <tr key={r.id}><th scope="row">{r.name}</th><td className="num">{format(r.value)}</td></tr>)}</tbody>
        </table>
      }
    >
      <ul className="ladder industry-ladder" aria-hidden="true">
        {rows.map(r => (
          <li key={r.id} className={`ladder-row${best.includes(r) ? " is-final" : ""}`}>
            <span className="name">{r.name}{best.includes(r) && <><br /><span className="faint">{direction === "LOWER" ? "가장 낮음" : "가장 높음"}</span></>}</span>
            <span className="ladder-track"><i style={{ width: `${Math.max(1, (r.value / top) * 100)}%` }} /></span>
            <span className="value">{format(r.value)}</span>
          </li>
        ))}
      </ul>
    </ChartShell>
  );
}
