import { query, request } from "./client";
import type {
  AdminApplicationPage, AdminApplicationsQuery, AdminConcept, AdminConceptSummary, AdminOverrideRequest, AdminTerm, AdminTermSummary,
  Application, BatchExecution, BatchExecutionsQuery, ConceptDraft, ContentRevision, ContentRevisionsQuery, ContentValidationReport,
  DailyCloseRequest, Portfolio, TermDraft,
} from "./types";

/**
 * 운영 콘솔(S-20~S-23)이 쓰는 호출. 경로·본문·응답은 docs/contracts/CapiMATE-API.yml의 admin 태그 그대로다.
 * VITE_MOCK=1이면 client.ts가 src/api/mock/admin.ts의 고정 응답으로 분기한다.
 *
 * 계약에 없는 호출은 getApplication 하나뿐이다(아래 주석). 계약이 바뀌기 전까지 실 API에서는 404가 난다.
 */
export const adminApi = {
  // ── 심사 큐(FR-23)
  listApplications: (params: AdminApplicationsQuery = {}) =>
    request<AdminApplicationPage>(`/admin/applications${query({ status: params.status, page: params.page })}`),
  /**
   * 신청 1건 상세(심사 근거·override 이력). 계약에는 아직 없는 경로다 — S-20 상세 패널이 근거 표를 그리려면 필요해
   * `GET /admin/applications/{id}` 추가를 총괄에게 요청했다(응답은 Application 스키마). 계약 반영 전에는 mock에서만 동작한다.
   */
  getApplication: (id: number) => request<Application>(`/admin/applications/${id}`),
  override: (id: number, body: AdminOverrideRequest) =>
    request<Application>(`/admin/applications/${id}/override`, { method: "POST", body }),

  // ── 포트폴리오(FR-24)
  portfolio: () => request<Portfolio>("/admin/portfolio"),

  // ── 배치(FR-26)
  dailyClose: (body: DailyCloseRequest) => request<BatchExecution[]>("/admin/batch/daily-close", { method: "POST", body }),
  listExecutions: (params: BatchExecutionsQuery = {}) =>
    request<BatchExecution[]>(`/admin/batch/executions${query({ sandboxId: params.sandboxId })}`),

  // ── 콘텐츠 운영(FR-25)
  listConcepts: () => request<AdminConceptSummary[]>("/admin/content/concepts"),
  getConcept: (conceptId: string) => request<AdminConcept>(`/admin/content/concepts/${encodeURIComponent(conceptId)}`),
  saveConceptDraft: (conceptId: string, body: ConceptDraft) =>
    request<AdminConcept>(`/admin/content/concepts/${encodeURIComponent(conceptId)}`, { method: "PUT", body }),
  publishConcept: (conceptId: string) =>
    request<AdminConcept>(`/admin/content/concepts/${encodeURIComponent(conceptId)}/publish`, { method: "POST" }),
  retireConcept: (conceptId: string) =>
    request<AdminConcept>(`/admin/content/concepts/${encodeURIComponent(conceptId)}/retire`, { method: "POST" }),
  listTerms: () => request<AdminTermSummary[]>("/admin/content/terms"),
  getTerm: (slug: string) => request<AdminTerm>(`/admin/content/terms/${encodeURIComponent(slug)}`),
  saveTermDraft: (slug: string, body: TermDraft) =>
    request<AdminTerm>(`/admin/content/terms/${encodeURIComponent(slug)}`, { method: "PUT", body }),
  publishTerm: (slug: string) => request<AdminTerm>(`/admin/content/terms/${encodeURIComponent(slug)}/publish`, { method: "POST" }),
  retireTerm: (slug: string) => request<AdminTerm>(`/admin/content/terms/${encodeURIComponent(slug)}/retire`, { method: "POST" }),
  /** 저장 없이 트리 전체 검증(게시 전 미리 보기) */
  validateAll: () => request<ContentValidationReport>("/admin/content/validate", { method: "POST" }),
  listRevisions: (params: ContentRevisionsQuery = {}) =>
    request<ContentRevision[]>(`/admin/content/revisions${query({ entityType: params.entityType, entityId: params.entityId, limit: params.limit })}`),
};
