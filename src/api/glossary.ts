import { query, request } from "./client";
import type { GlossaryQuery, Term, TermSummary } from "./types";

/**
 * 용어 사전(tag glossary)이 쓰는 호출. WP6 소유. 모두 공개 경로다.
 * 목록은 category·initial(초성 ㄱ~ㅎ 또는 A~Z)·q 질의를 그대로 넘기고, 빈 값은 client.query 가 뺀다.
 */
export const glossaryApi = {
  list: (params: GlossaryQuery = {}, signal?: AbortSignal) => request<TermSummary[]>(`/glossary${query({ category: params.category, initial: params.initial, q: params.q })}`, { signal }),
  term: (slug: string, signal?: AbortSignal) => request<Term>(`/glossary/${encodeURIComponent(slug)}`, { signal }),
};

/** 초성 버튼 줄의 순서. 계약의 initial 파라미터 값과 같다(ㄱ~ㅎ 14개, 그다음 A~Z). */
export const HANGUL_INITIALS = ["ㄱ", "ㄴ", "ㄷ", "ㄹ", "ㅁ", "ㅂ", "ㅅ", "ㅇ", "ㅈ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ"] as const;
export const LATIN_INITIALS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z"] as const;

// 유니코드 한글 음절(가~힣)의 초성 19개. 쌍자음은 버튼 줄에 맞춰 기본 자음으로 접는다(ㄲ→ㄱ, ㄸ→ㄷ, ㅃ→ㅂ, ㅆ→ㅅ, ㅉ→ㅈ).
const CHOSEONG = ["ㄱ", "ㄱ", "ㄴ", "ㄷ", "ㄷ", "ㄹ", "ㅁ", "ㅂ", "ㅂ", "ㅅ", "ㅅ", "ㅇ", "ㅈ", "ㅈ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ"];

/** 용어의 첫 글자에서 초성(ㄱ~ㅎ) 또는 영문 대문자(A~Z)를 얻는다. 둘 다 아니면 null. */
export function initialOf(term: string): string | null {
  const first = term.trim().charAt(0);
  if (!first) return null;
  const code = first.charCodeAt(0);
  if (code >= 0xac00 && code <= 0xd7a3) return CHOSEONG[Math.floor((code - 0xac00) / 588)];
  if (/[A-Za-z]/.test(first)) return first.toUpperCase();
  if (/[ㄱ-ㅎ]/.test(first)) return first;
  return null;
}
