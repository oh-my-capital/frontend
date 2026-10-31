import { request } from "./client";
import type { Disclosure, RepaymentMethod } from "./types";

/**
 * 대환 비교(S-170)·DSR 계산기(S-171) 호출과 타입. WP17 소유. 로그인 없이 부른다(security: []).
 * 계약은 docs/contracts/api/wp17-refinance-dsr.yml, 계산 규칙은 business-rules.md "WP17" 절·골든 예시 14·15.
 * types.ts 는 고치지 않고 새 타입을 여기에 둔다.
 */

export interface RefinanceRequest {
  existing: { balance: number; annualRate: number; remainingInstallments: number; repaymentMethod: RepaymentMethod; prepaymentFeeRate: number; startDate: string };
  newLoan: { annualRate: number; termMonths: number; repaymentMethod: RepaymentMethod; upfrontCost: number };
  refinanceDate: string;
}

export interface RefinanceLoanSummary {
  principal: number;
  annualRate: number;
  installments: number;
  repaymentMethod: RepaymentMethod;
  maturityDate: string;
  monthlyPayment: number | null;
  firstPayment: number;
  totalInterest: number;
  totalPayment: number;
}

export interface RefinanceRow {
  installmentNo: number;
  existingPayment: number;
  existingInterest: number;
  newPayment: number;
  newInterest: number;
  interestSaving: number;
  cumulativeSaving: number;
  recovered: boolean;
}

export interface RefinanceResult {
  refinanceDate: string;
  existing: RefinanceLoanSummary;
  newLoan: RefinanceLoanSummary;
  cost: { prepaymentFee: number; feeRate: number; remainingDays: number; loanDays: number; feeWaived: boolean; upfrontCost: number; total: number };
  interestSaving: number;
  netBenefit: number;
  beneficial: boolean;
  breakevenInstallment: number | null;
  monthlyPaymentDifference: number;
  rows: RefinanceRow[];
  disclosure: Disclosure;
}

export type DebtType = "CREDIT_LOAN" | "AUTO_LOAN" | "MORTGAGE" | "CARD_LOAN" | "OTHER";
export const DEBT_TYPE_LABEL: Record<DebtType, string> = { CREDIT_LOAN: "신용대출", AUTO_LOAN: "자동차 금융", MORTGAGE: "주택담보대출", CARD_LOAN: "카드론", OTHER: "기타" };
export const DEBT_TYPES: DebtType[] = ["CREDIT_LOAN", "AUTO_LOAN", "MORTGAGE", "CARD_LOAN", "OTHER"];

export interface DsrDebt { type: DebtType; balance: number; annualRate: number; remainingMonths: number; repaymentMethod: RepaymentMethod }
export interface DsrNewLoan { annualRate: number; termMonths: number; repaymentMethod: RepaymentMethod }
export interface DsrRequest { annualIncome: number; debts: DsrDebt[]; newLoan: DsrNewLoan }

export type DsrBasis = "NEXT_12_PAYMENTS" | "BULLET_CONVERTED";
export interface DsrDebtService extends DsrDebt { index: number; annualPrincipal: number; annualInterest: number; annualDebtService: number; basis: DsrBasis }
export interface DsrMethodLimit { repaymentMethod: RepaymentMethod; limit: number; newAnnualDebtService: number; dsrAfter: number; requested: boolean }

export interface DsrResult {
  annualIncome: number;
  debts: DsrDebtService[];
  totalAnnualDebtService: number;
  dsrRatio: number;
  dsrLimit: number;
  allowedAnnualDebtService: number;
  remainingAnnualRoom: number;
  monthlyRoom: number;
  exceeded: boolean;
  bulletPrincipalYears: number;
  maxDebts: number;
  newLoan: DsrNewLoan;
  additionalLimit: number;
  limits: DsrMethodLimit[];
  disclosure: Disclosure;
}

/** 화면에서 먼저 막는 최대 부채 건수. 서버는 규칙 세트 dsrCalculator.max_debts 로 다시 검사하고 응답 maxDebts 로 알려 준다. */
export const DSR_MAX_DEBTS_DEFAULT = 10;

export const refinanceApi = {
  refinance: (body: RefinanceRequest, signal?: AbortSignal) => request<RefinanceResult>("/calculators/refinance", { method: "POST", body, signal }),
  dsr: (body: DsrRequest, signal?: AbortSignal) => request<DsrResult>("/calculators/dsr", { method: "POST", body, signal }),
};
