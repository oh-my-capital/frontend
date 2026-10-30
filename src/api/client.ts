import type { ApiErrorBody } from "./types";

/**
 * fetch 래퍼. 같은 origin의 `/api`만 부른다(docs/contracts/runtime.md). 주소를 코드에 적지 않는다.
 * - Authorization: Bearer <token>(localStorage).
 * - 오류 응답(공통 Error 스키마)은 ApiError로 던지고, 본문이 없으면 응답 헤더 X-Request-Id를 요청 ID로 쓴다.
 * - `idempotency` 옵션이면 Idempotency-Key(8~80자)를 붙인다. 상환·입금·중도상환·신청에 쓴다.
 * - VITE_MOCK=1이면 네트워크 대신 api/mock의 고정 응답으로 분기한다(외부 라이브러리 없음).
 */
const BASE_URL: string = import.meta.env.VITE_API_BASE_URL ?? "/api";
const TOKEN_KEY = "capimate.token";
export const IS_MOCK = import.meta.env.VITE_MOCK === "1";

export class ApiError extends Error {
  status: number;
  code: string;
  requestId: string;
  details: { field?: string; message?: string }[];
  /** 서버가 보낸 오류 본문 전체. 422 CONTENT_INVALID의 problems처럼 details 밖의 필드를 읽을 때 쓴다. */
  body: ApiErrorBody & Record<string, unknown>;
  constructor(status: number, body: ApiErrorBody) {
    super(body.message);
    this.name = "ApiError";
    this.status = status;
    this.code = body.code;
    this.requestId = body.requestId;
    this.details = body.details ?? [];
    this.body = body as ApiErrorBody & Record<string, unknown>;
  }
}

export function getToken(): string | null {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
}
export function setToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch { /* 저장소를 못 쓰는 환경에서는 세션을 메모리에만 둔다 */ }
}

/** Idempotency-Key 생성. 계약 범위 8~80자 안의 UUID(36자). */
export function createIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

export interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  /** true면 새 키를 만들고, 문자열이면 그 키를 그대로 쓴다(재시도 시 같은 키 유지). */
  idempotency?: boolean | string;
  signal?: AbortSignal;
}

/** 질의 문자열을 만든다. 비어 있는 값은 뺀다. */
export function query(params: Record<string, string | number | boolean | undefined | null>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    search.set(key, String(value));
  }
  const text = search.toString();
  return text ? `?${text}` : "";
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const method = options.method ?? "GET";
  const headers: Record<string, string> = { Accept: "application/json" };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (options.body !== undefined) headers["Content-Type"] = "application/json";
  if (options.idempotency) headers["Idempotency-Key"] = options.idempotency === true ? createIdempotencyKey() : options.idempotency;

  if (IS_MOCK) {
    const { mockFetch } = await import("./mock");
    const result = await mockFetch(method, path, options.body, token);
    if (result.status >= 400) throw new ApiError(result.status, result.body as ApiErrorBody);
    return result.body as T;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    signal: options.signal,
  });

  if (!res.ok) {
    const requestId = res.headers.get("X-Request-Id") ?? "";
    let body: ApiErrorBody;
    try {
      const parsed = (await res.json()) as Partial<ApiErrorBody>;
      // 서버 본문의 다른 필드(422 CONTENT_INVALID의 problems 등)도 ApiError.body에 남긴다.
      body = { ...parsed, code: parsed.code ?? "UNKNOWN", message: parsed.message ?? defaultMessage(res.status), requestId: parsed.requestId ?? requestId, details: parsed.details };
    } catch {
      body = { code: "UNKNOWN", message: defaultMessage(res.status), requestId };
    }
    throw new ApiError(res.status, body);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

function defaultMessage(status: number): string {
  if (status === 401) return "로그인이 필요해요. 다시 로그인한 뒤 시도해요.";
  if (status === 403) return "이 작업을 할 권한이 없어요.";
  if (status === 404) return "요청한 내용을 찾지 못했어요.";
  if (status >= 500) return "서버가 요청을 처리하지 못했어요. 잠시 뒤 다시 시도해요.";
  return "요청을 처리하지 못했어요.";
}

/** 화면에서 오류를 문장으로 바꿀 때 쓴다. 코드만 보여 주지 않는다. */
export function errorMessage(error: unknown, fallback = "요청을 처리하지 못했어요. 잠시 뒤 다시 시도해요."): string {
  if (error instanceof ApiError) return error.message || fallback;
  if (error instanceof TypeError) return "서버에 연결하지 못했어요. 네트워크 상태를 확인하고 다시 시도해요.";
  return fallback;
}
