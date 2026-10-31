import type { AuditType, DelinquencyBucket, RiskState } from "../../../api/adminAnalytics";
import type { StatusTone } from "../../../components/StatusChip";

/**
 * 운영 분석 화면(S-220~S-222) 공용 라벨. 구간 경계는 business-rules WP22 §22.1(60일 이상 = 기한이익상실).
 * 서버 응답의 label 이 있으면 그것을 먼저 쓰고, 여기 값은 표 머리·거르개처럼 응답 전에 필요한 자리에만 쓴다.
 */
export const STATE_ORDER: RiskState[] = ["CURRENT", "DPD_1_29", "DPD_30_59", "DPD_60_89", "DPD_90_PLUS", "PAID_OFF"];

export const STATE_LABEL: Record<RiskState, string> = {
  CURRENT: "정상",
  DPD_1_29: "1~29일",
  DPD_30_59: "30~59일",
  DPD_60_89: "60~89일(상실)",
  DPD_90_PLUS: "90일 이상(상실)",
  PAID_OFF: "완제",
};

export const BUCKETS: DelinquencyBucket[] = ["DPD_1_29", "DPD_30_59", "DPD_60_89", "DPD_90_PLUS"];

/** 연체 구간 chip: 30일 전은 주의, 그 뒤는 위험 톤. 글자 라벨이 함께 간다. */
export function bucketTone(bucket: DelinquencyBucket): StatusTone {
  return bucket === "DPD_1_29" ? "warn" : "danger";
}

export const AUDIT_TYPE: Record<AuditType, { label: string; tone: StatusTone }> = {
  SCREENING_OVERRIDE: { label: "심사 결정 변경", tone: "warn" },
  CONTENT_PUBLISH: { label: "콘텐츠 게시", tone: "good" },
  CONTENT_RETIRE: { label: "콘텐츠 내림", tone: "neutral" },
  GLOBAL_BATCH: { label: "전역 일마감", tone: "info" },
  COLLECTION_NOTE: { label: "연체 메모", tone: "neutral" },
};
export const AUDIT_TYPES = Object.keys(AUDIT_TYPE) as AuditType[];

/** 비율(%) 표기. 서버는 소수 둘째 자리까지 준다. 표 칸은 첫째 자리까지 줄여 읽기 쉽게 한다. */
export function pct(value: number | null | undefined, digits = 1): string {
  if (value === null || value === undefined) return "—";
  return `${value.toFixed(digits)}%`;
}

/** "2026-03" → "26.3" (축 라벨) */
export function shortMonth(month: string): string {
  const [y, m] = month.split("-");
  return `${y.slice(2)}.${Number(m)}`;
}
