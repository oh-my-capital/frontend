import { query, request } from "./client";
import type { Disclosure, RepaymentMethod } from "./types";

/**
 * 단위경제 계산기(S-330, 공개)·포트폴리오 손익(S-331, 운영) 호출과 타입. WP33 소유. types.ts 는 고치지 않고 여기에 둔다.
 * 계약은 docs/contracts/api/wp33-unit-economics.yml, 계산 규칙은 business-rules.md "WP33 — 단위경제·포트폴리오 손익"·골든 예시 20.
 * 기본 가정값(조달금리·대손율·판관비율·모집수수료율·레버리지)은 규칙 세트 unitEconomics 의 교육용 가정값이다.
 */

export interface UnitEconomicsRequest {
  principal: number;
  termMonths: number;
  annualRate: number;
  repaymentMethod: RepaymentMethod;
  fundingRate?: number | null;
  annualLossRate?: number | null;
  annualOpexRate?: number | null;
  acquisitionFeeRate?: number | null;
  leverage?: number | null;
  equityRatio?: number | null;
}

export type UnitEconomicsItemCode = "INTEREST_INCOME" | "FUNDING_COST" | "CREDIT_LOSS" | "OPERATING_EXPENSE" | "ACQUISITION_COST" | "PRETAX_PROFIT";
export interface UnitEconomicsItem { code: UnitEconomicsItemCode; label: string; lifetimeAmount: number; annualAmount: number; ratio: number }
export interface UnitEconomicsSensitivityCell { annualLossRate: number; fundingRate: number; pretaxProfit: number; roa: number; base: boolean }
export interface UnitEconomicsAssumption { field: string; label: string; value: number; kind: "assumption"; note: string }

export interface UnitEconomicsResult {
  input: {
    principal: number;
    termMonths: number;
    annualRate: number;
    repaymentMethod: RepaymentMethod;
    fundingRate: number;
    annualLossRate: number;
    annualOpexRate: number;
    acquisitionFeeRate: number;
    leverage: number;
    equityRatio: number | null;
    defaultsApplied: string[];
  };
  schedule: { monthlyPayment: number | null; totalInterest: number; totalPayment: number; sumOpeningBalance: number; averageBalance: number };
  items: UnitEconomicsItem[];
  pretaxProfit: number;
  roa: number;
  roe: number;
  breakevenLossRate: number;
  spread: number;
  rateCap: { rateCap: number; totalInterest: number; averageBalance: number; fundingCost: number; operatingExpense: number; acquisitionCost: number; marginalLossRate: number };
  sensitivity: { lossRates: number[]; fundingRates: number[]; cells: UnitEconomicsSensitivityCell[] };
  assumptions: UnitEconomicsAssumption[];
  disclosure: Disclosure;
}

export interface PnlMonth {
  month: string;
  closedSandboxes: number;
  contracts: number;
  openingBalance: number;
  closingBalance: number;
  averageBalance: number;
  interestIncome: number;
  overdueInterestIncome: number;
  feeIncome: number;
  totalRevenue: number;
  fundingCost: number;
  provisionOpening: number;
  provisionClosing: number;
  provisionExpense: number;
  pretaxProfit: number;
  annualizedRoa: number;
}

export interface PnlTotals {
  months: number;
  interestIncome: number;
  overdueInterestIncome: number;
  feeIncome: number;
  totalRevenue: number;
  fundingCost: number;
  provisionExpense: number;
  pretaxProfit: number;
  averageBalance: number;
  annualizedRoa: number;
}

export interface PnlReport { months: number; fundingRate: number; ruleSetVersion: string; rows: PnlMonth[]; totals: PnlTotals; notice: string; asOf: string }

export const unitEconomicsApi = {
  calculate: (body: UnitEconomicsRequest, signal?: AbortSignal) => request<UnitEconomicsResult>("/calculators/unit-economics", { method: "POST", body, signal }),
  pnl: (months: number) => request<PnlReport>(`/admin/analytics/pnl${query({ months })}`),
};
