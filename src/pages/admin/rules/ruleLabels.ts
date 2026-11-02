import type { StatusTone } from "../../../components/StatusChip";
import type { BacktestDecision, RuleChange, RuleValueUnit } from "../../../api/ruleChanges";

/** 규칙 변경 화면(S-310~S-312) 라벨. 상태는 색과 함께 글자 라벨을 붙인다(ui-guidelines §2). */

export const UNIT_TEXT: Record<RuleValueUnit, string> = { POINT: "점", PERCENT: "%", PERCENT_POINT: "%p", MULTIPLE: "배" };

export const DECISION_TEXT: Record<BacktestDecision, string> = { APPROVED: "승인", CONDITIONAL: "조건부 승인", REJECTED: "거절" };
export const DECISION_TONE: Record<BacktestDecision, StatusTone> = { APPROVED: "good", CONDITIONAL: "warn", REJECTED: "danger" };

/** 기안 상태 → 라벨. ACTIVE 는 오늘 시행 중인 버전이면 "시행 중", 뒤 버전이 시행 중이면 "대체됨". */
export function changeStatus(c: Pick<RuleChange, "status" | "inEffect">): { label: string; tone: StatusTone } {
  switch (c.status) {
    case "DRAFT": return { label: "작성 중", tone: "info" };
    case "PENDING": return { label: "결재 대기", tone: "warn" };
    case "APPROVED": return { label: "결재됨 · 시행 예정", tone: "info" };
    case "ACTIVE": return c.inEffect ? { label: "시행 중", tone: "good" } : { label: "대체됨", tone: "neutral" };
    case "REJECTED": return { label: "반려", tone: "danger" };
  }
}

/** 값 + 단위(예 "9.00%p", "600점", "0.6배"). */
export function formatValue(value: number | null | undefined, unit: RuleValueUnit, scale: number): string {
  if (value === null || value === undefined) return "—";
  return `${value.toFixed(scale)}${UNIT_TEXT[unit]}`;
}

/** 새 값 − 기존 값, 부호 붙임(예 "+2.00%p"). */
export function formatDelta(oldValue: number, newValue: number, unit: RuleValueUnit, scale: number): string {
  const diff = newValue - oldValue;
  const sign = diff > 0 ? "+" : diff < 0 ? "−" : "±";
  return `${sign}${Math.abs(diff).toFixed(scale)}${UNIT_TEXT[unit]}`;
}

/** 비율(%) 차이를 %p 로(예 "−12.50%p"). 둘 중 하나가 없으면 "—". */
export function formatPointDelta(before: number | null, after: number | null): string {
  if (before === null || after === null) return "—";
  const diff = after - before;
  if (Math.abs(diff) < 0.005) return "변화 없음";
  return `${diff > 0 ? "+" : "−"}${Math.abs(diff).toFixed(2)}%p`;
}

/** 상태 전이 설명(보조 열 번호 목록). */
export const FLOW_STEPS: { title: string; body: string }[] = [
  { title: "기안", body: "운영자가 바꿀 항목·새 값·사유·시행일을 적는다. 기존 값은 서버가 지금 버전에서 적는다." },
  { title: "결재 요청", body: "기안자만 낼 수 있다. 결재 전에 백테스트로 승인율·금리 변화를 본다." },
  { title: "결재 또는 반려", body: "기안자가 아닌 다른 운영자만 한다. 반려 사유는 10자 이상. 결재하면 새 규칙 버전(v1.1 …)이 생긴다." },
  { title: "시행", body: "시행일(실제 날짜, 한국 시간)부터 새 신청의 심사가 새 버전을 쓴다. 이미 들어온 신청·계약은 당시 버전 그대로다." },
];
