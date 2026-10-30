import type { ClockAdvanceResult, ContractEvent, EmploymentType, RepaymentMethod, ScreeningResult } from "../../../api/types";
import { formatNumber } from "../../../lib/format";

/** 계산기·모의 여신(WP7)에서 쓰는 라벨·문장. 코드 그대로 보여 주지 않고 business-rules.md 의 용어를 쓴다. */
export const METHOD_LABEL: Record<RepaymentMethod, string> = { EQUAL_PAYMENT: "원리금균등", EQUAL_PRINCIPAL: "원금균등", BULLET: "만기일시" };
export const METHOD_DESCRIPTION: Record<RepaymentMethod, string> = {
  EQUAL_PAYMENT: "매월 같은 금액을 낸다. 초기에는 이자 비중이 크고 갈수록 원금 비중이 커진다.",
  EQUAL_PRINCIPAL: "매월 같은 원금에 줄어드는 이자를 더해 낸다. 첫 회가 가장 많고 총이자가 가장 적다.",
  BULLET: "매월 이자만 내고 만기에 원금을 한 번에 갚는다. 월 부담은 작지만 총이자가 가장 많다.",
};
export const METHODS: RepaymentMethod[] = ["EQUAL_PAYMENT", "EQUAL_PRINCIPAL", "BULLET"];
export const EMPLOYMENT_LABEL: Record<EmploymentType, string> = { EMPLOYEE: "근로소득자", SELF_EMPLOYED: "자영업자", FREELANCER: "프리랜서", NONE: "소득 활동 없음" };
export const RULE_LABEL: Record<string, string> = {
  "ELIG-AGE": "자격 · 연령", "ELIG-INCOME": "자격 · 소득", "ELIG-SCORE": "자격 · 신용점수", "ELIG-PRODUCT": "자격 · 상품 범위",
  RATE: "금리", "LIMIT-PRODUCT": "한도 · 상품 최대", "LIMIT-LTV": "한도 · 담보(LTV)", "LIMIT-INCOME": "한도 · 소득배수", "LIMIT-DSR": "한도 · DSR 역산", DECISION: "결정",
};
export const REASON_CODE_LABEL: Record<string, string> = {
  AGE_UNDER_19: "만 19세 미만", INCOME_MISSING: "소득 없음", CREDIT_SCORE_LOW: "신용점수 미달", PRODUCT_CONSTRAINT: "상품 범위 밖",
  LIMIT_REDUCED: "한도 축소", DSR_EXCEEDED: "DSR 초과", LIMIT_BELOW_MIN: "한도가 상품 최소 미만",
};
export const ROW_STATUS_LABEL: Record<string, { label: string; tone: "neutral" | "info" | "good" | "warn" | "danger" }> = {
  SCHEDULED: { label: "예정", tone: "neutral" }, PAID: { label: "납입", tone: "good" }, OVERDUE: { label: "미납", tone: "danger" }, PARTIAL: { label: "일부 납입", tone: "warn" },
};
export const TX_TYPE_LABEL: Record<string, string> = { AUTO_DEBIT: "자동이체", MANUAL_REPAYMENT: "수동 상환", PREPAYMENT_FULL: "전액 중도상환", PREPAYMENT_PARTIAL: "일부 중도상환" };
export const LEDGER_TYPE_LABEL: Record<string, string> = { DEPOSIT: "입금", LOAN_DISBURSEMENT: "대출 실행 입금", AUTO_DEBIT: "자동이체 출금", MANUAL_REPAYMENT: "수동 상환 출금", PREPAYMENT: "중도상환 출금" };
export const EVENT_LABEL: Record<string, { title: string; tone?: "good" | "danger" }> = {
  EXECUTED: { title: "대출 실행", tone: "good" }, PAYMENT_COMPLETED: { title: "자동이체 납입", tone: "good" }, REPAID: { title: "수동 상환", tone: "good" }, PREPAID: { title: "중도상환", tone: "good" },
  OVERDUE_STARTED: { title: "연체 시작", tone: "danger" }, OVERDUE_CLEARED: { title: "연체 정상화", tone: "good" }, CLASS_CHANGED: { title: "건전성 분류 변경" },
  ACCELERATION_NOTICE: { title: "기한이익상실 예정 통지", tone: "danger" }, ACCELERATED: { title: "기한이익상실", tone: "danger" }, PAID_OFF: { title: "완제", tone: "good" },
};
export const NOTIFICATION_TYPE_LABEL: Record<string, { label: string; tone: "neutral" | "info" | "good" | "warn" | "danger" }> = {
  LOAN_EXECUTED: { label: "실행", tone: "good" }, PAYMENT_DUE_SOON: { label: "납입 예정", tone: "warn" }, PAYMENT_COMPLETED: { label: "납입 완료", tone: "good" },
  OVERDUE_STARTED: { label: "연체", tone: "danger" }, ACCELERATION_NOTICE: { label: "상실 예정", tone: "danger" }, ACCELERATED: { label: "기한이익상실", tone: "danger" }, PAID_OFF: { label: "완제", tone: "neutral" },
};
export const ASSET_CLASS_LABEL: Record<string, string> = { NORMAL: "정상", PRECAUTIONARY: "요주의", SUBSTANDARD: "고정", DOUBTFUL: "회수의문", ESTIMATED_LOSS: "추정손실" };

