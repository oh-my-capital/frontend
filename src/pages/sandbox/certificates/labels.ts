import type { CalendarItemStatus, CertificatePath, CertificateType } from "../../../api/certificates";
import type { StatusTone } from "../../../components/StatusChip";

/** 증명서 종류 세 가지(업무 규칙 WP21 §2~4). 설명은 발급 화면의 선택지 아래 한 줄. */
export const CERTIFICATE_TYPES: { path: CertificatePath; type: CertificateType; name: string; description: string }[] = [
  { path: "balance", type: "BALANCE", name: "부채잔액증명서", description: "영업일 기준 잔여 원금·미납 원리금·연체이자·연체일수와 지금 갚을 금액을 적어요." },
  { path: "payoff", type: "PAYOFF", name: "완납증명서", description: "완제된 계약만 발급돼요. 완제일과 그동안 낸 원금·이자·연체이자·수수료 합계를 적어요." },
  { path: "transactions", type: "TRANSACTIONS", name: "거래내역확인서", description: "지정한 기간의 상환 거래를 변제충당 순서(수수료 → 연체이자 → 이자 → 원금)로 나눠 적어요." },
];

export const CERTIFICATE_NAME: Record<CertificateType, string> = { BALANCE: "부채잔액증명서", PAYOFF: "완납증명서", TRANSACTIONS: "거래내역확인서" };
export const PATH_OF: Record<CertificateType, CertificatePath> = { BALANCE: "balance", PAYOFF: "payoff", TRANSACTIONS: "transactions" };

export function isCertificatePath(value: string | undefined): value is CertificatePath {
  return value === "balance" || value === "payoff" || value === "transactions";
}

/** 캘린더 회차 상태 라벨(업무 규칙 WP21 §6). 색과 함께 반드시 글자로 보인다. */
export const CALENDAR_STATUS: Record<CalendarItemStatus, { label: string; tone: StatusTone; description: string }> = {
  PAID: { label: "납입", tone: "good", description: "회차를 모두 냈다" },
  DUE: { label: "납입 임박", tone: "warn", description: "영업일부터 3일 안에 실제 납입일이 온다(납입 예정 알림과 같은 창)" },
  SCHEDULED: { label: "예정", tone: "neutral", description: "실제 납입일이 4일 이상 남았다" },
  OVERDUE: { label: "연체", tone: "danger", description: "실제 납입일이 지났는데 다 내지 않았다" },
  ACCELERATED: { label: "상실 청구", tone: "danger", description: "기한이익상실로 이 회차 원금이 이미 즉시 청구됐다" },
};

export const EDU_NOTICE = "교육용 모의 문서 — 법적 효력 없음";

/** 계약번호 끝 6자리(달력 칸이 좁을 때). 전체 번호는 title·목록형에서 보인다. */
export const shortContractNo = (no: string) => no.slice(-6);
