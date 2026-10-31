import { query, request } from "./client";
import type { Disclosure, EmploymentType, Money, Rate, RepaymentMethod } from "./types";

/**
 * 상품 안내(S-230·S-231, WP23). 로그인 없이 읽는다. 계약: docs contracts/api/wp23-products.yml.
 * 금리 범위·대표 예시는 서버가 규칙 세트와 상환 스케줄 엔진으로 계산한 값이다. 화면은 숫자를 만들지 않고 그대로 보여 준다.
 */
export type ProductCategoryCode = "CREDIT" | "AUTO";

export interface ProductCategory {
  code: ProductCategoryCode;
  label: string;
  description: string;
  /** 이 유형의 상품 수(거르기와 무관하게 전체 기준) */
  count: number;
}

export interface RateRange {
  min: Rate;
  max: Rate;
  /** 최고 금리가 법정 최고금리에 걸렸는지 */
  capped: boolean;
  /** 산정 방식 한 문장 */
  basis: string;
}

export interface AmountRange {
  min: Money;
  /** 담보 상품은 null(차량가 × LTV) */
  max: Money | null;
  ltvRate: Rate | null;
  label: string;
}

export interface RepresentativeExample {
  amount: Money;
  termMonths: number;
  repaymentMethod: RepaymentMethod;
  vehicleValue: Money | null;
  creditBand: string;
  scoreRange: string;
  employmentType: EmploymentType | null;
  autoDebit: boolean;
  baseRate: Rate;
  spread: Rate;
  discount: Rate;
  /** 대표 금리 */
  rate: Rate;
  rateCapped: boolean;
  /** 원리금균등의 월 납입액. 다른 방식은 null */
  monthlyPayment: Money | null;
  firstPayment: Money;
  lastPayment: Money;
  totalInterest: Money;
  /** 총상환액 = 원금 + 총이자 */
  totalPayment: Money;
  ruleSetVersion: string;
  conditions: string;
}

export interface ProductGuideSummary {
  code: string;
  name: string;
  category: ProductCategoryCode;
  categoryLabel: string;
  target: string;
  rateRange: RateRange;
  amountRange: AmountRange;
  allowedTerms: number[];
  allowedMethods: RepaymentMethod[];
  prepaymentFeeRate: Rate;
  requiresCollateral: boolean;
  collateralType: "NONE" | "VEHICLE";
  /** 빈 배열 = 고용 조건 없음 */
  eligibleEmployment: EmploymentType[];
  representative: RepresentativeExample;
}

export interface ProductCatalog {
  categories: ProductCategory[];
  products: ProductGuideSummary[];
  representativeBasis: string;
  notice: string;
  disclosure: Disclosure;
}

export interface BandRate { band: string; minScore: number; maxScore: number; spread: Rate; rate: Rate; incomeMultiple: number }
export interface RateDiscount { code: string; label: string; rate: Rate; condition: string }

export interface ProductGuideDetail extends ProductGuideSummary {
  categoryDescription: string;
  description: string;
  baseRate: Rate;
  bandRates: BandRate[];
  discounts: RateDiscount[];
  /** 이 기간이 지나면 중도상환수수료 없음 */
  prepaymentFeeWaiverYears: number;
  /** 필요 조건(교육용, 실제 서류·조회 없음) */
  requirements: string[];
  notes: string[];
  notice: string;
  disclosure: Disclosure;
}

export const productsApi = {
  list: (category?: ProductCategoryCode, signal?: AbortSignal) => request<ProductCatalog>(`/products${query({ category })}`, { signal }),
  detail: (code: string, signal?: AbortSignal) => request<ProductGuideDetail>(`/products/${encodeURIComponent(code)}`, { signal }),
};

/** "이 조건으로 계산" — 상환 스케줄 계산기(S-06)가 읽는 쿼리(principal·term·rate)로 대표 예시 조건을 넘긴다. */
export function scheduleLink(r: RepresentativeExample): string {
  const params = new URLSearchParams({ principal: String(r.amount), term: String(r.termMonths), rate: String(r.rate) });
  return `/calculators/schedule?${params.toString()}`;
}

/** "모의 신청" — 신청 화면(S-13)이 이 상품을 미리 고른다. */
export function applyLink(code: string): string {
  return `/sandbox/apply?${new URLSearchParams({ product: code }).toString()}`;
}
