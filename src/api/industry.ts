import { request } from "./client";

/**
 * 업권 비교·공시 읽기 실습(tag industry) 호출과 타입. WP34 소유. 계약은 docs `contracts/api/wp34-industry.yml`.
 * 공개 경로라 로그인 없이 부른다. 공용 types.ts 는 고치지 않고 타입을 여기 둔다.
 * 세 회사는 가상 회사이고 수치는 교육용 가정값이다(dataKind FICTIONAL).
 */

export interface RelatedTerm { slug: string; term: string }
export interface IndustryLink { path: string; label: string }
export interface ScoreBand { code: string; label: string }
export interface AssetCategory { code: string; label: string; higherRisk: boolean }

export type MetricId =
  | "rate-by-score" | "funding-rate" | "credit-rating" | "asset-mix" | "delinquency-rate"
  | "npl-ratio" | "coverage-ratio" | "provision-to-loans" | "roa";
export type MetricDirection = "LOWER" | "HIGHER" | "CONTEXT";
export interface IndustryMetric {
  id: MetricId;
  name: string;
  unit: string;
  direction: MetricDirection;
  formula: string;
  reading: string;
  caution: string;
  derived: boolean;
  relatedTerms: RelatedTerm[];
}

export interface RateByScore { band: string; label: string; rate: number; share: number }
export interface AssetShare { category: string; label: string; share: number; higherRisk: boolean }
export type CompanyType = "HOLDING_AFFILIATE" | "CAPTIVE" | "INDEPENDENT";
export interface IndustryCompany {
  id: string;
  name: string;
  typeCode: CompanyType;
  typeLabel: string;
  fictional: true;
  summary: string;
  traits: string[];
  creditRating: string;
  creditRatingRank: number;
  fundingRate: number;
  delinquencyRate: number;
  nplRatio: number;
  coverageRatio: number;
  provisionToLoans: number;
  roa: number;
  averageRate: number;
  rateByScore: RateByScore[];
  assetMix: AssetShare[];
  higherRiskShare: number;
}

export type SourceKind = "REGULATOR" | "ASSOCIATION" | "RATING_AGENCY";
export interface IndustrySource {
  id: string;
  organization: string;
  kind: SourceKind;
  title: string;
  menuPath: string;
  url: string;
  whatToLook: string;
  relatedMetrics: MetricId[];
  checkedOn: string;
}

export interface IndustryQuestion { id: string; question: string; options: { id: string; text: string }[]; relatedMetrics: MetricId[] }

export interface IndustryBenchmark {
  dataKind: "FICTIONAL";
  valueKind: "ASSUMPTION";
  basisLabel: string;
  notice: string;
  sourceCheckedOn: string;
  legalMaxRate: number;
  scoreBands: ScoreBand[];
  assetCategories: AssetCategory[];
  metrics: IndustryMetric[];
  companies: IndustryCompany[];
  sources: IndustrySource[];
  questions: IndustryQuestion[];
}

export interface IndustryAnswerItem {
  questionId: string;
  correct: boolean;
  selectedOptionId: string | null;
  correctOptionId: string;
  explanation: string;
  relatedMetrics: MetricId[];
  nextLink: IndustryLink | null;
}
export interface IndustryAnswerResult { score: number; correctCount: number; total: number; items: IndustryAnswerItem[] }

export const industryApi = {
  benchmark: (signal?: AbortSignal) => request<IndustryBenchmark>("/industry/benchmark", { signal }),
  answers: (answers: Record<string, string>) => request<IndustryAnswerResult>("/industry/benchmark/answers", { method: "POST", body: { answers } }),
};

/** 해석 방향 라벨. 색만으로 말하지 않도록 글자로 쓴다. */
export const DIRECTION_LABEL: Record<MetricDirection, string> = {
  LOWER: "낮을수록 좋음",
  HIGHER: "높을수록 좋음",
  CONTEXT: "같은 조건끼리 비교",
};

export const SOURCE_KIND_LABEL: Record<SourceKind, { label: string; tone: "info" | "good" | "neutral" }> = {
  REGULATOR: { label: "감독기관", tone: "info" },
  ASSOCIATION: { label: "협회", tone: "good" },
  RATING_AGENCY: { label: "신용평가사", tone: "neutral" },
};
