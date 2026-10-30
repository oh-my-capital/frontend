/**
 * VITE_MOCK=1에서 쓰는 고정 응답. 값은 docs/domain/calculation-examples.md의 골든 값과 business-rules.md·learning-roadmap.md의 수치를 그대로 쓴다.
 * 문서에 없는 값(7.70% 계약의 월 납입액 등)은 같은 규칙으로 여기서 계산하며, 골든 값이 아니라고 주석에 적는다.
 */
import type {
  AdminApplicationPage, Application, BatchExecution, Concept, ConceptSummary, Contract, ContractEvent, ContractSummary,
  Disclosure, LedgerEntry, Methodology, MyLearning, Notification, Portfolio, PrepaymentQuote, Product, Provision, Quiz,
  RepaymentMethod, Sandbox, ScheduleResponse, ScheduleRow, ScreeningResult, Term, TermSummary, Transaction, User,
} from "../types";

export const DISCLOSURE: Disclosure = {
  ruleSetVersion: "v1",
  calcVersion: "v1",
  dayCountBasis: 365,
  rounding: "이자 절사, 월 납입액 반올림",
  notice: "교육용 모의 계산이며 실제 대출 조건이 아닙니다.",
};

export const USERS: User[] = [
  { id: 1, email: "learner@example.com", role: "USER" },
  { id: 2, email: "admin@example.com", role: "ADMIN" },
];

// business-rules §2
export const PRODUCTS: Product[] = [
  {
    code: "CREDIT_LOAN", name: "신용대출", minAmount: 1_000_000, maxAmount: 50_000_000, allowedTerms: [12, 24, 36, 48, 60], baseRate: 5.9,
    allowedMethods: ["EQUAL_PAYMENT", "EQUAL_PRINCIPAL", "BULLET"], prepaymentFeeRate: 0.7, requiresCollateral: false, ltvRate: null,
    description: "담보 없이 신용으로 빌리는 대출이다. 상환 방식 세 가지를 모두 고를 수 있다.",
  },
  {
    code: "AUTO_INSTALLMENT", name: "자동차 할부", minAmount: 3_000_000, maxAmount: null, allowedTerms: [12, 24, 36, 48, 60, 72], baseRate: 4.5,
    allowedMethods: ["EQUAL_PAYMENT"], prepaymentFeeRate: 1.5, requiresCollateral: true, ltvRate: 90,
    description: "차량 구매 대금을 캐피탈이 판매사에 지급하고 고객이 나눠 갚는다. 한도는 차량가의 90%까지다.",
  },
];

// learning-roadmap.md 1단계 12개념
export const CONCEPTS: ConceptSummary[] = [
  { id: "credit-finance-overview", orderNo: 1, title: "여신전문금융업이란", summary: "신용카드·할부금융·시설대여(리스)·신기술사업금융, 네 업무를 돈의 흐름으로 구분한다.", quizCount: 4, linkedCalculator: null },
  { id: "capital-vs-bank", orderNo: 2, title: "캐피탈·은행·저축은행 비교", summary: "수신 유무, 자금 조달(회사채), 금리 수준, 예금자보호의 차이를 비교한다.", quizCount: 4, linkedCalculator: null },
  { id: "installment-and-credit-loan", orderNo: 3, title: "할부금융과 신용대출", summary: "물건이 있는 대출과 없는 대출. 자동차 할부의 참여자(고객·판매사·캐피탈)를 연결한다.", quizCount: 4, linkedCalculator: null },
  { id: "lease-basics", orderNo: 4, title: "리스의 기본", summary: "운용리스·금융리스, 소유권과 잔존가치. 할부와 리스의 소유권 차이를 짚는다.", quizCount: 3, linkedCalculator: null },
  { id: "interest-rate-structure", orderNo: 5, title: "금리의 구성", summary: "기준금리 + 신용 스프레드 − 우대, 그리고 최고금리 상한. 같은 상품에서 점수별 금리를 읽는다.", quizCount: 4, linkedCalculator: "screening" },
  { id: "repayment-methods", orderNo: 6, title: "상환 방식 3가지와 총이자", summary: "원리금균등·원금균등·만기일시의 월 납입액과 총이자 차이를 계산기로 비교한다.", quizCount: 5, linkedCalculator: "schedule" },
  { id: "dsr-ltv-limit", orderNo: 7, title: "한도의 규칙: DSR·LTV·소득배수", summary: "한도가 어디서 막히는지 심사 계산기에서 찾는다.", quizCount: 4, linkedCalculator: "screening" },
  { id: "credit-score-and-screening", orderNo: 8, title: "신용점수와 심사", summary: "자격 → 금리 → 한도 → 결정 순서와 조건부 승인. 거절 사유 코드를 읽는다.", quizCount: 4, linkedCalculator: "screening" },
  { id: "delinquency-and-overdue-interest", orderNo: 9, title: "연체와 연체이자", summary: "언제부터, 무엇에, 얼마나 붙는가. 샌드박스에서 1회 미납 후 30일을 진행해 본다.", quizCount: 4, linkedCalculator: null },
  { id: "acceleration", orderNo: 10, title: "기한이익상실", summary: "통지 → 상실 → 전액 청구. 60일 연체 시 잔액 전체에 연체이율이 붙는다.", quizCount: 3, linkedCalculator: null },
  { id: "asset-classification-and-provision", orderNo: 11, title: "건전성 분류 5단계와 대손충당금", summary: "정상·요주의·고정·회수의문·추정손실과 적립률. 월마감 후 충당금 변화를 읽는다.", quizCount: 4, linkedCalculator: null },
  { id: "prepayment-and-fee", orderNo: 12, title: "중도상환과 수수료", summary: "왜 받는가, 어떻게 줄어드는가. 견적 계산기로 시점별 수수료를 비교한다.", quizCount: 4, linkedCalculator: "prepayment" },
];

