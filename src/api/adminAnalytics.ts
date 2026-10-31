import { query, request } from "./client";

/**
 * 운영 분석(S-220~S-222, WP22)이 쓰는 호출과 타입. 계약은 docs/contracts/api/wp22-risk-analytics.yml,
 * 숫자의 정의는 docs/domain/business-rules.md "WP22 — 리스크 지표 정의". 공용 types.ts 는 고치지 않고 여기에 둔다.
 */

/** 월말 상태·연체 구간(§22.1). 60일 이상은 기한이익상실과 같다. */
export type RiskState = "CURRENT" | "DPD_1_29" | "DPD_30_59" | "DPD_60_89" | "DPD_90_PLUS" | "PAID_OFF";
export type DelinquencyBucket = Exclude<RiskState, "CURRENT" | "PAID_OFF">;

export interface RollRateCell { to: RiskState; contracts: number; balance: number; contractRatio: number; balanceRatio: number }
export interface RollRateRow { from: RiskState; contracts: number; balance: number; unclosed: number; cells: RollRateCell[] }
export interface RollRateMatrix {
  month: string | null;
  previousMonth: string | null;
  availableMonths: string[];
  states: { code: RiskState; label: string }[];
  rows: RollRateRow[];
  newContracts: number;
  asOf: string;
}

export interface VintagePoint { mob: number; month: string; closedContracts: number; delinquentContracts: number; delinquentBalance: number; ratio: number }
export interface VintageCohort { cohort: string; contracts: number; principal: number; points: VintagePoint[] }
export interface VintageReport { thresholdDays: number; maxMob: number; cohorts: VintageCohort[]; asOf: string }

export type FunnelStageCode = "APPLIED" | "DECIDED" | "APPROVED_ANY" | "EXECUTED" | "PAID_OFF";
export interface FunnelStage { code: FunnelStageCode; label: string; count: number; stepRatio: number | null; ratioOfApplied: number }
export interface FunnelDecision { decision: "APPROVED" | "CONDITIONAL" | "REJECTED"; count: number; ratio: number }
export interface FunnelRow { productCode: string | null; productName: string; stages: FunnelStage[]; decisions: FunnelDecision[]; cancelled: number }
export interface FunnelReport { total: FunnelRow; products: FunnelRow[]; asOf: string }

export interface NextStep { code: "ACCELERATION_NOTICE" | "ACCELERATION" | "CLASS_CHANGE"; label: string; dueOn: string; daysLeft: number }
export interface CollectionItem {
  contractId: number;
  contractNo: string;
  sandboxId: number;
  userEmailMasked: string;
  productName: string;
  status: "OVERDUE" | "DEFAULTED";
  assetClass: string;
  bucket: DelinquencyBucket;
  overdueDays: number;
  startedOn: string;
  asOfDate: string;
  businessDate: string;
  unpaidPrincipal: number;
  unpaidInterest: number;
  overdueInterest: number;
  totalDue: number;
  noticeSentOn: string | null;
  acceleratedOn: string | null;
  nextStep: NextStep | null;
  notes: number;
  lastNoteAt: string | null;
}
export interface CollectionBucketSummary { bucket: DelinquencyBucket; label: string; contracts: number; totalDue: number }
export interface CollectionQueue { bucket: DelinquencyBucket | null; summary: CollectionBucketSummary[]; items: CollectionItem[]; asOf: string }
export interface CollectionNote { id: number; contractId: number; contractNo: string; authorEmailMasked: string; body: string; createdAt: string }

export type AuditType = "SCREENING_OVERRIDE" | "CONTENT_PUBLISH" | "CONTENT_RETIRE" | "GLOBAL_BATCH" | "COLLECTION_NOTE";
export interface AuditEntry { id: string; type: AuditType; occurredAt: string; actorEmailMasked: string; target: string; summary: string }
export interface AuditPage { items: AuditEntry[]; page: number; size: number; totalPages: number; totalItems: number }

/** 메모 길이(§22.5, 앞뒤 공백 제외). */
export const NOTE_MIN = 10;
export const NOTE_MAX = 500;

export const adminAnalyticsApi = {
  rollRates: (month?: string) => request<RollRateMatrix>(`/admin/analytics/roll-rates${query({ month })}`),
  vintages: () => request<VintageReport>("/admin/analytics/vintages"),
  funnel: () => request<FunnelReport>("/admin/analytics/funnel"),
  collections: (bucket?: DelinquencyBucket | "") => request<CollectionQueue>(`/admin/collections${query({ bucket })}`),
  notes: (contractId: number) => request<CollectionNote[]>(`/admin/collections/${contractId}/notes`),
  addNote: (contractId: number, body: string) =>
    request<CollectionNote>(`/admin/collections/${contractId}/notes`, { method: "POST", body: { body } }),
  audit: (params: { type?: AuditType | ""; page?: number; size?: number } = {}) =>
    request<AuditPage>(`/admin/audit${query({ type: params.type, page: params.page, size: params.size })}`),
};
