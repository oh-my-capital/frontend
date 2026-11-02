import type { IndustryCompany, MetricDirection, MetricId } from "../../api/industry";

/**
 * 지표 비교표·막대 비교의 행 정의. 지표 이름·해석 방향은 API 의 지표 정의에서 가져오고,
 * 행이 지표와 다른 값을 보일 때(구간 금리 → 회사 평균, 자산 구성 → 위험 자산 비중)만 label·direction 을 덮는다.
 */
export interface CompareRow {
  key: string;
  metric: MetricId;
  /** 지표 이름 대신 쓸 행 이름 */
  label?: string;
  /** 탭에 쓸 짧은 이름 */
  short?: string;
  note?: string;
  direction?: MetricDirection;
  display: (c: IndustryCompany) => string;
  /** 막대로 비교할 숫자. 없으면 막대 탭에 넣지 않는다(신용등급). */
  value?: (c: IndustryCompany) => number;
  /** 가장 좋은 값을 고를 때 쓰는 숫자(기본 value). 신용등급은 순위의 음수 */
  rankValue?: (c: IndustryCompany) => number;
}

export const formatPercent = (v: number) => `${Number.isInteger(v) ? v : v.toFixed(2)}%`;
const pct = (v: number) => `${v.toFixed(2)}%`;

export const COMPARE_ROWS: CompareRow[] = [
  { key: "credit-rating", metric: "credit-rating", display: c => c.creditRating, rankValue: c => -c.creditRatingRank },
  { key: "funding-rate", metric: "funding-rate", short: "조달금리", display: c => pct(c.fundingRate), value: c => c.fundingRate },
  { key: "average-rate", metric: "rate-by-score", label: "회사 평균 금리", short: "평균 금리", note: "구간 금리의 취급액 가중평균", direction: "CONTEXT", display: c => pct(c.averageRate), value: c => c.averageRate },
  { key: "higher-risk", metric: "asset-mix", label: "위험 자산 비중", short: "위험 자산", note: "개인 신용대출 + 부동산 PF", direction: "CONTEXT", display: c => `${c.higherRiskShare}%`, value: c => c.higherRiskShare },
  { key: "delinquency-rate", metric: "delinquency-rate", short: "연체율", display: c => pct(c.delinquencyRate), value: c => c.delinquencyRate },
  { key: "npl-ratio", metric: "npl-ratio", short: "고정이하", display: c => pct(c.nplRatio), value: c => c.nplRatio },
  { key: "coverage-ratio", metric: "coverage-ratio", short: "충당금 적립률", display: c => pct(c.coverageRatio), value: c => c.coverageRatio },
  { key: "provision-to-loans", metric: "provision-to-loans", short: "총여신 대비 충당금", display: c => pct(c.provisionToLoans), value: c => c.provisionToLoans },
  { key: "roa", metric: "roa", short: "ROA", display: c => pct(c.roa), value: c => c.roa },
];

/** 해석 방향 기준으로 가장 좋은 회사 id. CONTEXT 면 비어 있다(좋고 나쁨이 없다). 같은 값이면 모두 표시한다. */
export function bestCompanyIds(companies: IndustryCompany[], row: CompareRow, direction: MetricDirection): Set<string> {
  const rank = row.rankValue ?? row.value;
  if (direction === "CONTEXT" || !rank || companies.length === 0) return new Set();
  const values = companies.map(rank);
  const target = direction === "LOWER" ? Math.min(...values) : Math.max(...values);
  return new Set(companies.filter((_, i) => values[i] === target).map(c => c.id));
}
