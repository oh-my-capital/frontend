import type { EmploymentType, RepaymentMethod } from "../../api/types";
import { EMPLOYMENT_LABEL, METHOD_LABEL, pct } from "../calculators/parts/labels";

/** 상품 안내 화면의 짧은 표기. 숫자는 서버 응답을 그대로 쓰고 모양만 바꾼다. */
export const rateRangeText = (min: number, max: number) => `${pct(min)} ~ ${pct(max)}`;

/** 12·24·36·48·60 → "12~60회". 한 개면 "12회". */
export function termRangeText(terms: number[]): string {
  if (terms.length === 0) return "—";
  const first = terms[0];
  const last = terms[terms.length - 1];
  return first === last ? `${first}회` : `${first}~${last}회`;
}

export const methodsText = (methods: RepaymentMethod[]) => methods.map(m => METHOD_LABEL[m]).join(" · ");

export function employmentText(employment: EmploymentType[]): string {
  return employment.length === 0 ? "조건 없음" : `${employment.map(e => EMPLOYMENT_LABEL[e]).join(" · ")}만`;
}
