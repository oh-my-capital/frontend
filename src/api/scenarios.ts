import { request } from "./client";

/**
 * 시나리오 프리셋·초기화(S-260, WP26). 계약: docs/contracts/api/wp26-scenarios.yml. 타입은 types.ts 가 아니라 이 파일에 둔다.
 * 적용·초기화는 샌드박스를 지우므로 확인 문구 "초기화"를 본문에 넣는다. 적용은 시계를 수백 일 진행할 수 있어 응답까지 시간이 걸린다.
 */
export const CONFIRM_PHRASE = "초기화";

export interface ConceptLink { id: string; title: string }

export interface Scenario {
  id: string;
  order: number;
  title: string;
  scene: string;
  produces: string;
  learningGoals: string[];
  relatedConcepts: ConceptLink[];
  /** 학습 미션 id(WP20). 화면은 /missions/{id} 로 잇는다. */
  relatedMissions: string[];
  creates: "CONTRACT" | "APPLICATION";
  approxAdvanceDays: number;
}

export interface DeletedCounts { applications: number; contracts: number; notifications: number; ledgerEntries: number; batchExecutions: number }

export interface SandboxResetResult { sandboxId: number; businessDate: string; settlementBalance: number; profileKept: boolean; deleted: DeletedCounts }

export interface ScenarioState {
  contractStatus: string | null;
  overdueDays: number;
  assetClass: string | null;
  paidInstallments: number;
  totalInstallments: number;
  noticeSentOn: string | null;
  acceleratedOn: string | null;
  applicationStatus: string | null;
  offeredAmount: number | null;
}

export interface ScenarioResult {
  scenario: Scenario;
  reset: SandboxResetResult;
  businessDate: string;
  settlementBalance: number;
  contractId: number | null;
  contractNo: string | null;
  applicationId: number | null;
  state: ScenarioState;
  daysAdvanced: number;
  summary: string;
  nextPath: string;
}

export const scenariosApi = {
  list: (signal?: AbortSignal) => request<Scenario[]>("/sandbox/scenarios", { signal }),
  apply: (id: string) => request<ScenarioResult>(`/sandbox/scenarios/${encodeURIComponent(id)}`, { method: "POST", body: { confirm: CONFIRM_PHRASE }, idempotency: true }),
  reset: (clearProfile: boolean) => request<SandboxResetResult>("/sandbox/reset", { method: "POST", body: { confirm: CONFIRM_PHRASE, clearProfile }, idempotency: true }),
};
