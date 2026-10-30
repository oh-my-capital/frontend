import { request } from "./client";
import type { PrepaymentCalcRequest, PrepaymentQuote, Product, ScheduleRequest, ScheduleResponse, ScreeningRequest, ScreeningResult } from "./types";

/**
 * 계산기 3종(S-06~S-08, tags calculators)이 쓰는 호출. WP7 소유. 로그인 없이 부른다(security: []).
 * 경로·본문·응답은 docs/contracts/CapiMATE-API.yml 그대로이고 타입은 types.ts 를 재사용한다.
 * 상품 목록(/sandbox/products)도 공개라 심사 시뮬레이터의 상품 선택에 같이 쓴다.
 * VITE_MOCK=1 이면 client.ts 가 src/api/mock/lab-fixtures.ts 의 규칙 엔진으로 분기한다.
 */
export const calculatorsApi = {
  /** 세 방식 모두(methods 생략) 또는 지정한 방식만 돌려준다. */
  schedule: (body: ScheduleRequest, signal?: AbortSignal) => request<ScheduleResponse>("/calculators/schedule", { method: "POST", body, signal }),
  screening: (body: ScreeningRequest, signal?: AbortSignal) => request<ScreeningResult>("/calculators/screening", { method: "POST", body, signal }),
  prepayment: (body: PrepaymentCalcRequest, signal?: AbortSignal) => request<PrepaymentQuote>("/calculators/prepayment", { method: "POST", body, signal }),
  products: (signal?: AbortSignal) => request<Product[]>("/sandbox/products", { signal }),
};
