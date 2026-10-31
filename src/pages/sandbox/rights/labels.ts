import type { StatusTone } from "../../../components/StatusChip";
import type { RateCutDecision, RateCutReason, WithdrawalQuote } from "../../../api/rights";

/** WP19 화면 라벨. 계약 상태 WITHDRAWN 의 공용 라벨은 StatusChip 에도 한 줄 있다(같은 문구). */
export const CONTRACT_STATUS_LABEL: Record<string, { label: string; tone: StatusTone }> = {
  WITHDRAWN: { label: "청약 철회", tone: "neutral" },
};

export const DECISION_LABEL: Record<RateCutDecision, { label: string; tone: StatusTone }> = {
  ACCEPTED: { label: "수락", tone: "good" },
  REJECTED: { label: "거절", tone: "neutral" },
};

export const REASON_LABEL: Record<RateCutReason, string> = {
  NOT_ELIGIBLE: "자격 미충족",
  NO_IMPROVEMENT: "금리 개선 없음",
  BELOW_MIN_REDUCTION: "인하 폭 부족",
};

/** 철회 가능 기간 라벨: 남은 일수를 글자로(색만으로 말하지 않는다). */
export function periodLabel(q: WithdrawalQuote): { label: string; tone: StatusTone } {
  if (q.daysLeft < 0) return { label: "철회 기간 경과", tone: "neutral" };
  if (q.daysLeft === 0) return { label: "오늘이 마지막 날", tone: "warn" };
  return { label: `${q.daysLeft}일 남음`, tone: "info" };
}

export const bp = (n: number) => `${(n / 100).toFixed(2)}%p`;

/** 좁은 보조 열용 짧은 날짜: 2026-11-02 → "11. 2." */
export function shortDate(value: string): string {
  const m = value.match(/^\d{4}-(\d{2})-(\d{2})/);
  return m ? `${Number(m[1])}. ${Number(m[2])}.` : value;
}
