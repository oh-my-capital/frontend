/** 숫자·날짜 표기 규칙. 금액은 천 단위 쉼표, 단위 "원"은 화면 컴포넌트(Money)가 작은 글자로 뒤에 붙인다. */
const number = new Intl.NumberFormat("ko-KR");

export function formatNumber(value: number): string {
  return number.format(value);
}

/** 연 % 표기. 소수 둘째 자리까지(7.9 → "7.90%"). */
export function formatRate(value: number, digits = 2): string {
  return `${value.toFixed(digits)}%`;
}

/** `YYYY-MM-DD` → `2026. 1. 15.` 처럼 읽기 쉬운 형태. 잘못된 값은 그대로 돌려준다. */
export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return value;
  return `${m[1]}. ${Number(m[2])}. ${Number(m[3])}.`;
}

/** 입력창용: 숫자만 남기고 천 단위 쉼표를 붙인다. */
export function digitsOnly(text: string): string {
  return text.replace(/[^\d]/g, "");
}
export function withCommas(digits: string): string {
  if (!digits) return "";
  return formatNumber(Number(digits));
}
