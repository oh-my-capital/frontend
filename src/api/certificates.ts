import { query, request } from "./client";
import type { ContractStatus, Disclosure, RepaymentMethod } from "./types";

/**
 * WP21 — 증명서 발급(FR-40, S-210·S-211)·납입 캘린더(FR-41, S-212). 계약은 docs/contracts/api/wp21-certificates-calendar.yml.
 * 타입은 공용 types.ts 를 고치지 않고 이 파일에 둔다(동시 작업 규칙). 전부 로그인 필요, 본인 샌드박스만.
 * 증명서 조회(GET)는 발급 이력에 한 행을 남기지만, 같은 영업일·같은 내용이면 같은 발급번호를 돌려준다(issue.reused).
 */

export type CertificateType = "BALANCE" | "PAYOFF" | "TRANSACTIONS";
/** 경로 값(소문자). */
export type CertificatePath = "balance" | "payoff" | "transactions";
export type TransactionKind = "AUTO_DEBIT" | "MANUAL" | "PREPAYMENT_PARTIAL" | "PREPAYMENT_FULL";

export interface CertificateIssue {
  issueNo: string;
  seq: number;
  type: CertificateType;
  typeName: string;
  contractId: number;
  contractNo: string;
  issuedOn: string;
  periodFrom: string | null;
  periodTo: string | null;
  createdAt: string;
  reused: boolean;
}

export interface CertificateHolder { label: string; maskedEmail: string }

export interface CertificateContract {
  id: number;
  contractNo: string;
  productName: string;
  startDate: string;
  principal: number;
  contractRate: number;
  termMonths: number;
  repaymentMethod: RepaymentMethod;
  maturityDate: string;
  status: ContractStatus;
  assetClass: string;
}

export interface BalanceSection {
  asOf: string;
  outstandingPrincipal: number;
  unpaidPrincipal: number;
  unpaidInterest: number;
  unpaidInstallments: number;
  acceleratedPrincipal: number;
  overdueInterest: number;
  overdueDays: number;
  acceleratedOn: string | null;
  amountDueNow: number;
}

export interface PayoffSection {
  closedOn: string;
  totalPrincipal: number;
  totalInterest: number;
  totalOverdueInterest: number;
  totalFee: number;
  totalPaid: number;
  transactionCount: number;
  finalTransactionType: TransactionKind | null;
  finalTransactionDate: string | null;
}

export interface TransactionLine {
  id: number;
  businessDate: string;
  type: TransactionKind;
  totalAmount: number;
  fee: number;
  overdueInterest: number;
  interest: number;
  principal: number;
  principalAfter: number;
  allocations: { installmentNo: number; interest: number; principal: number }[];
}

export interface TransactionsSection {
  from: string;
  to: string;
  openingPrincipal: number;
  closingPrincipal: number;
  rows: TransactionLine[];
  totals: { count: number; totalAmount: number; fee: number; overdueInterest: number; interest: number; principal: number };
}

export interface Certificate {
  issue: CertificateIssue;
  holder: CertificateHolder;
  contract: CertificateContract;
  balance: BalanceSection | null;
  payoff: PayoffSection | null;
  transactions: TransactionsSection | null;
  notice: string;
  disclosure: Disclosure;
}

export type CalendarItemStatus = "PAID" | "ACCELERATED" | "OVERDUE" | "DUE" | "SCHEDULED";

export interface CalendarItem {
  contractId: number;
  contractNo: string;
  productName: string;
  installmentNo: number;
  dueDate: string;
  adjustedDueDate: string;
  paidOn: string | null;
  payment: number;
  paid: number;
  remaining: number;
  status: CalendarItemStatus;
}

export interface CalendarDay {
  date: string;
  /** 1 = 월 … 7 = 일 */
  dayOfWeek: number;
  weekend: boolean;
  today: boolean;
  past: boolean;
  payment: number;
  paid: number;
  remaining: number;
  items: CalendarItem[];
}

export interface PaymentCalendar {
  month: string;
  businessDate: string;
  firstDate: string;
  lastDate: string;
  payment: number;
  paid: number;
  remaining: number;
  count: number;
  statusCounts: { paid: number; accelerated: number; overdue: number; due: number; scheduled: number };
  days: CalendarDay[];
}

export const certificatesApi = {
  issue: (contractId: number, type: CertificatePath, period?: { from?: string; to?: string }, signal?: AbortSignal) =>
    request<Certificate>(`/sandbox/contracts/${contractId}/certificates/${type}${query({ from: period?.from, to: period?.to })}`, { signal }),
  history: (contractId?: number, signal?: AbortSignal) => request<CertificateIssue[]>(`/sandbox/certificates${query({ contractId })}`, { signal }),
  calendar: (month?: string, signal?: AbortSignal) => request<PaymentCalendar>(`/sandbox/calendar${query({ month })}`, { signal }),
};
