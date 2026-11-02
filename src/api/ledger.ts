import { query, request } from "./client";

/**
 * 회계 원장·대사(S-300~S-302, WP30)가 쓰는 호출과 타입. 계약은 docs/contracts/api/wp30-ledger.yml,
 * 분개 규칙·대사 정의는 docs/domain/business-rules.md "WP30 — 회계 분개·일일 대사". 공용 types.ts 는 고치지 않고 여기에 둔다.
 */

export type LedgerEventType = "EXECUTION" | "REPAYMENT" | "PREPAYMENT" | "WITHDRAWAL" | "ACCELERATION" | "PROVISION" | "PROVISION_RELEASE";
export type ReconciliationStatus = "MATCHED" | "MISMATCHED" | "FAILED";
export type AccountType = "ASSET" | "CONTRA_ASSET" | "REVENUE" | "EXPENSE";

export interface JournalLine { lineNo: number; accountCode: string; accountName: string; debit: number; credit: number }
export interface JournalEntry {
  id: number;
  sandboxId: number;
  contractId: number;
  contractNo: string;
  businessDate: string;
  eventType: LedgerEventType;
  eventLabel: string;
  sourceType: "CONTRACT_EVENT" | "REPAYMENT_TX" | "PROVISION" | "CONTRACT";
  sourceId: number;
  memo: string;
  totalDebit: number;
  totalCredit: number;
  lines: JournalLine[];
}
export interface JournalPage { items: JournalEntry[]; page: number; size: number; totalPages: number; totalItems: number }

export interface TrialBalanceRow {
  code: string;
  name: string;
  type: AccountType;
  normalSide: "DEBIT" | "CREDIT";
  debitTotal: number;
  creditTotal: number;
  debitBalance: number;
  creditBalance: number;
}
export interface TrialBalance {
  date: string | null;
  sandboxId: number | null;
  rows: TrialBalanceRow[];
  totals: { debitTotal: number; creditTotal: number; debitBalance: number; creditBalance: number };
  balanced: boolean;
  entries: number;
  netIncome: number;
  notice: string;
}

export interface Reconciliation {
  id: number;
  sandboxId: number;
  userEmailMasked: string;
  businessDate: string;
  status: ReconciliationStatus;
  loanSubledger: number;
  loanLedger: number;
  loanDifference: number;
  provisionSubledger: number;
  provisionLedger: number;
  provisionDifference: number;
  provisionBaseMonth: string | null;
  postedEntries: number;
  message: string | null;
  createdAt: string;
}
export interface ReconciliationSummary { sandboxes: number; matched: number; mismatched: number; failed: number; lastRunAt: string | null }
export interface ReconciliationPage { summary: ReconciliationSummary; items: Reconciliation[]; page: number; size: number; totalPages: number; totalItems: number }

export interface JournalFilter { from?: string; to?: string; contractNo?: string; eventType?: LedgerEventType | ""; sandboxId?: string; page?: number; size?: number }

export const ledgerApi = {
  journals: (f: JournalFilter = {}) =>
    request<JournalPage>(`/admin/ledger/journals${query({
      from: f.from || undefined, to: f.to || undefined, contractNo: f.contractNo || undefined, eventType: f.eventType || undefined,
      sandboxId: f.sandboxId || undefined, page: f.page, size: f.size,
    })}`),
  trialBalance: (params: { date?: string; sandboxId?: string } = {}) =>
    request<TrialBalance>(`/admin/ledger/trial-balance${query({ date: params.date || undefined, sandboxId: params.sandboxId || undefined })}`),
  reconciliations: (params: { status?: ReconciliationStatus | ""; sandboxId?: string; page?: number; size?: number } = {}) =>
    request<ReconciliationPage>(`/admin/ledger/reconciliations${query({
      status: params.status || undefined, sandboxId: params.sandboxId || undefined, page: params.page, size: params.size,
    })}`),
};
