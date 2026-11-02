import { request } from "./client";

/**
 * 규칙 변경 결재·백테스트(S-310~S-312, WP31) 호출과 타입. 계약은 docs/contracts/api/wp31-rule-changes.yml,
 * 규칙은 docs/domain/business-rules.md "WP31 — 규칙 변경 결재·시행·백테스트". 공용 types.ts 는 고치지 않고 여기에 둔다.
 */

/** ACTIVE 는 저장값이 아니라 조회 시 판정(결재됨 + 시행일 ≤ 오늘, 실제 날짜). */
export type RuleChangeStatus = "DRAFT" | "PENDING" | "APPROVED" | "ACTIVE" | "REJECTED";
export type RuleValueUnit = "POINT" | "PERCENT" | "PERCENT_POINT" | "MULTIPLE";
export type BacktestDecision = "APPROVED" | "CONDITIONAL" | "REJECTED";

export interface RuleKey {
  key: string;
  label: string;
  group: string;
  unit: RuleValueUnit;
  scale: number;
  min: number;
  max: number;
  currentValue: number;
}

export interface LockedFigure { key: string; label: string; value: string; sourceUrl: string; checkedOn: string | null }

export interface RuleKeyCatalog { latestVersion: string; keys: RuleKey[]; locked: LockedFigure[] }

export interface Operator { id: number; label: string }

export interface RuleChange {
  id: number;
  key: string;
  label: string;
  unit: RuleValueUnit;
  scale: number;
  oldValue: number;
  newValue: number;
  reason: string;
  effectiveFrom: string;
  status: RuleChangeStatus;
  baseVersion: string;
  targetVersion: string | null;
  drafter: Operator;
  reviewer: Operator | null;
  reviewComment: string | null;
  createdAt: string;
  submittedAt: string | null;
  reviewedAt: string | null;
  inEffect: boolean;
  draftedByMe: boolean;
  canSubmit: boolean;
  canReview: boolean;
  reviewBlockedReason: string | null;
}

export interface RuleChangeList { today: string; versionInEffect: string; latestVersion: string; items: RuleChange[] }

export interface RuleChangeRequest { key: string; newValue: number; reason: string; effectiveFrom: string }

export interface BacktestSide {
  evaluated: number;
  approvedAny: number;
  approvalRate: number;
  avgRate: number | null;
  avgLimit: number | null;
  decisions: Partial<Record<BacktestDecision, number>>;
}

export interface BacktestOutcome { decision: BacktestDecision; creditBand: string | null; appliedRate: number | null; finalLimit: number | null }

export interface BacktestExample {
  applicationId: number;
  applicationNo: string;
  productCode: string;
  productName: string;
  creditScore: number;
  before: BacktestOutcome;
  after: BacktestOutcome;
}

export interface Backtest {
  changeId: number;
  key: string;
  label: string;
  oldValue: number;
  newValue: number;
  baseVersion: string;
  proposedLabel: string;
  sampleSize: number;
  limit: number;
  truncated: boolean;
  skipped: number;
  differsFromStored: number;
  before: BacktestSide;
  after: BacktestSide;
  decisionChanged: number;
  rateChanged: number;
  limitChanged: number;
  examples: BacktestExample[];
  notice: string;
}

/** 사유·반려 사유 길이(앞뒤 공백 제외, 업무 규칙 §31.1). */
export const REASON_MIN = 10;
export const REASON_MAX = 500;

export const ruleChangesApi = {
  keys: () => request<RuleKeyCatalog>("/admin/rule-changes/keys"),
  list: () => request<RuleChangeList>("/admin/rule-changes"),
  get: (id: number) => request<RuleChange>(`/admin/rule-changes/${id}`),
  create: (body: RuleChangeRequest) => request<RuleChange>("/admin/rule-changes", { method: "POST", body }),
  submit: (id: number) => request<RuleChange>(`/admin/rule-changes/${id}/submit`, { method: "POST" }),
  approve: (id: number, comment?: string) =>
    request<RuleChange>(`/admin/rule-changes/${id}/approve`, { method: "POST", body: comment ? { comment } : {} }),
  reject: (id: number, comment: string) => request<RuleChange>(`/admin/rule-changes/${id}/reject`, { method: "POST", body: { comment } }),
  backtest: (id: number) => request<Backtest>(`/admin/rule-changes/${id}/backtest`),
};
