import { request } from "./client";
import type { Disclosure } from "./types";

/**
 * 자동차 금융 비교 계산기(S-160, FR-29, WP16). 로그인 없이 부른다(security: []).
 * 경로·본문·응답은 docs/contracts/api/wp16-auto-finance.yml 그대로다. types.ts 는 고치지 않고 이 파일에 타입을 둔다.
 * 계산 규칙은 docs/domain/business-rules.md "WP16 — 자동차 금융 비교", 골든 값은 예시 12·13.
 */

/** 할부 · 금융리스 · 운용리스 · 장기렌트. 응답 options 는 항상 이 순서다. */
export type AutoFinanceType = "INSTALLMENT" | "FINANCIAL_LEASE" | "OPERATING_LEASE" | "LONG_TERM_RENT";
export type VehicleOwner = "CUSTOMER" | "COMPANY";
export type MaturityChoice = "KEEP" | "BUYOUT" | "RETURN" | "RELEASE";

export interface AutoFinanceRequest {
  /** 차량가(원) */
  vehiclePrice: number;
  /** 선수금(할부)·선납금(리스·렌트). 원금에서 뺀다 */
  downPayment: number;
  /** 보증금(리스·렌트만). 만기에 반환하거나 인수가에서 뺀다 */
  deposit: number;
  termMonths: number;
  /** 연이율 %(할부 금리). 리스·렌트는 방식별 가산을 더한다 */
  annualRate: number;
  /** 잔존가치율 %. 생략하면 기간별 기본값 */
  residualValueRate?: number | null;
}

export interface AutoFinanceMaturityOption {
  code: MaturityChoice;
  label: string;
  /** 만기 정산액(+ 내는 돈, − 돌려받는 돈). 재리스·재계약은 null */
  settlement: number | null;
  description: string;
}

export interface AutoFinanceBreakdown {
  retainedVehicleValue: number;
  vehicleUsage: number;
  interest: number;
  upkeep: number;
}

export interface AutoFinanceOption {
  type: AutoFinanceType;
  label: string;
  annualRate: number;
  financedAmount: number;
  balloonAmount: number;
  monthlyFinancePayment: number;
  lastFinancePayment: number;
  monthlyIncludedCost: number;
  monthlyPayment: number;
  monthlyUpkeep: number;
  firstInterest: number;
  totalInterest: number;
  upfrontPayment: number;
  totalMonthlyPayments: number;
  totalUpkeep: number;
  maturitySettlement: number;
  totalSpend: number;
  ownedVehicleValue: number;
  effectiveCost: number;
  registeredOwner: VehicleOwner;
  ownerAtMaturity: VehicleOwner;
  assumedMaturityOption: "KEEP" | "BUYOUT" | "RETURN";
  maturityOptions: AutoFinanceMaturityOption[];
  breakdown: AutoFinanceBreakdown;
}

export interface AutoFinanceMonthlyCosts { insurance: number; carTax: number; maintenance: number; total: number }

export interface AutoFinanceResponse {
  ruleSetVersion: string;
  input: {
    vehiclePrice: number;
    downPayment: number;
    deposit: number;
    termMonths: number;
    annualRate: number;
    residualValueRate: number;
    residualValueRateDefaulted: boolean;
  };
  residualValue: number;
  vehicleValueAtMaturity: number;
  options: AutoFinanceOption[];
  cheapestType: AutoFinanceType;
  assumptions: {
    rateSpreads: Record<AutoFinanceType, number>;
    ownerUpkeepMonthly: AutoFinanceMonthlyCosts;
    rentIncludedMonthly: AutoFinanceMonthlyCosts;
    notes: string[];
  };
  disclosure: Disclosure;
}

export const autoFinanceApi = {
  compare: (body: AutoFinanceRequest, signal?: AbortSignal) =>
    request<AutoFinanceResponse>("/calculators/auto-finance", { method: "POST", body, signal }),
};
