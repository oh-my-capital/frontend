import { request } from "./client";
import type { ConceptSummary, MyLearning, Sandbox } from "./types";

/**
 * 홈(S-01)이 쓰는 호출. WP5가 만들고 디자인 v3(WP15)에서 상품·공지를 더했다.
 * 학습·샌드박스 전체 함수는 WP6의 api/learning.ts, WP7의 api/sandbox.ts가 따로 만든다(겹쳐도 된다).
 *
 * 상품(`GET /products`, WP23)·공지(`GET /support/notices`, WP25)는 다른 WP가 만드는 중이다.
 * 홈은 둘 다 "있으면 보여 주고 없으면 대체"하므로 응답 모양을 너그럽게 읽는다(배열 또는 { items | products } 래퍼,
 * 이름이 조금 다른 필드). 모르는 모양이면 오류로 던져 홈이 정적 링크로 대체한다. 숫자는 서버가 준 값만 쓴다.
 */
export const homeApi = {
  concepts: (signal?: AbortSignal) => request<ConceptSummary[]>("/learning/concepts", { signal }),
  myLearning: (signal?: AbortSignal) => request<MyLearning>("/me/learning", { signal }),
  sandbox: (signal?: AbortSignal) => request<Sandbox>("/sandbox", { signal }),
  products: (signal?: AbortSignal) => request<unknown>("/products", { signal }).then(normalizeProducts),
  notices: (signal?: AbortSignal) => request<unknown>("/support/notices", { signal }).then(normalizeNotices),
};

/** 홈 상품 표 한 줄. 서버에 없는 필드는 비워 두고 화면이 "—"로 그린다. 금리는 연 %(types.ts Rate 와 같은 단위). */
export interface HomeProduct {
  code: string;
  name: string;
  category: string | null;
  summary: string | null;
  minRate: number | null;
  maxRate: number | null;
  maxAmount: number | null;
  minTerm: number | null;
  maxTerm: number | null;
}

/** 홈 공지 한 줄(WP25 계약 NoticeSummary 의 일부). */
export interface HomeNotice {
  id: string;
  postedOn: string;
  category: string | null;
  title: string;
}

type Obj = Record<string, unknown>;
const isObj = (value: unknown): value is Obj => typeof value === "object" && value !== null && !Array.isArray(value);
const str = (value: unknown): string | null => (typeof value === "string" && value.trim() ? value.trim() : null);
const num = (value: unknown): number | null => (typeof value === "number" && Number.isFinite(value) ? value : null);
const firstStr = (o: Obj, keys: string[]) => keys.map(k => str(o[k])).find(v => v !== null) ?? null;
const firstNum = (o: Obj, keys: string[]) => keys.map(k => num(o[k])).find(v => v !== null) ?? null;
/** 한글이 섞인 값만 화면 라벨로 쓴다(AUTO_LOAN 같은 코드값은 라벨이 아니다). */
const label = (value: string | null) => (value && /[가-힣]/.test(value) ? value : null);

function listOf(raw: unknown, keys: string[]): unknown[] {
  if (Array.isArray(raw)) return raw;
  if (isObj(raw)) for (const key of keys) if (Array.isArray(raw[key])) return raw[key] as unknown[];
  throw new Error("예상하지 못한 응답 모양");
}

export function normalizeProducts(raw: unknown): HomeProduct[] {
  return listOf(raw, ["items", "products", "content"]).filter(isObj).flatMap(item => {
    const code = firstStr(item, ["code", "productCode", "id"]);
    const name = firstStr(item, ["name", "productName", "title"]);
    if (!code || !name) return [];
    const range = isObj(item.rateRange) ? item.rateRange : isObj(item.rate) ? item.rate : {};
    const terms = Array.isArray(item.allowedTerms) ? item.allowedTerms.filter((t): t is number => typeof t === "number") : [];
    const minRate = firstNum(item, ["minRate", "rateMin"]) ?? firstNum(range, ["min", "minRate"]);
    const maxRate = firstNum(item, ["maxRate", "rateMax"]) ?? firstNum(range, ["max", "maxRate"]);
    return [{
      code,
      name,
      category: label(firstStr(item, ["categoryLabel", "typeLabel", "category", "type", "productType"])),
      summary: firstStr(item, ["summary", "tagline", "description"]),
      minRate,
      // baseRate(기준금리)는 고객 금리가 아니라서 금리 범위로 쓰지 않는다.
      maxRate,
      maxAmount: firstNum(item, ["maxAmount", "limitMax", "amountMax"]),
      minTerm: firstNum(item, ["minTerm", "termMin"]) ?? (terms.length ? Math.min(...terms) : null),
      maxTerm: firstNum(item, ["maxTerm", "termMax"]) ?? (terms.length ? Math.max(...terms) : null),
    }];
  });
}

export function normalizeNotices(raw: unknown): HomeNotice[] {
  return listOf(raw, ["items", "notices", "content"]).filter(isObj).flatMap(item => {
    const id = firstStr(item, ["id", "slug"]);
    const title = firstStr(item, ["title"]);
    const postedOn = firstStr(item, ["postedOn", "postedAt", "date", "createdAt"]);
    if (!id || !title || !postedOn) return [];
    return [{ id, title, postedOn, category: firstStr(item, ["category"]) }];
  });
}
