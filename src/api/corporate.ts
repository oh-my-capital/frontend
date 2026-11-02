import { request } from "./client";
import type { Disclosure } from "./types";

/**
 * 기업 심사 시뮬레이터(S-320, FR-53) 호출과 타입. WP32 소유. 로그인 없이 부른다(security: []).
 * 계약은 docs/contracts/api/wp32-corporate.yml, 계산 규칙은 business-rules.md "WP32 — 기업 심사" 절·골든 예시 19.
 * types.ts 는 고치지 않고 새 타입을 여기에 둔다.
 */

export type CorporateCustomerType = "SOLE_PROPRIETOR" | "CORPORATION";
export type CorporateAuthorityLevel = "AUTO" | "REVIEWER" | "TEAM_LEAD" | "COMMITTEE";
export type CorporateDecision = "APPROVED" | "CONDITIONAL" | "REJECTED";
export type CorporateOutcome = "PASS" | "FAIL" | "INFO";

export const CUSTOMER_TYPE_LABEL: Record<CorporateCustomerType, string> = { SOLE_PROPRIETOR: "개인사업자", CORPORATION: "법인" };

/**
 * 업종 선택지. 가산·제외 여부의 기준은 서버(규칙 세트 corporate.industries)이며, 여기 값은 폼 선택지와 보조 열 안내용이다.
 * 응답 industry 가 실제로 적용한 값을 돌려준다.
 */
export const INDUSTRIES: { code: string; label: string; surcharge: number | null; note?: string }[] = [
  { code: "MANUFACTURING", label: "제조업", surcharge: 0 },
  { code: "WHOLESALE_RETAIL", label: "도소매업", surcharge: 0.5 },
  { code: "IT_SERVICE", label: "정보통신업", surcharge: 0.3 },
  { code: "CONSTRUCTION", label: "건설업", surcharge: 1.5, note: "수주·공사대금 회수 변동" },
  { code: "ACCOMMODATION_FOOD", label: "숙박·음식점업", surcharge: 2, note: "폐업률·경기 민감" },
  { code: "REAL_ESTATE", label: "부동산업", surcharge: null, note: "교육용 제외" },
  { code: "GAMBLING", label: "사행산업", surcharge: null, note: "교육용 제외" },
];

export interface CorporateScreeningRequest {
  customerType: CorporateCustomerType;
  industryCode: string;
  businessYears: number;
  revenue: number;
  operatingIncome: number;
  interestExpense: number;
  totalBorrowings: number;
  equity: number;
  totalLiabilities: number;
  requestedAmount: number;
  termMonths: number;
}

export interface CorporateRatio { code: string; name: string; value: number | null; unit: "%" | "배" | "년"; formula: string; points: number; maxPoints: number; band: string }
export interface CorporateGradeBand { grade: number; minScore: number; spread: number | null; approvable: boolean }
export interface CorporateScore { total: number; maxTotal: number; grade: number; maxApprovableGrade: number; gradeBands: CorporateGradeBand[] }
export interface CorporateIndustry { code: string; label: string; surcharge: number | null; excluded: boolean; reason: string | null }
export interface CorporateRate { base: number; gradeSpread: number; industrySurcharge: number; uncapped: number; applied: number; cap: number; capped: boolean }
export interface CorporateLimitCandidate { rule: string; name: string; amount: number; basis: string; binding: boolean }
export interface CorporateRepayment { source: number; requiredCoverage: number; allowedAnnual: number; monthlyCapacity: number; beforeRounding: number }
export interface CorporateLimits { candidates: CorporateLimitCandidate[]; repayment: CorporateRepayment; finalLimit: number; bindingRule: string }
export interface CorporateAuthorityTier { maxAmount: number | null; level: CorporateAuthorityLevel; label: string }
export interface CorporateAuthority {
  level: CorporateAuthorityLevel | null;
  label: string | null;
  baseLevel: CorporateAuthorityLevel | null;
  escalated: boolean;
  amount: number | null;
  escalationFromGrade: number;
  tiers: CorporateAuthorityTier[];
}
export interface CorporateReason { orderNo: number; ruleCode: string; ruleName: string; input: string; threshold: string; outcome: CorporateOutcome; reasonCode: string | null; message: string }

export interface CorporateScreeningResult {
  decision: CorporateDecision;
  customerType: CorporateCustomerType;
  industry: CorporateIndustry;
  ratios: CorporateRatio[];
  score: CorporateScore;
  rate: CorporateRate | null;
  limits: CorporateLimits | null;
  decisionAmount: number | null;
  offeredAmount: number | null;
  monthlyPayment: number | null;
  authority: CorporateAuthority;
  reasonCodes: string[];
  reasons: CorporateReason[];
  disclosure: Disclosure;
}

/** 사유 코드 한국어 이름(business-rules WP32 §32.3·32.7). */
export const CORPORATE_REASON_LABEL: Record<string, string> = {
  BUSINESS_TOO_YOUNG: "업력 부족",
  REVENUE_MISSING: "매출 없음",
  CAPITAL_IMPAIRED: "완전자본잠식",
  INDUSTRY_EXCLUDED: "교육용 제외 업종",
  PRODUCT_CONSTRAINT: "상품 범위 밖",
  INTERNAL_GRADE_LOW: "내부등급 미달",
  LIMIT_REDUCED: "한도 축소",
  REPAYMENT_CAPACITY_SHORT: "상환능력 부족",
  LIMIT_BELOW_MIN: "한도가 상품 최소 미만",
};

export const corporateApi = {
  screen: (body: CorporateScreeningRequest, signal?: AbortSignal) =>
    request<CorporateScreeningResult>("/calculators/corporate-screening", { method: "POST", body, signal }),
};
