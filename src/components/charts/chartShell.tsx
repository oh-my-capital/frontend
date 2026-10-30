import type { ReactNode } from "react";

/**
 * 모든 그림이 쓰는 겉틀. 머리글 → 그림 → 범례 → 한 문장 요약 → 값 표(접힘) 순서를 강제한다.
 * 색만으로 뜻을 전하지 않도록 범례와 요약 문장이 같은 정보를 글로 말한다(ui-guidelines §2·§7).
 */
export interface LegendItem { color: string; label: string; value?: string }

export function ChartShell({ title, note, legend, summary, data, children }: {
  title: string;
  note?: ReactNode;
  legend?: LegendItem[];
  summary: string;
  /** 같은 숫자를 담은 표. 접힌 채로 둔다. */
  data?: ReactNode;
  children: ReactNode;
}) {
  return (
    <figure className="chart">
      <figcaption><strong>{title}</strong>{note && <span>{note}</span>}</figcaption>
      {children}
      {legend && legend.length > 0 && (
        <div className="chart-legend">
          {legend.map(item => (
            <span key={item.label}><i style={{ background: item.color }} aria-hidden="true" />{item.label}{item.value && <b>{item.value}</b>}</span>
          ))}
        </div>
      )}
      <p className="chart-summary">{summary}</p>
      {data && <details className="chart-data"><summary>같은 값을 표로 보기</summary>{data}</details>}
    </figure>
  );
}

/** 축 눈금 3개(0·중간·최대)를 만든다. 최대가 0이면 1로 올려 0으로 나누지 않는다. */
export function axisTicks(max: number): { top: number; ticks: number[] } {
  const top = max <= 0 ? 1 : max * 1.12;
  return { top, ticks: [0, top / 2, top] };
}

/** 가로축 라벨이 겹치지 않도록 몇 개마다 하나씩 그릴지 정한다. */
export function labelStep(count: number, maxLabels = 12): number {
  return Math.max(1, Math.ceil(count / maxLabels));
}

/** 원 단위를 축 라벨용으로 줄인다. 1,200,000 → "120만", 35,000,000 → "3,500만", 1,000,000,000 → "10억". */
export function shortMoney(value: number): string {
  const v = Math.round(value);
  if (v === 0) return "0";
  const abs = Math.abs(v);
  const unit = abs >= 100_000_000 ? { divisor: 100_000_000, suffix: "억" } : abs >= 10_000 ? { divisor: 10_000, suffix: "만" } : { divisor: 1, suffix: "" };
  const scaled = Math.round((v / unit.divisor) * 10) / 10;
  return new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 1 }).format(scaled) + unit.suffix;
}
