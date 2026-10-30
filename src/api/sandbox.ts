import { query, request } from "./client";
import type {
  Application, ApplicationRequest, ClockAdvanceRequest, ClockAdvanceResult, Contract, ContractEvent, ContractSummary, DepositRequest, LedgerEntry,
  Notification, NotificationsReadRequest, PrepaymentQuote, PrepaymentRequest, Product, Profile, Provision, RepaymentRequest, Sandbox, ScheduleRow, Transaction,
} from "./types";

/**
 * 내 모의 여신(S-11~S-17, tag sandbox)이 쓰는 호출. WP7 소유. 상품 목록 말고는 전부 로그인이 필요하다.
 * 쓰기 중 입금·신청·실행·상환·중도상환은 계약대로 Idempotency-Key 를 붙인다(client.ts 가 UUID 를 만든다).
 * 시간 진행(/sandbox/clock/advance)은 날짜마다 일마감을 돌리므로 응답까지 시간이 걸릴 수 있다. 화면은 진행 중 버튼을 비활성화한다.
 */
export const sandboxApi = {
  summary: (signal?: AbortSignal) => request<Sandbox>("/sandbox", { signal }),
  saveProfile: (body: Profile) => request<Profile>("/sandbox/profile", { method: "PUT", body }),
  deposit: (body: DepositRequest) => request<LedgerEntry>("/sandbox/settlement-account/deposits", { method: "POST", body, idempotency: true }),
  ledger: (signal?: AbortSignal) => request<LedgerEntry[]>("/sandbox/settlement-account/ledger", { signal }),
  advance: (body: ClockAdvanceRequest) => request<ClockAdvanceResult>("/sandbox/clock/advance", { method: "POST", body }),
  products: (signal?: AbortSignal) => request<Product[]>("/sandbox/products", { signal }),

  applications: (signal?: AbortSignal) => request<Application[]>("/sandbox/applications", { signal }),
  apply: (body: ApplicationRequest) => request<Application>("/sandbox/applications", { method: "POST", body, idempotency: true }),
  application: (id: number, signal?: AbortSignal) => request<Application>(`/sandbox/applications/${id}`, { signal }),
  accept: (id: number) => request<Application>(`/sandbox/applications/${id}/accept`, { method: "POST" }),
  cancel: (id: number) => request<Application>(`/sandbox/applications/${id}/cancel`, { method: "POST" }),
  execute: (id: number) => request<Contract>(`/sandbox/applications/${id}/execute`, { method: "POST", idempotency: true }),

  contracts: (status?: string, signal?: AbortSignal) => request<ContractSummary[]>(`/sandbox/contracts${query({ status })}`, { signal }),
  contract: (id: number, signal?: AbortSignal) => request<Contract>(`/sandbox/contracts/${id}`, { signal }),
  schedules: (id: number, signal?: AbortSignal) => request<ScheduleRow[]>(`/sandbox/contracts/${id}/schedules`, { signal }),
  transactions: (id: number, signal?: AbortSignal) => request<Transaction[]>(`/sandbox/contracts/${id}/transactions`, { signal }),
  events: (id: number, signal?: AbortSignal) => request<ContractEvent[]>(`/sandbox/contracts/${id}/events`, { signal }),
  provisions: (id: number, signal?: AbortSignal) => request<Provision[]>(`/sandbox/contracts/${id}/provisions`, { signal }),
  repay: (id: number, body: RepaymentRequest) => request<Transaction>(`/sandbox/contracts/${id}/repayments`, { method: "POST", body, idempotency: true }),
  /** principalAmount 없으면 전액. 연체 중이면 409 OVERDUE_FIRST. */
  prepaymentQuote: (id: number, principalAmount?: number | null, signal?: AbortSignal) =>
    request<PrepaymentQuote>(`/sandbox/contracts/${id}/prepayment-quote${query({ principalAmount: principalAmount ?? undefined })}`, { signal }),
  prepay: (id: number, body: PrepaymentRequest) => request<Transaction>(`/sandbox/contracts/${id}/prepayments`, { method: "POST", body, idempotency: true }),

  notifications: (unreadOnly?: boolean, signal?: AbortSignal) => request<Notification[]>(`/sandbox/notifications${query({ unreadOnly: unreadOnly ? true : undefined })}`, { signal }),
  markRead: (body: NotificationsReadRequest) => request<void>("/sandbox/notifications/read", { method: "POST", body }),
};
