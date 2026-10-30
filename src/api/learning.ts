import { request } from "./client";
import type { Concept, ConceptSummary, Methodology, MyLearning, Quiz, QuizAttemptRequest, QuizResult } from "./types";

/**
 * 학습(tags learning·methodology·me/learning)이 쓰는 호출. WP6 소유.
 * 경로·응답은 docs/contracts/CapiMATE-API.yml 그대로이며 타입은 types.ts 를 재사용한다.
 * - 개념·문항·방법론은 공개(security: []), 문제 제출은 로그인 없이도 채점되고 로그인 시에만 진척이 저장된다(saved).
 * - 제출 본문의 contentVersion 이 서버와 다르면 409(콘텐츠 버전 불일치)가 온다. 화면은 문항을 다시 받아 재시도한다.
 */
export const learningApi = {
  concepts: (signal?: AbortSignal) => request<ConceptSummary[]>("/learning/concepts", { signal }),
  concept: (conceptId: string, signal?: AbortSignal) => request<Concept>(`/learning/concepts/${encodeURIComponent(conceptId)}`, { signal }),
  quiz: (conceptId: string, signal?: AbortSignal) => request<Quiz>(`/learning/concepts/${encodeURIComponent(conceptId)}/quiz`, { signal }),
  submitQuiz: (conceptId: string, body: QuizAttemptRequest) =>
    request<QuizResult>(`/learning/concepts/${encodeURIComponent(conceptId)}/quiz/attempts`, { method: "POST", body }),
  methodology: (signal?: AbortSignal) => request<Methodology>("/methodology", { signal }),
  myLearning: (signal?: AbortSignal) => request<MyLearning>("/me/learning", { signal }),
};
