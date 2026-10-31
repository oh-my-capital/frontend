import { query, request } from "./client";

/**
 * 고객센터·금융소비자 권리 안내(tag support) 호출과 타입. WP25 소유. 계약은 docs `contracts/api/wp25-support.yml`.
 * 모두 공개 경로라 로그인 없이 부른다. 공용 types.ts 는 고치지 않고 타입을 여기 둔다.
 */

export interface SupportLink { path: string; label: string }
export interface RelatedTerm { slug: string; term: string }
export interface SourceRef { url: string; checkedOn: string }

export type FaqCategoryCode = "service" | "account" | "calculator" | "sandbox" | "delinquency" | "prepayment" | "rights" | "learning";
export interface FaqCategory { code: FaqCategoryCode; label: string; count: number }
export interface Faq {
  id: string;
  category: FaqCategoryCode;
  categoryLabel: string;
  question: string;
  answer: string[];
  link: SupportLink | null;
  relatedTerms: RelatedTerm[];
  featured: boolean;
  kind: "service" | "statutory";
  source: SourceRef | null;
}
export interface FaqList { total: number; categories: FaqCategory[]; category: string | null; q: string | null; items: Faq[] }
export interface FaqQuery { category?: string; q?: string }

export interface NoticeSummary { id: string; postedOn: string; category: string; title: string; summary: string }
export interface Notice extends NoticeSummary {
  body: string[];
  changes: string[];
  link: SupportLink | null;
  evidence: string;
  previous: NoticeSummary | null;
  next: NoticeSummary | null;
}

export interface GuideStep { orderNo: number; title: string; body: string; path: string; pathLabel: string; loginRequired: boolean }
export interface Guide { id: string; title: string; summary: string; steps: GuideStep[] }

export type TryMode = "SANDBOX" | "CALCULATOR" | "EXPLAIN_ONLY";
export interface LegalBasis { law: string; article: string; url: string; lawVersion: string }
export interface TryIt { mode: TryMode; path: string | null; label: string; note: string }
export interface ConsumerRight {
  id: string;
  orderNo: number;
  name: string;
  summary: string;
  requirements: string[];
  deadline: string;
  howTo: string[];
  effect: string | null;
  cautions: string[];
  basis: LegalBasis[];
  source: SourceRef;
  tryIt: TryIt;
  relatedTerms: RelatedTerm[];
}

export const supportApi = {
  faqs: (params: FaqQuery = {}, signal?: AbortSignal) => request<FaqList>(`/support/faqs${query({ category: params.category, q: params.q })}`, { signal }),
  notices: (signal?: AbortSignal) => request<NoticeSummary[]>("/support/notices", { signal }),
  notice: (id: string, signal?: AbortSignal) => request<Notice>(`/support/notices/${encodeURIComponent(id)}`, { signal }),
  guides: (signal?: AbortSignal) => request<Guide[]>("/support/guides", { signal }),
  rights: (signal?: AbortSignal) => request<ConsumerRight[]>("/support/rights", { signal }),
};

/** 해 볼 곳 라벨. 색만으로 구분하지 않도록 글자 라벨을 함께 쓴다. */
export const TRY_MODE_LABEL: Record<TryMode, { label: string; tone: "good" | "info" | "neutral" }> = {
  SANDBOX: { label: "모의 여신에서 해 보기", tone: "good" },
  CALCULATOR: { label: "계산기로 확인", tone: "info" },
  EXPLAIN_ONLY: { label: "설명만", tone: "neutral" },
};

/** 계약 조각의 검색어 최대 길이. */
export const FAQ_QUERY_MAX = 100;
