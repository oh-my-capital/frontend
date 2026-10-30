import { ApiError } from "../../../api/client";
import type { StatusTone } from "../../../components/StatusChip";
import type { ContentEntityType, ContentRevisionAction, ContentStatus, Decision, ScreeningSource } from "../../../api/types";

/** 운영 콘솔에서만 쓰는 라벨. 공통 StatusChip의 LABELS에 없는 코드들이다(통합 요청은 보고에). */
type Chip = { label: string; tone: StatusTone };

export const CONTENT_STATUS: Record<ContentStatus, Chip> = {
  DRAFT: { label: "초안", tone: "info" },
  PUBLISHED: { label: "게시", tone: "good" },
  RETIRED: { label: "내림", tone: "neutral" },
};
export const BATCH_STATUS: Record<string, Chip> = {
  SUCCESS: { label: "성공", tone: "good" },
  FAILED: { label: "실패", tone: "danger" },
  SKIPPED: { label: "건너뜀", tone: "neutral" },
  RUNNING: { label: "실행 중", tone: "info" },
};
export const JOB_NAME: Record<string, string> = { DAILY_CLOSE: "일마감", MONTH_END_CLOSE: "월마감" };
export const ENTITY_TYPE: Record<ContentEntityType, string> = { CONCEPT: "개념", QUIZ: "문항", TERM: "용어" };
export const REVISION_ACTION: Record<ContentRevisionAction, Chip> = {
  DRAFT: { label: "초안 저장", tone: "info" },
  PUBLISH: { label: "게시", tone: "good" },
  RETIRE: { label: "내림", tone: "neutral" },
};
export const DECISION_LABEL: Record<Decision, string> = { APPROVED: "승인", CONDITIONAL: "조건부 승인", REJECTED: "거절" };
export const SOURCE_LABEL: Record<ScreeningSource | string, string> = { AUTO: "자동 심사", OVERRIDE: "운영자 변경" };
export const APPLICATION_STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "전체" },
  { value: "APPLIED", label: "접수" },
  { value: "APPROVED", label: "승인" },
  { value: "CONDITIONAL", label: "조건부 승인" },
  { value: "REJECTED", label: "거절" },
  { value: "CANCELLED", label: "취소" },
  { value: "EXECUTED", label: "실행 완료" },
];
export const METHOD_LABEL: Record<string, string> = { EQUAL_PAYMENT: "원리금균등", EQUAL_PRINCIPAL: "원금균등", BULLET: "만기일시" };

/** 건전성 분류 기준(business-rules §9, 교육용 가정값). 분포 표의 "연체일수·적립률" 열에 쓴다. */
export const ASSET_CLASS_RULES: { code: string; label: string; days: string; rate: string }[] = [
  { code: "NORMAL", label: "정상", days: "0~29일", rate: "1%" },
  { code: "PRECAUTIONARY", label: "요주의", days: "30~89일", rate: "10%" },
  { code: "SUBSTANDARD", label: "고정", days: "90~179일", rate: "20%" },
  { code: "DOUBTFUL", label: "회수의문", days: "180~364일", rate: "75%" },
  { code: "ESTIMATED_LOSS", label: "추정손실", days: "365일 이상", rate: "100%" },
];

/** ISO date-time → "2026. 10. 30. 14:20". 잘못된 값은 그대로. */
export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()}. ${hh}:${mm}`;
}

/** "2026-01" → "2026년 1월" */
export function formatMonth(value: string): string {
  const m = value.match(/^(\d{4})-(\d{2})$/);
  return m ? `${m[1]}년 ${Number(m[2])}월` : value;
}

/** 오늘(로컬) `YYYY-MM-DD` */
export function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** API 가 403 을 돌려줬는지(운영자 권한 없음). */
export function isForbidden(error: unknown): boolean {
  return error instanceof ApiError && error.status === 403;
}
