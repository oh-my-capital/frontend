import { ApiError, getToken, request } from "./client";
import type { ApiErrorBody, Credentials } from "./types";

/**
 * 약관·개인정보처리방침·동의·내 데이터(WP36, FR-59·60). 계약은 docs contracts/api/wp36-legal.yml.
 * 공용 types.ts 를 고치지 않으려고 이 영역의 타입을 여기에 둔다.
 */
export type LegalDocumentType = "TERMS" | "PRIVACY";
export type LegalSlug = "terms" | "privacy";
export type ConsentChannel = "SIGNUP" | "RECONSENT" | "INTERNAL";

export interface LegalArticle {
  no: number;
  title: string;
  topic: string | null;
  paragraphs: string[];
  items: string[];
  table: { columns: string[]; rows: string[][] } | null;
  basis: string[];
}

export interface LegalDocument {
  document: LegalDocumentType;
  title: string;
  version: string;
  effectiveDate: string;
  inEffect: boolean;
  status: "DRAFT" | "FINAL";
  draftNotice: string | null;
  summary: string;
  placeholders: string[];
  changes: { version: string; effectiveDate: string; summary: string }[];
  sources: { title: string; url: string; checkedOn: string }[];
  articles: LegalArticle[];
}

export interface ConsentDocumentStatus {
  document: LegalDocumentType;
  title: string;
  currentVersion: string;
  effectiveDate: string;
  inEffect: boolean;
  agreedVersion: string | null;
  agreedAt: string | null;
  reconsentRequired: boolean;
}

export interface ConsentRecord { document: LegalDocumentType; version: string; agreedAt: string; channel: ConsentChannel }

export interface ConsentStatus {
  documents: ConsentDocumentStatus[];
  required: LegalDocumentType[];
  history: ConsentRecord[];
}

/** 가입 요청(WP36 계약 변경). Credentials 에 필수 동의 2종과 화면이 보여 준 문서 버전을 더한다. */
export interface SignupRequest extends Credentials {
  agreeTerms: boolean;
  agreePrivacy: boolean;
  termsVersion?: string;
  privacyVersion?: string;
}

export const DOCUMENT_LABEL: Record<LegalDocumentType, string> = { TERMS: "이용약관", PRIVACY: "개인정보처리방침" };
export const DOCUMENT_PATH: Record<LegalDocumentType, string> = { TERMS: "/legal/terms", PRIVACY: "/legal/privacy" };
export const CHANNEL_LABEL: Record<ConsentChannel, string> = { SIGNUP: "가입", RECONSENT: "재동의", INTERNAL: "서버 생성(데모)" };

const BASE_URL: string = import.meta.env.VITE_API_BASE_URL ?? "/api";

export const legalApi = {
  document: (slug: LegalSlug, signal?: AbortSignal) => request<LegalDocument>(`/legal/${slug}`, { signal }),
  consents: (signal?: AbortSignal) => request<ConsentStatus>("/me/consents", { signal }),
  agree: (agreements: { document: LegalDocumentType; version: string }[]) =>
    request<ConsentStatus>("/me/consents", { method: "POST", body: { agreements } }),
  /**
   * 내 데이터 JSON 파일을 받아 브라우저 저장으로 넘긴다. 응답이 첨부(Content-Disposition)라 request() 대신 fetch 로 Blob 을 받는다.
   * 돌려주는 값은 저장한 파일 이름과 크기(바이트).
   */
  downloadMyData: async (): Promise<{ filename: string; size: number }> => {
    const headers: Record<string, string> = { Accept: "application/json" };
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(`${BASE_URL}/me/data-export`, { headers });
    if (!res.ok) {
      let body: ApiErrorBody;
      try {
        const parsed = (await res.json()) as Partial<ApiErrorBody>;
        body = { code: parsed.code ?? "UNKNOWN", message: parsed.message ?? "내 데이터를 내려받지 못했어요. 잠시 뒤 다시 시도해요.", requestId: parsed.requestId ?? res.headers.get("X-Request-Id") ?? "" };
      } catch {
        body = { code: "UNKNOWN", message: res.status === 401 ? "로그인이 필요해요. 다시 로그인한 뒤 시도해요." : "내 데이터를 내려받지 못했어요. 잠시 뒤 다시 시도해요.", requestId: res.headers.get("X-Request-Id") ?? "" };
      }
      throw new ApiError(res.status, body);
    }
    const blob = await res.blob();
    const filename = /filename="?([^";]+)"?/.exec(res.headers.get("Content-Disposition") ?? "")?.[1] ?? "capimate-my-data.json";
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    // 클릭 처리 뒤에 해제한다(바로 해제하면 일부 브라우저가 저장을 취소한다).
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return { filename, size: blob.size };
  },
};
