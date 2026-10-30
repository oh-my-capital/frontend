import type { ApplicationStatus, AssetClass, ContentStatus, ContractStatus, Decision } from "../api/types";

export type StatusTone = "neutral" | "info" | "good" | "warn" | "danger";

/**
 * 상태 chip. 배경 tint + 텍스트 라벨 조합이며 라벨이 필수다(색만으로 상태를 말하지 않는다).
 * 알려진 코드는 statusLabel 로 한국어 라벨과 톤을 얻는다. 연체는 "연체 12일"처럼 일수를 함께 쓴다.
 */
export default function StatusChip({ label, tone = "neutral", detail }: { label: string; tone?: StatusTone; detail?: string }) {
  return <span className={`status status-${tone}`}>{label}{detail && <span className="status-detail">{detail}</span>}</span>;
}

type KnownStatus = ContractStatus | ApplicationStatus | Decision | AssetClass | ContentStatus | string;

const LABELS: Record<string, { label: string; tone: StatusTone }> = {
  ACTIVE: { label: "정상", tone: "good" },
  OVERDUE: { label: "연체", tone: "danger" },
  DEFAULTED: { label: "기한이익상실", tone: "danger" },
  PAID_OFF: { label: "완제", tone: "neutral" },
  APPLIED: { label: "접수", tone: "info" },
  APPROVED: { label: "승인", tone: "good" },
  CONDITIONAL: { label: "조건부 승인", tone: "warn" },
  REJECTED: { label: "거절", tone: "danger" },
  CANCELLED: { label: "취소", tone: "neutral" },
  EXECUTED: { label: "실행 완료", tone: "good" },
  NORMAL: { label: "정상", tone: "good" },
  PRECAUTIONARY: { label: "요주의", tone: "warn" },
  SUBSTANDARD: { label: "고정", tone: "danger" },
  DOUBTFUL: { label: "회수의문", tone: "danger" },
  ESTIMATED_LOSS: { label: "추정손실", tone: "danger" },
  PASS: { label: "통과", tone: "good" },
  FAIL: { label: "미충족", tone: "danger" },
  INFO: { label: "참고", tone: "info" },
  // 콘텐츠 상태(ContentStatus) — 운영 콘솔의 adminLabels.ts 와 같은 라벨
  DRAFT: { label: "초안", tone: "info" },
  PUBLISHED: { label: "게시", tone: "good" },
  RETIRED: { label: "내림", tone: "neutral" },
  // 배치 실행 상태(BatchExecution.status)
  SUCCESS: { label: "성공", tone: "good" },
  FAILED: { label: "실패", tone: "danger" },
  SKIPPED: { label: "건너뜀", tone: "neutral" },
  RUNNING: { label: "실행 중", tone: "info" },
};

export function statusLabel(code: KnownStatus): { label: string; tone: StatusTone } {
  return LABELS[code] ?? { label: code, tone: "neutral" };
}

/** 계약 상태를 chip 으로. 연체 중이면 일수를 붙인다. */
export function ContractStatusChip({ status, overdueDays }: { status: ContractStatus; overdueDays?: number }) {
  const { label, tone } = statusLabel(status);
  const detail = (status === "OVERDUE" || status === "DEFAULTED") && overdueDays ? ` ${overdueDays}일` : undefined;
  return <StatusChip label={label} tone={tone} detail={detail} />;
}