export const PAYMENT_DAY_OPTIONS = Array.from({ length: 28 }, (_, i) => ({ value: i + 1, label: `매월 ${i + 1}일` }));

export const won = (n: number) => `${formatNumber(n)}원`;
export const pct = (n: number) => `${n.toFixed(2)}%`;

/** ISO date-time → "2026. 10. 30. 14:20". 잘못된 값은 그대로. */
export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return `${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()}. ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/** 오늘(로컬) YYYY-MM-DD. 계산기의 기준일 기본값에만 쓴다. 샌드박스는 영업일을 쓴다. */
export function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** 결정 문장: "요청 3,000만 원은 한도 4,793만 원 안이어서 승인이에요" 꼴. */
export function decisionSentence(result: ScreeningResult, requestedAmount: number, productMin: number | null): string {
  const limit = result.limits.finalLimit;
  if (result.decision === "APPROVED") return `요청 ${won(requestedAmount)}은 최종 한도 ${won(limit ?? requestedAmount)} 안이어서 승인이에요.`;
  if (result.decision === "CONDITIONAL") return `요청 ${won(requestedAmount)}이 최종 한도 ${won(limit ?? 0)}을 넘어서, 한도만큼인 ${won(result.offeredAmount ?? limit ?? 0)}으로 줄여 조건부 승인이에요.`;
  const failed = result.reasons.filter(r => r.ruleCode.startsWith("ELIG") && r.outcome === "FAIL");
  if (failed.length) return `자격 규칙 ${failed.map(r => RULE_LABEL[r.ruleCode] ?? r.ruleCode).join(", ")}을 충족하지 못해 거절이에요. 금리와 한도는 계산하지 않아요.`;
  return `최종 한도 ${won(limit ?? 0)}이 상품 최소 금액 ${productMin !== null ? won(productMin) : ""}에 못 미쳐 거절이에요.`;
}

/** 시간 진행 결과 한 줄 요약(aria-live). "33일 진행했어요. 1회차 자동이체 868,498원 완료. 영업일 2026-02-17" */
export function summarizeAdvance(result: ClockAdvanceResult): string {
  const parts: string[] = [`${result.daysAdvanced}일 진행했어요.`];
  const described = result.newEvents.map(describeEvent).filter(Boolean);
  if (described.length) parts.push(`${described.slice(0, 4).join(", ")}${described.length > 4 ? ` 외 ${described.length - 4}건` : ""}.`);
  else parts.push("처리된 납입·연체는 없어요.");
  if (result.newNotifications > 0) parts.push(`새 알림 ${result.newNotifications}개.`);
  parts.push(`영업일 ${result.toDate}`);
  return parts.join(" ");
}

export function describeEvent(e: ContractEvent): string {
  const d = (e.detail ?? {}) as Record<string, unknown>;
  const no = typeof d.installmentNo === "number" ? `${d.installmentNo}회차 ` : "";
  switch (e.type) {
    case "PAYMENT_COMPLETED": return `${no}자동이체 ${won(e.amount ?? 0)} 완료`;
    case "OVERDUE_STARTED": return `${no}${won(e.amount ?? 0)} 미납으로 연체 시작`;
    case "CLASS_CHANGED": return `건전성 ${ASSET_CLASS_LABEL[String(d.from)] ?? d.from} → ${ASSET_CLASS_LABEL[String(d.to)] ?? d.to}`;
    case "ACCELERATION_NOTICE": return `기한이익상실 예정 통지(${String(d.lossDate ?? "")} 상실 예정)`;
    case "ACCELERATED": return `기한이익상실, 전액 ${won(e.amount ?? 0)} 청구`;
    case "PAID_OFF": return `완제(총 납입 ${won(e.amount ?? 0)})`;
    case "EXECUTED": return `대출 실행 ${won(e.amount ?? 0)}`;
    case "REPAID": return `수동 상환 ${won(e.amount ?? 0)}`;
    case "PREPAID": return `${d.full ? "전액" : "일부"} 중도상환 ${won(e.amount ?? 0)}`;
    case "OVERDUE_CLEARED": return "연체 정상화";
    default: return e.type;
  }
}