export function conceptDetail(summary: ConceptSummary): Concept {
  const index = CONCEPTS.findIndex(c => c.id === summary.id);
  return {
    ...summary,
    totalCount: CONCEPTS.length,
    linkedCalculator: (summary.linkedCalculator as Concept["linkedCalculator"]) ?? null,
    sections: [
      { heading: "정의", body: `${summary.title}에 대한 설명 본문이다. 실제 콘텐츠는 data 저장소 content/concepts/${summary.id}.json에서 적재한다.`, figure: summary.orderNo === 3 ? "auto-installment-flow" : null },
      { heading: "돈의 흐름", body: "참여자와 금액이 어떻게 오가는지 그림으로 본다.", figure: null },
    ],
    misconceptions: [{ claim: "2금융권 대출은 모두 위험하다", correction: "조달 구조와 금리 수준이 다를 뿐이며, 조건은 상품·신용도에 따라 정해진다." }],
    checklist: ["핵심 용어 세 개를 내 말로 설명할 수 있다", "연결된 계산기에서 숫자를 바꿔 보았다"],
    sandboxTask: summary.orderNo >= 9 && summary.orderNo <= 11 ? "내 모의 여신에서 1회 미납 뒤 30일 진행" : null,
    sources: [{ title: "금융감독원 금융소비자정보포털 파인 — 여신전문금융회사 안내", url: "https://fine.fss.or.kr", checkedOn: "2026-10-30" }],
    contentVersion: 1,
    prev: index > 0 ? CONCEPTS[index - 1].id : null,
    next: index < CONCEPTS.length - 1 ? CONCEPTS[index + 1].id : null,
  };
}

export function quizFor(conceptId: string): Quiz {
  const concept = CONCEPTS.find(c => c.id === conceptId);
  const count = concept?.quizCount ?? 3;
  return {
    conceptId,
    contentVersion: 1,
    questions: Array.from({ length: count }, (_, i) => ({
      id: i + 1,
      question: `${concept?.title ?? conceptId} 확인 문제 ${i + 1}. 다음 중 맞는 설명은?`,
      options: [1, 2, 3, 4].map(n => ({ id: n, text: `선택지 ${n}` })),
    })),
  };
}

