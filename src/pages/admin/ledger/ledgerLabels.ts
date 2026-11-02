import type { ReactNode } from "react";
import type { StatusTone } from "../../../components/StatusChip";
import type { LedgerEventType, ReconciliationStatus } from "../../../api/ledger";

/** 분개 사건 라벨·톤(business-rules WP30 §30.2). 색만으로 말하지 않도록 라벨을 함께 쓴다. */
export const EVENT_TYPE: Record<LedgerEventType, { label: string; tone: StatusTone }> = {
  EXECUTION: { label: "대출 실행", tone: "info" },
  REPAYMENT: { label: "상환", tone: "good" },
  PREPAYMENT: { label: "중도상환", tone: "good" },
  WITHDRAWAL: { label: "청약철회", tone: "neutral" },
  ACCELERATION: { label: "기한이익상실", tone: "danger" },
  PROVISION: { label: "충당금", tone: "warn" },
  PROVISION_RELEASE: { label: "충당금 환입(종료)", tone: "neutral" },
};
export const EVENT_TYPES = Object.keys(EVENT_TYPE) as LedgerEventType[];

export const RECON_STATUS: Record<ReconciliationStatus, { label: string; tone: StatusTone }> = {
  MATCHED: { label: "일치", tone: "good" },
  MISMATCHED: { label: "불일치", tone: "danger" },
  FAILED: { label: "마감 실패", tone: "warn" },
};
export const RECON_STATUSES = Object.keys(RECON_STATUS) as ReconciliationStatus[];

export const ACCOUNT_TYPE: Record<string, string> = { ASSET: "자산", CONTRA_ASSET: "자산 차감", REVENUE: "수익", EXPENSE: "비용" };

export interface TabProps {
  params: URLSearchParams;
  update: (changes: Record<string, string | null>) => void;
  onError: (error: unknown) => ReactNode;
}
