import { query, request } from "./client";

/**
 * 서비스 지표(S-400, WP40) 호출과 타입. 계약은 docs/contracts/api/wp40-insight.yml, 숫자의 정의는
 * docs/domain/business-rules.md "WP40 — 서비스 지표". 수집(POST /events)은 lib/track.ts 가 직접 보낸다. 공용 types.ts 는 고치지 않는다.
 */
export interface KpiSummary {
  visitors: number;
  pageViews: number;
  signups: number;
  signupConversionRate: number;
  learningActiveUsers: number;
  conceptCompletions: number;
  missionCompletions: number;
  applications: number;
  executions: number;
  calculatorRuns: number;
}
export interface KpiDay extends Omit<KpiSummary, "signupConversionRate"> { date: string }
export type FunnelStageCode = "SIGNED_UP" | "PROFILE_SAVED" | "APPLIED" | "EXECUTED";
export interface SandboxFunnelStage { code: FunnelStageCode; label: string; count: number; rateOfSignups: number; stepRate: number | null }
export interface CalculatorUsage { slug: string; label: string; path: string; pageViews: number; visitors: number; runs: number }
export interface PageUsage { path: string; pageViews: number; visitors: number }
export interface KpiReport {
  from: string;
  to: string;
  days: number;
  timezone: string;
  retentionDays: number;
  summary: KpiSummary;
  daily: KpiDay[];
  funnel: SandboxFunnelStage[];
  calculators: CalculatorUsage[];
  topPages: PageUsage[];
  asOf: string;
}
export interface PurgeResult { retentionDays: number; cutoff: string; deleted: number; ranAt: string }

export const insightApi = {
  kpi: (days?: number) => request<KpiReport>(`/admin/kpi${query({ days })}`),
  purge: () => request<PurgeResult>("/admin/kpi/purge", { method: "POST" }),
};
