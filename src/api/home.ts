import { request } from "./client";
import type { ConceptSummary, MyLearning, Sandbox } from "./types";

/**
 * 홈(S-01)이 쓰는 호출. WP5 소유.
 * 학습·샌드박스 전체 함수는 WP6의 api/learning.ts, WP7의 api/sandbox.ts가 따로 만든다(겹쳐도 된다).
 */
export const homeApi = {
  concepts: (signal?: AbortSignal) => request<ConceptSummary[]>("/learning/concepts", { signal }),
  myLearning: (signal?: AbortSignal) => request<MyLearning>("/me/learning", { signal }),
  sandbox: (signal?: AbortSignal) => request<Sandbox>("/sandbox", { signal }),
};
