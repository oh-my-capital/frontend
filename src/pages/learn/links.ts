/** 개념에 연결된 계산기 코드 → 화면 경로·이름. 계약의 linkedCalculator enum(schedule·screening·prepayment). */
export const CALCULATOR_LINKS: Record<string, { to: string; label: string }> = {
  schedule: { to: "/calculators/schedule", label: "상환 스케줄 계산기" },
  screening: { to: "/calculators/screening", label: "심사 시뮬레이터" },
  prepayment: { to: "/calculators/prepayment", label: "중도상환 견적" },
};

export function calculatorLink(code: string | null | undefined): { to: string; label: string } | null {
  return code ? CALCULATOR_LINKS[code] ?? null : null;
}

/** 권장 순서 구간. 홈·목차·내 학습이 같은 말을 쓴다. */
export const COURSE_PARTS = [
  { from: 1, to: 4, label: "여신의 구조", description: "여신전문금융업이 무엇인지, 캐피탈이 은행과 어떻게 다른지, 할부·신용대출·리스가 어떤 구조인지 읽는다." },
  { from: 5, to: 8, label: "금리·한도·심사", description: "금리가 세 요소로 구성되는 방식, 상환 방식별 총이자, 한도를 정하는 세 기준, 심사 네 단계를 계산기로 확인한다." },
  { from: 9, to: 12, label: "연체·건전성·중도상환", description: "연체이자가 언제 무엇에 붙는지, 기한이익상실과 건전성 분류, 중도상환수수료를 샌드박스와 견적 계산기로 겪어 본다." },
];

/**
 * 개념 → 대표 용어 2개(용어 사전 slug). 콘텐츠의 relatedTerms 앞부분과 같은 값이며, 목록 API 가
 * 용어를 내려 주지 않아 홈 목차의 한 줄 안내용으로 여기에 둔다. 새 개념이 생기면 여기에도 더한다.
 */
export const CONCEPT_TERMS: Record<string, { slug: string; label: string }[]> = {
  "credit-finance-overview": [{ slug: "credit", label: "여신" }, { slug: "deposit-taking", label: "수신" }],
  "capital-vs-bank": [{ slug: "secondary-financial-sector", label: "제2금융권" }, { slug: "savings-bank", label: "저축은행" }],
  "installment-and-credit-loan": [{ slug: "installment-finance", label: "할부금융" }, { slug: "credit-loan", label: "신용대출" }],
  "lease-basics": [{ slug: "operating-lease", label: "운용리스" }, { slug: "finance-lease", label: "금융리스" }],
  "interest-rate-structure": [{ slug: "contract-rate", label: "약정이율" }, { slug: "credit-spread", label: "신용 스프레드" }],
  "repayment-methods": [{ slug: "equal-payment", label: "원리금균등" }, { slug: "equal-principal", label: "원금균등" }],
  "dsr-ltv-limit": [{ slug: "dsr", label: "DSR" }, { slug: "ltv", label: "LTV" }],
  "credit-score-and-screening": [{ slug: "credit-band", label: "신용 밴드" }, { slug: "credit-score", label: "신용점수" }],
  "delinquency-and-overdue-interest": [{ slug: "overdue-interest", label: "연체이자" }, { slug: "overdue-rate", label: "연체이율" }],
  "acceleration": [{ slug: "acceleration", label: "기한이익상실" }, { slug: "benefit-of-time", label: "기한의 이익" }],
  "asset-classification-and-provision": [{ slug: "asset-classification", label: "건전성 분류" }, { slug: "precautionary", label: "요주의" }],
  "prepayment-and-fee": [{ slug: "prepayment-fee", label: "중도상환수수료" }, { slug: "accrued-interest", label: "경과이자" }],
};
