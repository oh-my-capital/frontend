import type { AutoFinanceOption, AutoFinanceType, VehicleOwner } from "../../../api/autoFinance";
import { formatNumber } from "../../../lib/format";

/**
 * 자동차 금융 비교(S-160, WP16)의 라벨·문장. 용어는 docs/domain/business-rules.md "WP16 — 자동차 금융 비교" 절을 따른다.
 * 방식 이름(label)은 응답에 들어 있지만, 응답이 오기 전 빈 상태·aside 에서도 쓰려고 여기에도 둔다.
 */
export const AUTO_FINANCE_TYPES: AutoFinanceType[] = ["INSTALLMENT", "FINANCIAL_LEASE", "OPERATING_LEASE", "LONG_TERM_RENT"];

export const AUTO_FINANCE_LABEL: Record<AutoFinanceType, string> = {
  INSTALLMENT: "할부",
  FINANCIAL_LEASE: "금융리스",
  OPERATING_LEASE: "운용리스",
  LONG_TERM_RENT: "장기렌트",
};

export const AUTO_FINANCE_DESCRIPTION: Record<AutoFinanceType, string> = {
  INSTALLMENT: "차를 사고 대금을 나눠 갚는다. 처음부터 고객 명의이고 캐피탈은 저당권만 둔다.",
  FINANCIAL_LEASE: "리스회사가 산 차를 빌려 쓰다가 만기에 잔존가치를 내고 인수한다.",
  OPERATING_LEASE: "리스회사가 잔존가치 위험을 지고, 이용자는 만기에 반납·인수·재리스를 고른다.",
  LONG_TERM_RENT: "렌트회사가 보험·자동차세·정비를 맡고 그 비용을 렌트료에 넣어 받는다.",
};

export const OWNER_LABEL: Record<VehicleOwner, string> = { CUSTOMER: "고객 명의", COMPANY: "회사 명의" };

/** 기간: 규칙 세트 autoFinance.term_months(12~60, 12 단위)와 같다. 서버가 다시 검사한다. */
export const AUTO_FINANCE_TERMS = [12, 24, 36, 48, 60].map(n => ({ value: n, label: `${n}개월(${n}회)` }));

/** 만기 정산액 문장. + 는 내는 돈, − 는 돌려받는 돈, null 은 새 계약. */
export function settlementText(amount: number | null): string {
  if (amount === null) return "새 조건으로 다시 계산";
  if (amount > 0) return `${formatNumber(amount)}원 납부`;
  if (amount < 0) return `${formatNumber(-amount)}원 돌려받음`;
  return "정산 없음";
}

/** 기준 시나리오의 만기 명의 변화: "회사 명의 → 인수 후 고객 명의" 꼴. */
export function ownershipText(option: AutoFinanceOption): string {
  if (option.registeredOwner === option.ownerAtMaturity) return `${OWNER_LABEL[option.registeredOwner]}(만기 뒤에도)`;
  return `${OWNER_LABEL[option.registeredOwner]} → 인수 후 ${OWNER_LABEL[option.ownerAtMaturity]}`;
}

/** 총 지출에 쓴 만기 시나리오 이름. */
export const ASSUMED_LABEL: Record<AutoFinanceOption["assumedMaturityOption"], string> = { KEEP: "계속 보유", BUYOUT: "인수", RETURN: "반납" };
