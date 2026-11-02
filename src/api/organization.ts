import { ApiError, getToken, request } from "./client";

/**
 * 기관·교육 과정·진척 대시보드(FR-57·58, WP35) 호출과 타입. 계약은 docs/contracts/api/wp35-organizations.yml 조각이며,
 * 공유 파일 규칙에 따라 타입은 types.ts 가 아니라 이 파일에 둔다.
 * - 운영자 /admin/organizations/**, 학습자 /me/organization/**, 담당자(MANAGER) /org/progress*.
 * - 초대 코드 원문은 발급 응답에서 한 번만 온다. 서버는 해시와 앞 4자만 저장한다.
 */
export type OrgRole = "MEMBER" | "MANAGER";
export type OrganizationStatus = "UPCOMING" | "ACTIVE" | "ENDED";

export interface OrganizationSummary {
  id: number;
  name: string;
  seatLimit: number;
  memberCount: number;
  managerCount: number;
  startsOn: string;
  endsOn: string;
  status: OrganizationStatus;
  createdAt: string;
}

export interface AdminMember {
  userId: number;
  emailMasked: string;
  role: OrgRole;
  joinedAt: string;
  consentedAt: string;
}

export interface InviteSummary {
  id: number;
  codePrefix: string;
  createdAt: string;
  expiresAt: string;
  expired: boolean;
}

export interface OrganizationDetail extends OrganizationSummary {
  members: AdminMember[];
  invites: InviteSummary[];
}

export interface IssuedInvite {
  id: number;
  organizationId: number;
  /** 원문(4자씩 하이픈). 이 응답에서 한 번만 온다. */
  code: string;
  codePrefix: string;
  expiresAt: string;
}

export interface OrganizationCreateRequest {
  name: string;
  seatLimit: number;
  startsOn: string;
  endsOn: string;
}

export interface OrganizationPublic {
  id: number;
  name: string;
  startsOn: string;
  endsOn: string;
  status: OrganizationStatus;
}

export interface MyOrganization {
  joined: boolean;
  organization: OrganizationPublic | null;
  role: OrgRole | null;
  joinedAt: string | null;
  consentedAt: string | null;
  sharedItems: string[];
  notShared: string[];
}

export interface MemberProgress {
  memberId: number;
  emailMasked: string;
  role: OrgRole;
  conceptsCompleted: number;
  quizAttempts: number;
  /** 채점 시도 점수 평균(%). 시도가 없으면 null. */
  quizAccuracy: number | null;
  missionsCompleted: number;
  lastStudiedOn: string | null;
  joinedOn: string;
}

export interface OrgProgress {
  organization: OrganizationPublic;
  asOf: string;
  conceptsTotal: number;
  missionsTotal: number;
  summary: { members: number; seatLimit: number; activeLast7Days: number; avgConceptsCompleted: number };
  members: MemberProgress[];
}

export const ORG_ROLE_LABEL: Record<OrgRole, string> = { MEMBER: "학습자", MANAGER: "담당자" };
export const ORG_STATUS: Record<OrganizationStatus, { label: string; tone: "info" | "good" | "neutral" }> = {
  UPCOMING: { label: "시작 전", tone: "info" },
  ACTIVE: { label: "진행 중", tone: "good" },
  ENDED: { label: "종료", tone: "neutral" },
};

const BASE_URL: string = import.meta.env.VITE_API_BASE_URL ?? "/api";

export const organizationApi = {
  // 학습자
  mine: (signal?: AbortSignal) => request<MyOrganization>("/me/organization", { signal }),
  join: (code: string, consent: boolean) => request<MyOrganization>("/me/organization/join", { method: "POST", body: { code, consent } }),
  leave: () => request<void>("/me/organization", { method: "DELETE" }),
  // 담당자
  progress: (signal?: AbortSignal) => request<OrgProgress>("/org/progress", { signal }),
  /**
   * CSV 내려받기. Bearer 헤더가 필요해 링크(href)로 열 수 없으므로 fetch → Blob → 임시 링크로 저장한다.
   * 파일 이름은 서버의 Content-Disposition 을 따른다.
   */
  async downloadCsv(): Promise<string> {
    const headers: Record<string, string> = { Accept: "text/csv" };
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(`${BASE_URL}/org/progress.csv`, { headers });
    if (!res.ok) {
      let body = { code: "UNKNOWN", message: "CSV를 내려받지 못했어요. 잠시 뒤 다시 시도해요.", requestId: res.headers.get("X-Request-Id") ?? "" };
      try { body = { ...body, ...(await res.json()) }; } catch { /* 본문 없음 */ }
      throw new ApiError(res.status, body);
    }
    const disposition = res.headers.get("Content-Disposition") ?? "";
    const filename = disposition.match(/filename="?([^";]+)"?/)?.[1] ?? "org-progress.csv";
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    return filename;
  },
  // 운영자
  list: () => request<OrganizationSummary[]>("/admin/organizations"),
  create: (body: OrganizationCreateRequest) => request<OrganizationDetail>("/admin/organizations", { method: "POST", body }),
  detail: (id: number) => request<OrganizationDetail>(`/admin/organizations/${id}`),
  issueInvite: (id: number, expiresInDays: number) => request<IssuedInvite>(`/admin/organizations/${id}/invites`, { method: "POST", body: { expiresInDays } }),
  changeRole: (id: number, userId: number, role: OrgRole) =>
    request<AdminMember>(`/admin/organizations/${id}/members/${userId}/role`, { method: "PUT", body: { role } }),
};