// docs/domain/glossary.md 일부
export const TERMS: TermSummary[] = [
  { slug: "credit", term: "여신", english: "credit, lending", category: "업무", definition: "돈을 빌려주는 업무 전체. 수신(예금 받기)의 반대다." },
  { slug: "credit-finance-company", term: "여신전문금융회사", english: "credit finance company", category: "업무", definition: "수신 없이 회사채·차입으로 자금을 조달해 여신만 하는 회사. 카드·캐피탈이 여기에 든다." },
  { slug: "installment-finance", term: "할부금융", english: "installment finance", category: "업무", definition: "물건 구매 대금을 캐피탈이 판매자에게 지급하고 고객이 나눠 갚는 구조다." },
  { slug: "contract-rate", term: "약정이율", english: "contract rate", category: "금리", definition: "계약서에 적힌 연 이자율이다." },
  { slug: "dsr", term: "DSR", english: "debt service ratio", category: "금리", definition: "연 소득 대비 모든 대출의 연 원리금 상환액 비율이다." },
  { slug: "ltv", term: "LTV", english: "loan to value", category: "금리", definition: "담보 가치 대비 대출 비율이다." },
  { slug: "equal-payment", term: "원리금균등", english: "equal payment", category: "상환", definition: "매월 같은 금액(원금+이자)을 낸다. 초기에는 이자 비중이 크다." },
  { slug: "equal-principal", term: "원금균등", english: "equal principal", category: "상환", definition: "매월 같은 원금에 줄어드는 이자를 더해 낸다." },
  { slug: "bullet", term: "만기일시", english: "bullet", category: "상환", definition: "매월 이자만 내고 만기에 원금을 전부 갚는다." },
  { slug: "acceleration", term: "기한이익상실", english: "acceleration", category: "연체", definition: "연체가 길어져 남은 원금 전체를 한 번에 갚아야 하는 상태가 되는 것이다." },
];

export function termDetail(summary: TermSummary): Term {
  return {
    ...summary,
    formula: summary.slug === "dsr" ? "DSR = (기존 연 원리금 + 신규 연 원리금) ÷ 연소득" : null,
    example: summary.slug === "dsr" ? "연소득 48,000,000원, 연 원리금 합계 17,264,496원이면 DSR 35.97%이다(계산 예시 6)." : null,
    caution: "교육용 정의이며 실제 금융기관의 심사 기준과 다를 수 있다.",
    related: TERMS.filter(t => t.category === summary.category && t.slug !== summary.slug).slice(0, 3),
    conceptIds: CONCEPTS.filter(c => c.orderNo <= 3).map(c => c.id).slice(0, 2),
    sourceUrl: "https://www.law.go.kr",
    sourceCheckedOn: "2026-10-30",
  };
}

export const METHODOLOGY: Methodology = {
  ruleSetVersion: "v1",
  calcVersion: "v1",
  rounding: { interest: "절사(floor)", monthlyPayment: "반올림(HALF_UP)", limit: "만 원 절사" },
  dayCountBasis: 365,
  creditBands: [
    { band: "A", minScore: 900, maxScore: 1000, spreads: { CREDIT_LOAN: 0, AUTO_INSTALLMENT: 0 }, incomeMultiple: 1.5 },
    { band: "B", minScore: 800, maxScore: 899, spreads: { CREDIT_LOAN: 2, AUTO_INSTALLMENT: 1 }, incomeMultiple: 1.2 },
    { band: "C", minScore: 700, maxScore: 799, spreads: { CREDIT_LOAN: 5, AUTO_INSTALLMENT: 2.5 }, incomeMultiple: 1.0 },
    { band: "D", minScore: 600, maxScore: 699, spreads: { CREDIT_LOAN: 9, AUTO_INSTALLMENT: 4.5 }, incomeMultiple: 0.6 },
  ],
  dsrLimit: 50,
  ltvRate: 90,
  overdueSpread: 3,
  legalMaxRate: 20,
  accelerationNoticeDays: 45,
  accelerationDays: 60,
  assetClasses: [
    { code: "NORMAL", label: "정상", minOverdueDays: 0, provisionRate: 1 },
    { code: "PRECAUTIONARY", label: "요주의", minOverdueDays: 30, provisionRate: 10 },
    { code: "SUBSTANDARD", label: "고정", minOverdueDays: 90, provisionRate: 20 },
    { code: "DOUBTFUL", label: "회수의문", minOverdueDays: 180, provisionRate: 75 },
    { code: "ESTIMATED_LOSS", label: "추정손실", minOverdueDays: 365, provisionRate: 100 },
  ],
  products: PRODUCTS,
  regulatoryFigures: [
    { name: "법정 최고금리", value: "연 20%", sourceUrl: "https://www.law.go.kr", checkedOn: "2026-10-30" },
    { name: "연체이자율 가산 상한", value: "약정이율 + 3%p", sourceUrl: "https://www.fsc.go.kr", checkedOn: "2026-10-30" },
  ],
  assumptions: ["건전성 분류 일수와 적립률은 교육용 가정값이다", "상품·기준금리·스프레드는 교육용 시드 값이다", "영업일은 토·일만 제외한다(공휴일 없음)"],
};

