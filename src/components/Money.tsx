import { formatNumber } from "../lib/format";

/** 금액 표기: 천 단위 쉼표, tabular-nums, 단위 "원"은 작은 글자로 뒤에. 표 안에서는 td.num 과 함께 쓴다. */
export default function Money({ value, strong = false, unit = "원" }: { value: number | null | undefined; strong?: boolean; unit?: string }) {
  if (value === null || value === undefined) return <span className="money">—</span>;
  return (
    <span className={`money${strong ? " money-strong" : ""}`}>
      {formatNumber(value)}
      {unit && <span className="money-unit">{unit}</span>}
    </span>
  );
}
