/**
 * 개념에 연결된 화면 코드 → 경로·이름. 계약의 linkedCalculator 값(WP24에서 auto-finance·refinance·dsr·rights 추가,
 * docs contracts/api/wp24-content.yml). kind 가 "screen" 이면 계산기가 아니라 안내 화면이라 "연결 화면"으로 표시한다.
 * 코드 목록은 data scripts/validate.mjs·backend ContentValidator.CALCULATORS 와 같아야 한다.
 */
export interface LinkedScreen { to: string; label: string; kind: "calculator" | "screen" }

export const CALCULATOR_LINKS: Record<string, LinkedScreen> = {
  schedule: { to: "/calculators/schedule", label: "상환 스케줄 계산기", kind: "calculator" },
  screening: { to: "/calculators/screening", label: "심사 시뮬레이터", kind: "calculator" },
  prepayment: { to: "/calculators/prepayment", label: "중도상환 견적", kind: "calculator" },
  "auto-finance": { to: "/calculators/auto-finance", label: "자동차 금융 비교 계산기", kind: "calculator" },
  refinance: { to: "/calculators/refinance", label: "대환 비교 계산기", kind: "calculator" },
  dsr: { to: "/calculators/dsr", label: "DSR 계산기", kind: "calculator" },
  rights: { to: "/support/rights", label: "금융소비자 권리 안내", kind: "screen" },
};

export function calculatorLink(code: string | null | undefined): LinkedScreen | null {
  return code ? CALCULATOR_LINKS[code] ?? null : null;
}

/** 샌드박스 과업이 있는 개념(목록 API 가 sandboxTask 를 내려 주지 않아 목차의 한 줄 안내용으로 둔다). 새 개념이 생기면 여기에도 더한다. */
export const SANDBOX_TASK_CONCEPTS = new Set([
  "credit-score-and-screening",
  "delinquency-and-overdue-interest",
  "acceleration",
  "asset-classification-and-provision",
  "prepayment-and-fee",
  "collection-and-debtor-protection",
  "financial-consumer-rights",
]);

/** 권장 순서 구간. 홈·목차·내 학습이 같은 말을 쓴다. */
export const COURSE_PARTS = [
  { from: 1, to: 4, label: "여신의 구조", description: "여신전문금융업이 무엇인지, 캐피탈이 은행과 어떻게 다른지, 할부·신용대출·리스가 어떤 구조인지 읽는다." },
  { from: 5, to: 8, label: "금리·한도·심사", description: "금리가 세 요소로 구성되는 방식, 상환 방식별 총이자, 한도를 정하는 세 기준, 심사 네 단계를 계산기로 확인한다." },
  { from: 9, to: 12, label: "연체·건전성·중도상환", description: "연체이자가 언제 무엇에 붙는지, 기한이익상실과 건전성 분류, 중도상환수수료를 샌드박스와 견적 계산기로 겪어 본다." },
  { from: 13, to: 16, label: "채권 관리·권리·자동차 금융·대환", description: "연체 이후의 채권 관리 단계와 채무자 보호, 자동차 리스·장기렌트, 계약 뒤의 소비자 권리, 대환대출과 DSR을 계산기와 권리 안내로 확인한다." },
];

/** 과정 전체 개념 수(마지막 구간의 끝 번호). 목록을 불러오기 전 표시에만 쓴다. */
export const COURSE_TOTAL = COURSE_PARTS[COURSE_PARTS.length - 1].to;

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
  "collection-and-debtor-protection": [{ slug: "collection-stages", label: "채권 관리 단계" }, { slug: "individual-debtor-protection-act", label: "개인채무자보호법" }],
  "auto-lease-and-rental": [{ slug: "long-term-rental", label: "장기렌트" }, { slug: "residual-value", label: "잔존가치" }],
  "financial-consumer-rights": [{ slug: "financial-consumer-protection-act", label: "금융소비자보호법" }, { slug: "withdrawal-right", label: "청약철회권" }],
  "refinance-and-dsr": [{ slug: "refinance", label: "대환대출" }, { slug: "switching-cost", label: "갈아타기 비용" }],
};
