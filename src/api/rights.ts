import { request } from "./client";
import type { DateString, Disclosure, EmploymentType, Money, ScheduleRow, Transaction } from "./types";

/**
 * 청약철회(FR-35)·금리인하요구(FR-36) 호출과 타입. WP19 소유. 계약 조각 docs contracts/api/wp19-consumer-rights.yml 과 같다.
 * types.ts 는 고치지 않으므로 새 상태 WITHDRAWN 은 이 파일의 타입으로만 다룬다. 쓰기 두 개는 Idempotency-Key 를 붙인다.
 */

export const WITHDRAWN = "WITHDRAWN";

export interface LegalBasis {
  law: string;
  article: string;
  summary: string;
  sourceUrl: string;
  checkedOn: DateString;
}

/** 약정 이자 한 구간. interest = floor(balance × rate × days / 365) */
export interface InterestSegment {
  from: DateString;
  to: DateString;
  days: number;
  balance: Money;
  rate: number;
  interest: Money;
}

export type WithdrawalBlockedReason = "WITHDRAWAL_PERIOD_EXPIRED" | "CONTRACT_NOT_ACTIVE";

/** 철회할 수 없으면 withdrawable=false 이고 금액 항목은 null. */
export interface WithdrawalQuote {
  contractId: number;
  asOf: DateString;
  startDate: DateString;
  deadline: DateString;
  periodDays: number;
  elapsedDays: number;
  /** deadline − asOf. 0 이면 오늘이 마지막 날, 음수면 경과 */
  daysLeft: number;
  withdrawable: boolean;
  blockedReason: WithdrawalBlockedReason | null;
  outstandingPrincipal: Money | null;
  contractInterest: Money | null;
  interestSegments: InterestSegment[] | null;
  interestPaid: Money | null;
  /** contractInterest − interestPaid. 음수면 환급 */
  netInterest: Money | null;
  feeRefund: Money | null;
  prepaymentFee: Money;
  totalDue: Money | null;
  settlementBalance: Money;
  shortfall: Money | null;
  legalBasis: LegalBasis;
  disclosure: Disclosure;
}

export interface WithdrawalResult {
  contractId: number;
  status: typeof WITHDRAWN;
  withdrawnOn: DateString;
  quote: WithdrawalQuote;
  transaction: Transaction;
  cancelledInstallments: number;
}

export type RateCutDecision = "ACCEPTED" | "REJECTED";
export type RateCutReason = "NOT_ELIGIBLE" | "NO_IMPROVEMENT" | "BELOW_MIN_REDUCTION";

export interface RateCutResult {
  id: number;
  contractId: number;
  requestedOn: DateString;
  decision: RateCutDecision;
  reasonCode: RateCutReason | null;
  reasonMessage: string;
  previousRate: number;
  recomputedRate: number | null;
  appliedRate: number;
  reductionBp: number | null;
  minReductionBp: number;
  profile: { creditScore: number; creditBand: string | null; annualIncome: Money; employmentType: EmploymentType };
  previousPayment: Money;
  newPayment: Money | null;
  previousRemainingInterest: Money | null;
  newRemainingInterest: Money | null;
  remainingInstallments: number;
  revisedSchedule: (ScheduleRow & { revision?: number })[];
  nextAvailableOn: DateString;
  legalBasis: LegalBasis;
  disclosure: Disclosure;
}

export interface RateCutHistory {
  items: RateCutResult[];
  /** 요구가 없었으면 null(지금 가능) */
  nextAvailableOn: DateString | null;
  minReductionBp: number;
  minIntervalDays: number;
  legalBasis: LegalBasis;
}

export const rightsApi = {
  withdrawalQuote: (contractId: number, signal?: AbortSignal) =>
    request<WithdrawalQuote>(`/sandbox/contracts/${contractId}/withdrawal-quote`, { signal }),
  /** 409 WITHDRAWAL_PERIOD_EXPIRED | CONTRACT_NOT_ACTIVE | INSUFFICIENT_BALANCE */
  withdraw: (contractId: number) => request<WithdrawalResult>(`/sandbox/contracts/${contractId}/withdrawal`, { method: "POST", idempotency: true }),
  rateCutHistory: (contractId: number, signal?: AbortSignal) =>
    request<RateCutHistory>(`/sandbox/contracts/${contractId}/rate-cut-requests`, { signal }),
  /** 409 CONTRACT_NOT_ACTIVE | RATE_CUT_TOO_SOON, 422 PROFILE_REQUIRED */
  requestRateCut: (contractId: number) => request<RateCutResult>(`/sandbox/contracts/${contractId}/rate-cut-requests`, { method: "POST", idempotency: true }),
};
