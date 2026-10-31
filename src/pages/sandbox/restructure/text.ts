import { RESTRUCTURE_LABEL, type RestructureQuote, type RestructureTerms, type RestructureType } from "../../../api/restructure";
import { formatDate } from "../../../lib/format";
import { won } from "../../calculators/parts/labels";

/** 차이 금액: +1,234원 / −1,234원 / 변화 없음. 색과 함께 부호를 글자로 쓴다(색만으로 말하지 않는다). */
export function signedWon(value: number): string {
  if (value > 0) return `+${won(value)}`;
  if (value < 0) return `−${won(-value)}`;
  return "변화 없음";
}

export function signedCount(value: number, unit: string): string {
  if (value > 0) return `+${value}${unit}`;
  if (value < 0) return `−${-value}${unit}`;
  return "변화 없음";
}

/** 차이의 방향 클래스(부담이 늘면 up, 줄면 down). */
export function diffClass(value: number): string {
  if (value > 0) return "restructure-diff restructure-diff-up";
  if (value < 0) return "restructure-diff restructure-diff-down";
  return "restructure-diff";
}

/** "2~4회차" */
export function installmentRange(first: number, count: number): string {
  return count <= 1 ? `${first}회차` : `${first}~${first + count - 1}회차`;
}

/** 견적 한 줄 요약(aria-live 영역에 넣는다). */
export function quoteSummary(q: RestructureQuote): string {
  const { before: b, after: a } = q;
  const interestUp = a.remainingInterest - b.remainingInterest;
  if (q.type === "DEFERMENT") {
    const regularFrom = a.firstInstallmentNo + a.interestOnlyInstallments;
    return `원금 상환 유예 ${q.months}개월이면 ${installmentRange(a.firstInstallmentNo, a.interestOnlyInstallments)}는 이자 ${won(a.interestOnlyPayment ?? 0)}만 내고, `
      + `${regularFrom}회차부터 월 ${won(a.monthlyPayment)}을 내요(지금보다 ${won(Math.abs(a.monthlyPayment - b.monthlyPayment))} ${a.monthlyPayment >= b.monthlyPayment ? "많아요" : "적어요"}). `
      + `만기는 ${formatDate(a.maturityDate)} 그대로이고, 원금을 늦게 갚는 만큼 남은 총이자가 ${won(Math.abs(interestUp))} ${interestUp >= 0 ? "늘어요" : "줄어요"}.`;
  }
  return `만기를 ${q.months}개월 늦춰 ${formatDate(a.maturityDate)}까지 나눠 갚고, 월 납입액이 ${won(b.monthlyPayment)}에서 ${won(a.monthlyPayment)}으로 `
    + `${won(Math.abs(b.monthlyPayment - a.monthlyPayment))} ${a.monthlyPayment <= b.monthlyPayment ? "줄어요" : "늘어요"}. `
    + `대신 갚는 기간이 길어져 남은 총이자가 ${won(Math.abs(interestUp))} ${interestUp >= 0 ? "늘어요" : "줄어요"}.`;
}

/** 적용 결과 문장. */
export function appliedSummary(type: RestructureType, months: number, businessDate: string, a: RestructureTerms): string {
  const head = `${formatDate(businessDate)}에 ${RESTRUCTURE_LABEL[type]} ${months}개월을 적용했어요.`;
  if (type === "DEFERMENT") {
    return `${head} ${installmentRange(a.firstInstallmentNo, a.interestOnlyInstallments)}는 이자 ${won(a.interestOnlyPayment ?? 0)}만 자동이체되고, `
      + `${a.firstInstallmentNo + a.interestOnlyInstallments}회차부터 월 ${won(a.monthlyPayment)}이에요. 만기는 ${formatDate(a.maturityDate)} 그대로예요.`;
  }
  return `${head} 월 납입액은 ${won(a.monthlyPayment)}이고 만기는 ${formatDate(a.maturityDate)}, 남은 회차는 ${a.remainingInstallments}회예요.`;
}