// ── 스케줄 계산(계산 예시 1~3·10과 같은 규칙) ──────────────────────────────
function pad(n: number) { return String(n).padStart(2, "0"); }
function iso(d: Date) { return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`; }
function addMonths(start: string, months: number, day: number): string {
  const [y, m] = start.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + months, day));
  return iso(d);
}
/** 토·일이면 다음 월요일(계산 예시 10). */
function nextBusinessDay(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  const wd = d.getUTCDay();
  if (wd === 6) d.setUTCDate(d.getUTCDate() + 2);
  else if (wd === 0) d.setUTCDate(d.getUTCDate() + 1);
  return iso(d);
}
function halfUp(x: number) { return Math.floor(x + 0.5); }

export function buildSchedule(principal: number, termMonths: number, annualRate: number, startDate: string, paymentDay: number, method: RepaymentMethod): ScheduleRow[] {
  const r = annualRate / 100 / 12;
  const rows: ScheduleRow[] = [];
  let balance = principal;
  const monthly = r === 0 ? halfUp(principal / termMonths) : halfUp(principal * r * Math.pow(1 + r, termMonths) / (Math.pow(1 + r, termMonths) - 1));
  const equalPrincipal = Math.floor(principal / termMonths);
  for (let k = 1; k <= termMonths; k++) {
    const interest = Math.floor(balance * r);
    let principalPart: number;
    if (method === "EQUAL_PAYMENT") principalPart = k === termMonths ? balance : monthly - interest;
    else if (method === "EQUAL_PRINCIPAL") principalPart = k === termMonths ? balance : equalPrincipal;
    else principalPart = k === termMonths ? balance : 0;
    balance -= principalPart;
    const dueDate = addMonths(startDate, k, paymentDay);
    rows.push({ installmentNo: k, dueDate, adjustedDueDate: nextBusinessDay(dueDate), principal: principalPart, interest, payment: principalPart + interest, balanceAfter: balance, status: null, paidOn: null });
  }
  return rows;
}

export function scheduleResponse(req: { principal: number; termMonths: number; annualRate: number; startDate: string; paymentDay: number; methods?: RepaymentMethod[] }): ScheduleResponse {
  const methods = req.methods?.length ? req.methods : (["EQUAL_PAYMENT", "EQUAL_PRINCIPAL", "BULLET"] as RepaymentMethod[]);
  return {
    results: methods.map(method => {
      const rows = buildSchedule(req.principal, req.termMonths, req.annualRate, req.startDate, req.paymentDay, method);
      const totalInterest = rows.reduce((s, row) => s + row.interest, 0);
      return {
        method,
        monthlyPayment: method === "EQUAL_PAYMENT" ? rows[0].payment : null,
        firstPayment: rows[0].payment,
        lastPayment: rows[rows.length - 1].payment,
        totalInterest,
        totalPayment: req.principal + totalInterest,
        rows,
      };
    }),
    disclosure: DISCLOSURE,
  };
}

/** 계산 예시 1의 첫 3회차. 홈의 "오늘의 계산 예시" 표가 그대로 쓴다(골든 값). */
export const EXAMPLE_1_FIRST_ROWS = [
  { installmentNo: 1, principal: 788_488, interest: 100_000, payment: 888_488, balanceAfter: 9_211_512 },
  { installmentNo: 2, principal: 796_373, interest: 92_115, payment: 888_488, balanceAfter: 8_415_139 },
  { installmentNo: 3, principal: 804_337, interest: 84_151, payment: 888_488, balanceAfter: 7_610_802 },
];

// 계산 예시 6 — 승인
export const SCREENING_EXAMPLE_6: ScreeningResult = {
  decision: "APPROVED",
  source: "AUTO",
  creditBand: "B",
  rate: { base: 5.9, spread: 2.0, discount: 0, applied: 7.9, capped: false },
  limits: { productCap: 50_000_000, incomeCap: 57_600_000, dsrCap: 47_930_000, ltvCap: null, finalLimit: 47_930_000, bindingRule: "LIMIT-DSR" },
  dsr: { existingAnnual: 6_000_000, newAnnual: 11_264_496, ratio: 35.97, limit: 50 },
  monthlyPayment: 938_708,
  offeredAmount: 30_000_000,
  reasons: [
    { orderNo: 1, ruleCode: "ELIG-AGE", input: "만 31세", threshold: "19세 이상", outcome: "PASS", reasonCode: null, message: "연령 조건을 충족한다" },
    { orderNo: 2, ruleCode: "ELIG-INCOME", input: "48,000,000원", threshold: "0원 초과", outcome: "PASS", reasonCode: null, message: "소득이 확인된다" },
    { orderNo: 3, ruleCode: "ELIG-SCORE", input: "820점", threshold: "600점 이상", outcome: "PASS", reasonCode: null, message: "신용점수 조건을 충족한다" },
    { orderNo: 4, ruleCode: "ELIG-PRODUCT", input: "30,000,000원 · 36회 · 원리금균등", threshold: "100만~5,000만 · 12~60회", outcome: "PASS", reasonCode: null, message: "상품 범위 안이다" },
    { orderNo: 5, ruleCode: "RATE", input: "밴드 B", threshold: "5.90 + 2.00 − 0.00", outcome: "INFO", reasonCode: null, message: "적용 금리 7.90%" },
    { orderNo: 6, ruleCode: "LIMIT-PRODUCT", input: "신용대출", threshold: "50,000,000원", outcome: "INFO", reasonCode: null, message: "상품 최대 한도" },
    { orderNo: 7, ruleCode: "LIMIT-INCOME", input: "48,000,000 × 1.2", threshold: "57,600,000원", outcome: "INFO", reasonCode: null, message: "소득배수 한도" },
    { orderNo: 8, ruleCode: "LIMIT-DSR", input: "월 여유 1,500,000원", threshold: "47,930,000원", outcome: "INFO", reasonCode: null, message: "DSR 역산 한도(병목)" },
    { orderNo: 9, ruleCode: "DECISION", input: "요청 30,000,000원", threshold: "최종 한도 47,930,000원", outcome: "PASS", reasonCode: null, message: "요청 금액이 한도 안이라 승인" },
  ],
  disclosure: DISCLOSURE,
};

// 계산 예시 5 — 전액 중도상환
export const PREPAYMENT_EXAMPLE_5: PrepaymentQuote = {
  asOf: "2026-07-25",
  outstandingPrincipal: 5_149_209,
  principalAmount: 5_149_209,
  accruedInterest: 16_928,
  accruedDays: 10,
  overdueInterest: 0,
  fee: 17_182,
  feeRate: 0.7,
  remainingDays: 174,
  loanDays: 365,
  feeWaived: false,
  totalDue: 5_183_319,
  isFull: true,
  remainingSchedule: [],
  newMonthlyPayment: null,
  disclosure: DISCLOSURE,
};

// ── 샌드박스(계산 예시 11, 2단계 "실행" 직후) ───────────────────────────────
export const SANDBOX: Sandbox = {
  id: 1,
  businessDate: "2026-01-15",
  settlementBalance: 10_000_000,
  profile: { birthDate: "1995-03-02", employmentType: "EMPLOYEE", annualIncome: 48_000_000, existingAnnualDebtService: 0, creditScore: 820 },
  activeContracts: 1,
  overdueContracts: 0,
  unreadNotifications: 1,
  nextDueDate: "2026-02-16",
};

// 7.70% 계약의 회차표. 월 납입액은 골든 값이 아니라 같은 규칙으로 여기서 계산한 값이다.
const CONTRACT_ROWS = buildSchedule(10_000_000, 12, 7.7, "2026-01-15", 15, "EQUAL_PAYMENT");

export const CONTRACT_SUMMARY: ContractSummary = {
  id: 1,
  contractNo: "CT-2026-000001",
  productName: "신용대출",
  principal: 10_000_000,
  outstandingPrincipal: 10_000_000,
  contractRate: 7.7,
  status: "ACTIVE",
  assetClass: "NORMAL",
  overdueDays: 0,
  nextDueDate: "2026-02-16",
  nextPayment: CONTRACT_ROWS[0].payment,
};

export const CONTRACT: Contract = {
  ...CONTRACT_SUMMARY,
  applicationId: 1,
  overdueRate: 10.7,
  termMonths: 12,
  repaymentMethod: "EQUAL_PAYMENT",
  paymentDay: 15,
  autoDebit: true,
  prepaymentFeeRate: 0.7,
  startDate: "2026-01-15",
  maturityDate: "2027-01-15",
  paidInstallments: 0,
  totalInstallments: 12,
  totalInterestPaid: 0,
  totalPaid: 0,
  delinquency: null,
  amountDueNow: 0,
  closedOn: null,
  disclosure: DISCLOSURE,
};
export const CONTRACT_SCHEDULE: ScheduleRow[] = CONTRACT_ROWS.map(row => ({ ...row, status: "SCHEDULED" }));

export const APPLICATION: Application = {
  id: 1,
  applicationNo: "AP-2026-000001",
  product: PRODUCTS[0],
  requestedAmount: 10_000_000,
  termMonths: 12,
  repaymentMethod: "EQUAL_PAYMENT",
  paymentDay: 15,
  autoDebit: true,
  status: "EXECUTED",
  appliedOn: "2026-01-15",
  decidedOn: "2026-01-15",
  collateral: null,
  screening: {
    ...SCREENING_EXAMPLE_6,
    rate: { base: 5.9, spread: 2.0, discount: 0.2, applied: 7.7, capped: false },
    dsr: { existingAnnual: 0, newAnnual: CONTRACT_ROWS.slice(0, 12).reduce((s, r) => s + r.payment, 0), ratio: 21.7, limit: 50 },
    limits: { productCap: 50_000_000, incomeCap: 57_600_000, dsrCap: 50_000_000, ltvCap: null, finalLimit: 50_000_000, bindingRule: "LIMIT-PRODUCT" },
    monthlyPayment: CONTRACT_ROWS[0].payment,
    offeredAmount: 10_000_000,
  },
  overrides: [],
  contractId: 1,
};

export const LEDGER: LedgerEntry[] = [
  { id: 1, businessDate: "2026-01-15", type: "DISBURSEMENT", amount: 10_000_000, balanceAfter: 10_000_000, contractNo: "CT-2026-000001" },
];
export const TRANSACTIONS: Transaction[] = [];
export const EVENTS: ContractEvent[] = [
  { id: 1, contractId: 1, businessDate: "2026-01-15", type: "EXECUTED", amount: 10_000_000, detail: { applicationNo: "AP-2026-000001" } },
];
export const PROVISIONS: Provision[] = [];
export const NOTIFICATIONS: Notification[] = [
  { id: 1, contractId: 1, businessDate: "2026-01-15", type: "LOAN_EXECUTED", title: "대출이 실행됐어요", body: "CT-2026-000001 계약이 실행되어 결제계좌에 10,000,000원이 입금됐어요. 첫 납입일은 2026-02-16이에요.", read: false },
];

export const MY_LEARNING: MyLearning = {
  completedCount: 2,
  totalCount: 12,
  concepts: CONCEPTS.map(c => ({
    conceptId: c.id,
    title: c.title,
    bestScore: c.orderNo <= 2 ? 100 : c.orderNo === 3 ? 50 : null,
    completed: c.orderNo <= 2,
    lastAttemptedAt: c.orderNo <= 3 ? "2026-10-29T10:00:00Z" : null,
    wrongQuizIds: c.orderNo === 3 ? [2, 4] : [],
  })),
  nextConceptId: "installment-and-credit-loan",
};

export const ADMIN_APPLICATIONS: AdminApplicationPage = {
  items: [
    { id: 1, applicationNo: "AP-2026-000001", sandboxId: 1, userEmailMasked: "le***@example.com", productName: "신용대출", requestedAmount: 10_000_000, status: "EXECUTED", decision: "APPROVED", source: "AUTO", appliedOn: "2026-01-15" },
    { id: 2, applicationNo: "AP-2026-000002", sandboxId: 2, userEmailMasked: "ki***@example.com", productName: "신용대출", requestedAmount: 20_000_000, status: "CONDITIONAL", decision: "CONDITIONAL", source: "AUTO", appliedOn: "2026-01-20" },
  ],
  page: 0,
  totalPages: 1,
  totalItems: 2,
};

export const PORTFOLIO: Portfolio = {
  asOf: "2026-01-15T18:00:00Z",
  contracts: 1,
  activeContracts: 1,
  totalOutstanding: 10_000_000,
  overdueContracts: 0,
  overdueOutstanding: 0,
  overdueRatio: 0,
  byAssetClass: [{ assetClass: "NORMAL", contracts: 1, outstanding: 10_000_000, provision: 100_000 }],
  totalProvision: 100_000,
  monthly: [{ month: "2026-01", disbursed: 10_000_000, repaidPrincipal: 0, interestIncome: 0, overdueRatio: 0, provision: 100_000 }],
};

export const BATCH_EXECUTIONS: BatchExecution[] = [
  { id: 1, sandboxId: 1, jobName: "DAILY_CLOSE", businessDate: "2026-01-15", status: "SUCCESS", processedContracts: 1, errorMessage: null },
];
