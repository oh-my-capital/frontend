import { query, request } from "./client";
import type { Disclosure } from "./types";

/**
 * 상환 유예·만기 연장(WP18, FR-31). 계약: docs/contracts/api/wp18-restructure.yml.
 * 타입은 공용 types.ts 가 아니라 여기에 둔다(2단계 공통 브리프 §3). 적용(POST)은 Idempotency-Key 를 붙인다.
 */
export type RestructureType = "DEFERMENT" | "EXTENSION";

export const RESTRUCTURE_LABEL: Record<RestructureType, string> = {
  DEFERMENT: "원금 상환 유예",
  EXTENSION: "만기 연장",
};

/** 비교표 한 쪽(전 = 현재 회차표의 남은 회차, 후 = 재산정 회차표). */
export interface RestructureTerms {
  outstandingPrincipal: number;
  firstInstallmentNo: number;
  remainingInstallments: number;
  interestOnlyInstallments: number;
  interestOnlyPayment: number | null;
  /** 원금을 갚는 첫 회차 납입액 */
  monthlyPayment: number;
  finalPayment: number;
  remainingInterest: number;
  remainingPayment: number;
  termMonths: number;
  maturityDate: string;
  finalDueDate: string;
}

export interface RestructureChange {
  monthlyPayment: number;
  remainingInterest: number;
  installments: number;
}

export interface RestructureLimit {
  minMonths: number;
  maxMonths: number;
  maxTotalMonths: number;
  usedMonths: number;
  availableMonths: number;
}

export interface RestructurePolicy {
  eligible: boolean;
  ineligibleCode: string | null;
  ineligibleMessage: string | null;
  paidInstallments: number;
  minPaidInstallments: number;
  remainingInstallments: number;
  minInstallmentsAfterDeferment: number;
  deferment: RestructureLimit;
  extension: RestructureLimit;
  reasons: { code: string; label: string }[];
  assumption: string;
}

export interface RestructureRow {
  installmentNo: number;
  dueDate: string;
  adjustedDueDate: string;
  principal: number;
  interest: number;
  payment: number;
  balanceAfter: number;
}

export interface RestructureQuote {
  contractId: number;
  type: RestructureType;
  months: number;
  asOf: string;
  outstandingPrincipal: number;
  annualRate: number;
  before: RestructureTerms;
  after: RestructureTerms;
  change: RestructureChange;
  schedule: RestructureRow[];
  policy: RestructurePolicy;
  disclosure: Disclosure;
}

export interface ContractModification {
  id: number;
  contractId: number;
  type: RestructureType;
  eventType: "DEFERMENT_APPLIED" | "MATURITY_EXTENDED";
  months: number;
  reasonCode: string;
  reasonLabel: string;
  businessDate: string;
  outstandingPrincipal: number;
  before: RestructureTerms;
  after: RestructureTerms;
  change: RestructureChange;
  revision: number;
  ruleSetVersion: string;
  createdAt: string;
  disclosure: Disclosure;
}

export interface RestructureHistory {
  items: ContractModification[];
  policy: RestructurePolicy;
}

export interface RestructureRequest {
  type: RestructureType;
  months: number;
  reasonCode: string;
}

export const restructureApi = {
  history: (contractId: number, signal?: AbortSignal) => request<RestructureHistory>(`/sandbox/contracts/${contractId}/restructures`, { signal }),
  quote: (contractId: number, type: RestructureType, months: number, signal?: AbortSignal) =>
    request<RestructureQuote>(`/sandbox/contracts/${contractId}/restructure-quote${query({ type, months })}`, { signal }),
  /** idempotencyKey 를 넘기면 재시도 때 같은 키를 쓴다(같은 키 + 같은 본문 = 같은 응답). */
  apply: (contractId: number, body: RestructureRequest, idempotencyKey: string) =>
    request<ContractModification>(`/sandbox/contracts/${contractId}/restructures`, { method: "POST", body, idempotency: idempotencyKey }),
};
