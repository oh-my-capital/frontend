/**
 * 운영 콘솔(S-20~S-23) 전용 mock. index.ts의 `/admin/*` 분기가 이 파일로 넘긴다.
 * 메모리 상태(override·초안·게시·배치 실행)는 새로 고침하면 사라진다. 수치는 business-rules.md의 규칙으로 여기서 계산한
 * 값이며 골든 값이 아니다. 다른 영역(fixtures.ts)은 읽기만 한다.
 */
import type {
  AdminApplicationItem, AdminApplicationPage, AdminConcept, AdminConceptSummary, AdminOverrideRequest, AdminTerm, AdminTermSummary,
  Application, BatchExecution, ConceptDraft, ContentRevision, ContentStatus, ContentValidationItem, ContentValidationReport, Decision,
  Error as ApiErrorBody, Portfolio, QuizDraft, RepaymentMethod, ScreeningReason, ScreeningResult, TermCategory, TermDraft, User,
} from "../types";
import type { MockResult } from "./index";
import * as F from "./fixtures";

type Ok = (body: unknown, status?: number) => MockResult;
type Fail = (status: number, code: string, message: string, details?: ApiErrorBody["details"]) => MockResult;

const PAGE_SIZE = 10;
const fmt = new Intl.NumberFormat("ko-KR");
const won = (n: number) => `${fmt.format(n)}원`;
const nowIso = () => new Date().toISOString();

// ── 심사 큐 ───────────────────────────────────────────────────────────────────
interface ApplicantInput {
  id: number;
  sandboxId: number;
  emailMasked: string;
  productCode: "CREDIT_LOAN" | "AUTO_INSTALLMENT";
  requestedAmount: number;
  termMonths: number;
  method: RepaymentMethod;
  autoDebit: boolean;
  age: number;
  annualIncome: number;
  existingAnnual: number;
  creditScore: number;
  vehicleValue?: number;
  appliedOn: string;
  status: Application["status"];
}

// 샌드박스 6개의 신청 14건. 결정은 아래 screen()이 규칙대로 계산한다(business-rules §3).
const APPLICANTS: ApplicantInput[] = [
  { id: 1, sandboxId: 1, emailMasked: "le***@example.com", productCode: "CREDIT_LOAN", requestedAmount: 10_000_000, termMonths: 12, method: "EQUAL_PAYMENT", autoDebit: true, age: 31, annualIncome: 48_000_000, existingAnnual: 0, creditScore: 820, appliedOn: "2026-01-15", status: "EXECUTED" },
  { id: 2, sandboxId: 2, emailMasked: "ki***@example.com", productCode: "CREDIT_LOAN", requestedAmount: 20_000_000, termMonths: 36, method: "EQUAL_PAYMENT", autoDebit: false, age: 27, annualIncome: 30_000_000, existingAnnual: 9_000_000, creditScore: 735, appliedOn: "2026-01-20", status: "CONDITIONAL" },
  { id: 3, sandboxId: 3, emailMasked: "pa***@example.com", productCode: "AUTO_INSTALLMENT", requestedAmount: 27_000_000, termMonths: 60, method: "EQUAL_PAYMENT", autoDebit: true, age: 44, annualIncome: 72_000_000, existingAnnual: 12_000_000, creditScore: 910, vehicleValue: 30_000_000, appliedOn: "2026-01-21", status: "EXECUTED" },
  { id: 4, sandboxId: 4, emailMasked: "ch***@example.com", productCode: "CREDIT_LOAN", requestedAmount: 5_000_000, termMonths: 24, method: "EQUAL_PRINCIPAL", autoDebit: true, age: 23, annualIncome: 26_000_000, existingAnnual: 0, creditScore: 640, appliedOn: "2026-01-22", status: "APPROVED" },
  { id: 5, sandboxId: 5, emailMasked: "yo***@example.com", productCode: "CREDIT_LOAN", requestedAmount: 30_000_000, termMonths: 60, method: "BULLET", autoDebit: false, age: 52, annualIncome: 40_000_000, existingAnnual: 19_000_000, creditScore: 590, appliedOn: "2026-01-23", status: "REJECTED" },
  { id: 6, sandboxId: 2, emailMasked: "ki***@example.com", productCode: "CREDIT_LOAN", requestedAmount: 8_000_000, termMonths: 24, method: "EQUAL_PAYMENT", autoDebit: true, age: 27, annualIncome: 30_000_000, existingAnnual: 9_000_000, creditScore: 735, appliedOn: "2026-01-26", status: "CANCELLED" },
  { id: 7, sandboxId: 6, emailMasked: "ha***@example.com", productCode: "AUTO_INSTALLMENT", requestedAmount: 45_000_000, termMonths: 48, method: "EQUAL_PAYMENT", autoDebit: true, age: 38, annualIncome: 55_000_000, existingAnnual: 15_000_000, creditScore: 780, vehicleValue: 42_000_000, appliedOn: "2026-01-27", status: "CONDITIONAL" },
  { id: 8, sandboxId: 3, emailMasked: "pa***@example.com", productCode: "CREDIT_LOAN", requestedAmount: 15_000_000, termMonths: 36, method: "EQUAL_PAYMENT", autoDebit: true, age: 44, annualIncome: 72_000_000, existingAnnual: 18_500_000, creditScore: 910, appliedOn: "2026-01-28", status: "APPROVED" },
  { id: 9, sandboxId: 4, emailMasked: "ch***@example.com", productCode: "CREDIT_LOAN", requestedAmount: 40_000_000, termMonths: 60, method: "EQUAL_PAYMENT", autoDebit: false, age: 23, annualIncome: 26_000_000, existingAnnual: 2_400_000, creditScore: 640, appliedOn: "2026-01-29", status: "REJECTED" },
  { id: 10, sandboxId: 1, emailMasked: "le***@example.com", productCode: "CREDIT_LOAN", requestedAmount: 3_000_000, termMonths: 12, method: "EQUAL_PRINCIPAL", autoDebit: true, age: 31, annualIncome: 48_000_000, existingAnnual: 11_100_000, creditScore: 820, appliedOn: "2026-02-02", status: "APPROVED" },
  { id: 11, sandboxId: 5, emailMasked: "yo***@example.com", productCode: "CREDIT_LOAN", requestedAmount: 2_000_000, termMonths: 12, method: "EQUAL_PAYMENT", autoDebit: true, age: 52, annualIncome: 40_000_000, existingAnnual: 19_000_000, creditScore: 590, appliedOn: "2026-02-03", status: "REJECTED" },
  { id: 12, sandboxId: 6, emailMasked: "ha***@example.com", productCode: "CREDIT_LOAN", requestedAmount: 12_000_000, termMonths: 24, method: "EQUAL_PAYMENT", autoDebit: true, age: 38, annualIncome: 55_000_000, existingAnnual: 15_000_000, creditScore: 780, appliedOn: "2026-02-04", status: "APPROVED" },
  { id: 13, sandboxId: 2, emailMasked: "ki***@example.com", productCode: "AUTO_INSTALLMENT", requestedAmount: 18_000_000, termMonths: 36, method: "EQUAL_PAYMENT", autoDebit: true, age: 27, annualIncome: 30_000_000, existingAnnual: 9_000_000, creditScore: 735, vehicleValue: 20_000_000, appliedOn: "2026-02-05", status: "CONDITIONAL" },
  { id: 14, sandboxId: 3, emailMasked: "pa***@example.com", productCode: "CREDIT_LOAN", requestedAmount: 50_000_000, termMonths: 60, method: "EQUAL_PAYMENT", autoDebit: true, age: 44, annualIncome: 72_000_000, existingAnnual: 18_500_000, creditScore: 910, appliedOn: "2026-02-06", status: "APPROVED" },
];

const BANDS = [
  { band: "A", min: 900, credit: 0, auto: 0, multiple: 1.5 },
  { band: "B", min: 800, credit: 2, auto: 1, multiple: 1.2 },
  { band: "C", min: 700, credit: 5, auto: 2.5, multiple: 1.0 },
  { band: "D", min: 600, credit: 9, auto: 4.5, multiple: 0.6 },
];
const METHOD_LABEL: Record<RepaymentMethod, string> = { EQUAL_PAYMENT: "원리금균등", EQUAL_PRINCIPAL: "원금균등", BULLET: "만기일시" };

/** 월 여유로 역산한 최대 원금(business-rules §3.3 3항). */
function principalFromPayment(pay: number, annualRate: number, n: number, method: RepaymentMethod): number {
  const r = annualRate / 100 / 12;
  if (pay <= 0) return 0;
  if (method === "EQUAL_PAYMENT") return r === 0 ? pay * n : pay * (Math.pow(1 + r, n) - 1) / (r * Math.pow(1 + r, n));
  if (method === "EQUAL_PRINCIPAL") return pay / (1 / n + r);
  return r === 0 ? 0 : pay / r;
}

function screen(a: ApplicantInput): ScreeningResult {
  const product = F.PRODUCTS.find(p => p.code === a.productCode)!;
  const reasons: ScreeningReason[] = [];
  let order = 0;
  const push = (ruleCode: string, input: string, threshold: string, outcome: ScreeningReason["outcome"], message: string, reasonCode: string | null = null) =>
    reasons.push({ orderNo: ++order, ruleCode, input, threshold, outcome, reasonCode, message });

  const ageOk = a.age >= 19;
  push("ELIG-AGE", `만 ${a.age}세`, "19세 이상", ageOk ? "PASS" : "FAIL", ageOk ? "연령 조건을 충족한다" : "만 19세 미만이다", ageOk ? null : "AGE_UNDER_19");
  const incomeOk = a.annualIncome > 0;
  push("ELIG-INCOME", won(a.annualIncome), "0원 초과", incomeOk ? "PASS" : "FAIL", incomeOk ? "소득이 확인된다" : "소득이 없다", incomeOk ? null : "INCOME_MISSING");
  const scoreOk = a.creditScore >= 600;
  push("ELIG-SCORE", `${a.creditScore}점`, "600점 이상", scoreOk ? "PASS" : "FAIL", scoreOk ? "신용점수 조건을 충족한다" : "신용점수가 600점 미만이라 거절", scoreOk ? null : "CREDIT_SCORE_LOW");
  const productOk = a.requestedAmount >= product.minAmount && (product.maxAmount === null || a.requestedAmount <= product.maxAmount) && product.allowedTerms.includes(a.termMonths) && product.allowedMethods.includes(a.method);
  push("ELIG-PRODUCT", `${won(a.requestedAmount)} · ${a.termMonths}회 · ${METHOD_LABEL[a.method]}`, `${fmt.format(product.minAmount / 10_000)}만~${product.maxAmount ? `${fmt.format(product.maxAmount / 10_000)}만` : "차량가 90%"} · ${product.allowedTerms[0]}~${product.allowedTerms[product.allowedTerms.length - 1]}회`, productOk ? "PASS" : "FAIL", productOk ? "상품 범위 안이다" : "상품 범위를 벗어난다", productOk ? null : "PRODUCT_CONSTRAINT");

  const empty = { productCap: null, incomeCap: null, dsrCap: null, ltvCap: null, finalLimit: null, bindingRule: null };
  if (!ageOk || !incomeOk || !scoreOk || !productOk) {
    return { decision: "REJECTED", source: "AUTO", creditBand: null, rate: { base: product.baseRate, spread: 0, discount: 0, applied: product.baseRate, capped: false }, limits: empty, dsr: { existingAnnual: a.existingAnnual, newAnnual: 0, ratio: 0, limit: 50 }, monthlyPayment: null, offeredAmount: null, reasons, disclosure: F.DISCLOSURE };
  }

  const band = BANDS.find(b => a.creditScore >= b.min)!;
  const spread = a.productCode === "CREDIT_LOAN" ? band.credit : band.auto;
  const discount = a.autoDebit ? 0.2 : 0;
  const rawRate = product.baseRate + spread - discount;
  const capped = rawRate > 20;
  const applied = Math.round((capped ? 20 : rawRate) * 100) / 100;
  push("RATE", `밴드 ${band.band}`, `${product.baseRate.toFixed(2)} + ${spread.toFixed(2)} − ${discount.toFixed(2)}`, "INFO", `적용 금리 ${applied.toFixed(2)}%${capped ? "(최고금리 상한)" : ""}`);

  const productCap = a.productCode === "CREDIT_LOAN" ? product.maxAmount! : Math.floor((a.vehicleValue ?? 0) * 0.9);
  push(a.productCode === "CREDIT_LOAN" ? "LIMIT-PRODUCT" : "LIMIT-LTV", a.productCode === "CREDIT_LOAN" ? product.name : `차량가 ${won(a.vehicleValue ?? 0)} × 0.9`, won(productCap), "INFO", a.productCode === "CREDIT_LOAN" ? "상품 최대 한도" : "LTV 한도");
  const incomeCap = Math.floor(a.annualIncome * band.multiple);
  push("LIMIT-INCOME", `${fmt.format(a.annualIncome)} × ${band.multiple}`, won(incomeCap), "INFO", "소득배수 한도");
  const annualRoom = a.annualIncome * 0.5 - a.existingAnnual;
  const monthlyRoom = Math.floor(annualRoom / 12);
  const dsrCap = Math.max(0, Math.floor(principalFromPayment(monthlyRoom, applied, a.termMonths, a.method)));
  push("LIMIT-DSR", `월 여유 ${won(Math.max(0, monthlyRoom))}`, won(dsrCap), "INFO", "DSR 역산 한도");

  const candidates = [
    { code: a.productCode === "CREDIT_LOAN" ? "LIMIT-PRODUCT" : "LIMIT-LTV", value: productCap },
    { code: "LIMIT-INCOME", value: incomeCap },
    { code: "LIMIT-DSR", value: dsrCap },
  ];
  const binding = candidates.reduce((min, c) => (c.value < min.value ? c : min));
  const finalLimit = Math.floor(binding.value / 10_000) * 10_000;

  let decision: Decision;
  let offered: number | null;
  if (a.requestedAmount <= finalLimit) {
    decision = "APPROVED"; offered = a.requestedAmount;
    push("DECISION", `요청 ${won(a.requestedAmount)}`, `최종 한도 ${won(finalLimit)}`, "PASS", "요청 금액이 한도 안이라 승인");
  } else if (finalLimit >= product.minAmount) {
    decision = "CONDITIONAL"; offered = finalLimit;
    push("DECISION", `요청 ${won(a.requestedAmount)}`, `최종 한도 ${won(finalLimit)}`, "FAIL", `한도를 ${won(finalLimit)}으로 줄여 조건부 승인`, "LIMIT_REDUCED");
  } else {
    decision = "REJECTED"; offered = null;
    const dsrBottleneck = binding.code === "LIMIT-DSR";
    push("DECISION", `요청 ${won(a.requestedAmount)}`, `최종 한도 ${won(finalLimit)} < 상품 최소 ${won(product.minAmount)}`, "FAIL", dsrBottleneck ? "DSR 역산 한도가 상품 최소 금액에 못 미쳐 거절" : "최종 한도가 상품 최소 금액에 못 미쳐 거절", dsrBottleneck ? "DSR_EXCEEDED" : "LIMIT_BELOW_MIN");
  }

  const basis = offered ?? a.requestedAmount;
  const rows = F.buildSchedule(basis, a.termMonths, applied, a.appliedOn, 15, a.method);
  const newAnnual = rows.slice(0, 12).reduce((s, r) => s + r.payment, 0);
  const ratio = Math.round((a.existingAnnual + newAnnual) / a.annualIncome * 10000) / 100;
  return {
    decision,
    source: "AUTO",
    creditBand: band.band,
    rate: { base: product.baseRate, spread, discount, applied, capped },
    limits: { productCap: a.productCode === "CREDIT_LOAN" ? productCap : null, incomeCap, dsrCap, ltvCap: a.productCode === "CREDIT_LOAN" ? null : productCap, finalLimit, bindingRule: binding.code },
    dsr: { existingAnnual: a.existingAnnual, newAnnual, ratio, limit: 50 },
    monthlyPayment: rows[0].payment,
    offeredAmount: offered,
    reasons,
    disclosure: F.DISCLOSURE,
  };
}

function buildApplication(a: ApplicantInput): Application {
  const product = F.PRODUCTS.find(p => p.code === a.productCode)!;
  const screening = screen(a);
  // 실행·취소가 아니면 현재 상태는 규칙이 계산한 결정 그대로다.
  const status = a.status === "EXECUTED" || a.status === "CANCELLED" ? a.status : screening.decision;
  return {
    id: a.id,
    applicationNo: `AP-2026-${String(a.id).padStart(6, "0")}`,
    product,
    requestedAmount: a.requestedAmount,
    termMonths: a.termMonths,
    repaymentMethod: a.method,
    paymentDay: 15,
    autoDebit: a.autoDebit,
    status,
    appliedOn: a.appliedOn,
    decidedOn: a.appliedOn,
    collateral: a.vehicleValue ? { description: "차량", appraisedValue: a.vehicleValue } : null,
    screening,
    overrides: [],
    contractId: a.status === "EXECUTED" ? a.id : null,
  };
}

const applications: Application[] = APPLICANTS.map(buildApplication);
const applicantById = new Map(APPLICANTS.map(a => [a.id, a]));

function toItem(app: Application): AdminApplicationItem {
  const a = applicantById.get(app.id)!;
  return {
    id: app.id,
    applicationNo: app.applicationNo,
    sandboxId: a.sandboxId,
    userEmailMasked: a.emailMasked,
    productName: app.product.name,
    requestedAmount: app.requestedAmount,
    status: app.status,
    decision: app.screening.decision,
    source: app.screening.source,
    appliedOn: app.appliedOn,
  };
}

function listApplications(status: string | null, page: number): AdminApplicationPage {
  const filtered = applications.filter(app => !status || app.status === status).sort((x, y) => (x.appliedOn < y.appliedOn ? 1 : x.appliedOn > y.appliedOn ? -1 : y.id - x.id));
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(Math.max(0, page), totalPages - 1);
  return { items: filtered.slice(current * PAGE_SIZE, (current + 1) * PAGE_SIZE).map(toItem), page: current, totalPages, totalItems: filtered.length };
}

function applyOverride(app: Application, req: AdminOverrideRequest): Application {
  const before = app.status;
  app.status = req.decision;
  app.decidedOn = nowIso().slice(0, 10);
  app.screening = {
    ...app.screening,
    decision: req.decision,
    source: "OVERRIDE",
    offeredAmount: req.decision === "REJECTED" ? null : (req.amount ?? app.screening.offeredAmount ?? app.requestedAmount),
    // 자격 단계 거절이면 rate 자체가 없다. 운영자가 금리를 바꾸면 그 금리만 가진 구성으로 되살린다.
    rate: req.rate === undefined ? app.screening.rate
      : app.screening.rate ? { ...app.screening.rate, applied: req.rate }
      : { base: req.rate, spread: 0, discount: 0, applied: req.rate, capped: false },
  };
  app.overrides = [...app.overrides, { beforeDecision: before, afterDecision: req.decision, afterAmount: req.decision === "REJECTED" ? null : (req.amount ?? null), reason: req.reason, createdAt: nowIso() }];
  return app;
}

// ── 포트폴리오 ─────────────────────────────────────────────────────────────────
// 실행된 계약 14건의 잔액·연체일수. 분류·충당금은 business-rules §9의 적립률로 여기서 계산한다.
const CONTRACT_BOOK = [
  { outstanding: 9_211_512, overdueDays: 0 }, { outstanding: 24_300_000, overdueDays: 0 }, { outstanding: 4_600_000, overdueDays: 0 },
  { outstanding: 13_750_000, overdueDays: 0 }, { outstanding: 2_750_000, overdueDays: 0 }, { outstanding: 11_300_000, overdueDays: 0 },
  { outstanding: 38_900_000, overdueDays: 0 }, { outstanding: 7_900_000, overdueDays: 0 }, { outstanding: 5_200_000, overdueDays: 12 },
  { outstanding: 21_400_000, overdueDays: 0 }, { outstanding: 5_100_000, overdueDays: 41 }, { outstanding: 9_800_000, overdueDays: 0 },
  { outstanding: 14_000_000, overdueDays: 0 }, { outstanding: 4_900_000, overdueDays: 97 },
];
const ASSET_CLASSES = [
  { code: "NORMAL", min: 0, rate: 0.01 },
  { code: "PRECAUTIONARY", min: 30, rate: 0.10 },
  { code: "SUBSTANDARD", min: 90, rate: 0.20 },
  { code: "DOUBTFUL", min: 180, rate: 0.75 },
  { code: "ESTIMATED_LOSS", min: 365, rate: 1.00 },
];
function classify(days: number) { return [...ASSET_CLASSES].reverse().find(c => days >= c.min)!; }

function buildPortfolio(): Portfolio {
  const byClass = ASSET_CLASSES.map(c => ({ assetClass: c.code, contracts: 0, outstanding: 0, provision: 0 }));
  let overdueContracts = 0;
  let overdueOutstanding = 0;
  for (const c of CONTRACT_BOOK) {
    const cls = classify(c.overdueDays);
    const row = byClass.find(r => r.assetClass === cls.code)!;
    row.contracts += 1;
    row.outstanding += c.outstanding;
    row.provision += Math.floor(c.outstanding * cls.rate);
    if (c.overdueDays > 0) { overdueContracts += 1; overdueOutstanding += c.outstanding; }
  }
  const totalOutstanding = CONTRACT_BOOK.reduce((s, c) => s + c.outstanding, 0);
  return {
    asOf: "2026-02-06T18:00:00+09:00",
    contracts: CONTRACT_BOOK.length,
    activeContracts: CONTRACT_BOOK.length - overdueContracts,
    totalOutstanding,
    overdueContracts,
    overdueOutstanding,
    overdueRatio: Math.round(overdueOutstanding / totalOutstanding * 10000) / 100,
    byAssetClass: byClass.filter(r => r.contracts > 0),
    totalProvision: byClass.reduce((s, r) => s + r.provision, 0),
    monthly: [
      { month: "2025-03", disbursed: 18_000_000, repaidPrincipal: 0, interestIncome: 0, overdueRatio: 0, provision: 180_000 },
      { month: "2025-04", disbursed: 12_000_000, repaidPrincipal: 1_120_000, interestIncome: 118_000, overdueRatio: 0, provision: 288_800 },
      { month: "2025-05", disbursed: 30_000_000, repaidPrincipal: 2_040_000, interestIncome: 204_000, overdueRatio: 0, provision: 568_400 },
      { month: "2025-06", disbursed: 0, repaidPrincipal: 3_310_000, interestIncome: 361_000, overdueRatio: 0, provision: 535_300 },
      { month: "2025-07", disbursed: 25_000_000, repaidPrincipal: 3_280_000, interestIncome: 352_000, overdueRatio: 2.18, provision: 1_004_400 },
      { month: "2025-08", disbursed: 9_000_000, repaidPrincipal: 4_560_000, interestIncome: 492_000, overdueRatio: 2.07, provision: 1_078_000 },
      { month: "2025-09", disbursed: 0, repaidPrincipal: 4_690_000, interestIncome: 468_000, overdueRatio: 6.41, provision: 1_906_700 },
      { month: "2025-10", disbursed: 40_000_000, repaidPrincipal: 4_650_000, interestIncome: 452_000, overdueRatio: 4.83, provision: 2_315_500 },
      { month: "2025-11", disbursed: 0, repaidPrincipal: 6_120_000, interestIncome: 673_000, overdueRatio: 7.86, provision: 2_427_600 },
      { month: "2025-12", disbursed: 15_000_000, repaidPrincipal: 6_070_000, interestIncome: 640_000, overdueRatio: 7.45, provision: 2_355_400 },
      { month: "2026-01", disbursed: 37_000_000, repaidPrincipal: 6_980_000, interestIncome: 702_000, overdueRatio: 8.53, provision: 2_588_000 },
      { month: "2026-02", disbursed: 0, repaidPrincipal: 1_240_000, interestIncome: 180_000, overdueRatio: Math.round(overdueOutstanding / totalOutstanding * 10000) / 100, provision: byClass.reduce((s, r) => s + r.provision, 0) },
    ],
  };
}
const PORTFOLIO = buildPortfolio();

// ── 배치 ──────────────────────────────────────────────────────────────────────
const sandboxDates = new Map<number, string>([[1, "2026-02-06"], [2, "2026-02-05"], [3, "2026-02-06"], [4, "2026-02-04"], [5, "2026-02-06"], [6, "2026-02-03"]]);
let nextExecutionId = 1;
const executions: BatchExecution[] = [];
function record(sandboxId: number | null, jobName: string, businessDate: string, status: string, processed: number, errorMessage: string | null = null): BatchExecution {
  const row = { id: nextExecutionId++, sandboxId, jobName, businessDate, status, processedContracts: processed, errorMessage };
  executions.push(row);
  return row;
}
// 2026-01-31 월마감 → 2월 초 일마감. 샌드박스 4는 2026-02-04에 결제계좌 잔액 조회 오류로 실패했다.
for (const d of ["2026-01-29", "2026-01-30", "2026-01-31"]) for (const s of [1, 2, 3, 4, 5, 6]) record(s, "DAILY_CLOSE", d, "SUCCESS", s === 3 ? 3 : 2);
for (const s of [1, 2, 3, 4, 5, 6]) record(s, "MONTHLY_CLOSE", "2026-01-31", "SUCCESS", s === 3 ? 3 : 2);
for (const d of ["2026-02-02", "2026-02-03"]) for (const s of [1, 2, 3, 4, 5, 6]) record(s, "DAILY_CLOSE", d, "SUCCESS", s === 3 ? 3 : 2);
record(1, "DAILY_CLOSE", "2026-02-04", "SUCCESS", 2); record(2, "DAILY_CLOSE", "2026-02-04", "SUCCESS", 2); record(3, "DAILY_CLOSE", "2026-02-04", "SUCCESS", 3);
record(4, "DAILY_CLOSE", "2026-02-04", "FAILED", 0, "결제계좌 잔액 조회 중 오류가 나서 이 날짜 처리를 되돌렸다. 다시 실행하면 같은 날짜부터 이어간다.");
record(5, "DAILY_CLOSE", "2026-02-04", "SUCCESS", 2); record(6, "DAILY_CLOSE", "2026-02-03", "SKIPPED", 0, "같은 날짜가 이미 실행돼 건너뛰었다.");
for (const s of [1, 2, 3, 5]) record(s, "DAILY_CLOSE", "2026-02-05", "SUCCESS", s === 3 ? 3 : 2);
for (const s of [1, 3, 5]) record(s, "DAILY_CLOSE", "2026-02-06", "SUCCESS", s === 3 ? 3 : 2);

function nextDay(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}
function runDailyClose(untilDate: string): BatchExecution[] {
  const made: BatchExecution[] = [];
  for (const [sandboxId, current] of sandboxDates) {
    let date = current;
    let guard = 0;
    while (date < untilDate && guard++ < 62) {
      date = nextDay(date);
      const processed = sandboxId === 3 ? 3 : 2;
      made.push(record(sandboxId, "DAILY_CLOSE", date, "SUCCESS", processed));
      if (date.endsWith("-28") && date.startsWith("2026-02")) made.push(record(sandboxId, "MONTHLY_CLOSE", date, "SUCCESS", processed));
      sandboxDates.set(sandboxId, date);
    }
  }
  return made;
}

// ── 콘텐츠 운영 ───────────────────────────────────────────────────────────────
interface ConceptRecord { id: string; published: AdminConcept | null; draft: AdminConcept | null; status: ContentStatus; contentVersion: number; publishedAt: string | null; updatedAt: string }
interface TermRecord { slug: string; published: AdminTerm | null; draft: AdminTerm | null; status: ContentStatus; contentVersion: number; updatedAt: string }

function quizzesFor(conceptId: string): QuizDraft[] {
  return F.quizFor(conceptId).questions.map(q => ({
    id: q.id,
    question: q.question,
    options: q.options.map(o => ({ id: o.id, text: o.text, correct: o.id === 1, feedback: o.id === 1 ? "맞았어요." : "다시 생각해 봐요." })),
    explanation: "선택지 1이 정답인 이유를 설명하는 해설이다.",
    nextAction: "개념 본문의 정의 절을 다시 읽어요.",
  }));
}
function conceptBody(id: string): ConceptDraft {
  const summary = F.CONCEPTS.find(c => c.id === id)!;
  const detail = F.conceptDetail(summary);
  return {
    orderNo: detail.orderNo, title: detail.title, summary: detail.summary, sections: detail.sections, misconceptions: detail.misconceptions,
    checklist: detail.checklist, linkedCalculator: detail.linkedCalculator, sandboxTask: detail.sandboxTask, sources: detail.sources, quizzes: quizzesFor(id),
  };
}
const PUBLISHED_AT = "2026-10-20T09:00:00+09:00";
const concepts = new Map<string, ConceptRecord>(F.CONCEPTS.map(c => {
  const body = conceptBody(c.id);
  const published: AdminConcept = { ...body, id: c.id, status: "PUBLISHED", contentVersion: 1, hasDraft: false, publishedAt: PUBLISHED_AT, updatedAt: PUBLISHED_AT };
  return [c.id, { id: c.id, published, draft: null, status: "PUBLISHED", contentVersion: 1, publishedAt: PUBLISHED_AT, updatedAt: PUBLISHED_AT }];
}));
// 4번 "리스의 기본"은 초안이 있고(출처 URL이 비공식이라 검증에 걸린다), 12번은 아직 게시 전 초안, 2번은 v2 게시본이다.
{
  const lease = concepts.get("lease-basics")!;
  lease.draft = { ...lease.published!, summary: "운용리스·금융리스, 소유권과 잔존가치. 리스료 구성과 회계 처리 차이까지 넓힌 초안이다.", sources: [{ title: "개인 블로그 리스 정리", url: "https://blog.example.com/lease", checkedOn: "2026-10-28" }], status: "DRAFT", hasDraft: true, updatedAt: "2026-10-28T14:20:00+09:00" };
  lease.updatedAt = lease.draft.updatedAt;
  const prepay = concepts.get("prepayment-and-fee")!;
  prepay.published = null; prepay.status = "DRAFT"; prepay.contentVersion = 0; prepay.publishedAt = null;
  prepay.draft = { ...conceptBody("prepayment-and-fee"), id: "prepayment-and-fee", status: "DRAFT", contentVersion: 0, hasDraft: true, publishedAt: null, updatedAt: "2026-10-29T11:05:00+09:00" };
  prepay.updatedAt = prepay.draft.updatedAt;
  const compare = concepts.get("capital-vs-bank")!;
  compare.contentVersion = 2; compare.published = { ...compare.published!, contentVersion: 2, publishedAt: "2026-10-27T16:40:00+09:00", updatedAt: "2026-10-27T16:40:00+09:00" }; compare.publishedAt = compare.published.publishedAt; compare.updatedAt = compare.published.updatedAt;
}

const TERM_CATEGORY_MAP: Record<string, TermCategory> = { "금리·한도": "금리" };
function termBody(slug: string): TermDraft {
  const summary = F.TERMS.find(t => t.slug === slug)!;
  const detail = F.termDetail(summary);
  return {
    term: detail.term, english: detail.english, category: TERM_CATEGORY_MAP[detail.category] ?? (detail.category as TermCategory), definition: detail.definition,
    formula: detail.formula, example: detail.example, caution: detail.caution, relatedSlugs: detail.related.map(r => r.slug), conceptIds: detail.conceptIds,
    sourceUrl: detail.sourceUrl, sourceCheckedOn: detail.sourceCheckedOn,
  };
}
const terms = new Map<string, TermRecord>(F.TERMS.map(t => {
  const published: AdminTerm = { ...termBody(t.slug), slug: t.slug, status: "PUBLISHED", contentVersion: 1, hasDraft: false, updatedAt: PUBLISHED_AT };
  return [t.slug, { slug: t.slug, published, draft: null, status: "PUBLISHED", contentVersion: 1, updatedAt: PUBLISHED_AT }];
}));
// "만기일시"는 내렸고, "약정이율"은 예시를 보탠 초안이 있다.
{
  const bullet = terms.get("bullet")!;
  bullet.status = "RETIRED"; bullet.published = { ...bullet.published!, status: "RETIRED", updatedAt: "2026-10-26T10:00:00+09:00" }; bullet.updatedAt = bullet.published.updatedAt;
  const rate = terms.get("contract-rate")!;
  rate.draft = { ...rate.published!, example: "원금 10,000,000원, 약정이율 연 12.00%, 12회 원리금균등이면 월 납입액은 888,488원이다(계산 예시 1).", status: "DRAFT", hasDraft: true, updatedAt: "2026-10-29T09:30:00+09:00" };
  rate.updatedAt = rate.draft.updatedAt;
}

let nextRevisionId = 1;
const revisions: ContentRevision[] = [];
function addRevision(entityType: ContentRevision["entityType"], entityId: string, action: ContentRevision["action"], actorEmail: string, contentVersion: number | null, snapshot: Record<string, unknown>, createdAt = nowIso()) {
  revisions.unshift({ id: nextRevisionId++, entityType, entityId, action, actorEmail, contentVersion, createdAt, snapshot });
}
for (const c of F.CONCEPTS) addRevision("CONCEPT", c.id, "PUBLISH", "admin@example.com", 1, { title: c.title, orderNo: c.orderNo }, PUBLISHED_AT);
for (const t of F.TERMS) addRevision("TERM", t.slug, "PUBLISH", "admin@example.com", 1, { term: t.term, category: t.category }, PUBLISHED_AT);
addRevision("TERM", "bullet", "RETIRE", "admin@example.com", 1, { term: "만기일시" }, "2026-10-26T10:00:00+09:00");
addRevision("CONCEPT", "capital-vs-bank", "DRAFT", "admin@example.com", null, { title: "캐피탈·은행·저축은행 비교" }, "2026-10-27T15:10:00+09:00");
addRevision("CONCEPT", "capital-vs-bank", "PUBLISH", "admin@example.com", 2, { title: "캐피탈·은행·저축은행 비교" }, "2026-10-27T16:40:00+09:00");
addRevision("CONCEPT", "lease-basics", "DRAFT", "admin@example.com", null, { title: "리스의 기본" }, "2026-10-28T14:20:00+09:00");
addRevision("TERM", "contract-rate", "DRAFT", "admin@example.com", null, { term: "약정이율" }, "2026-10-29T09:30:00+09:00");
addRevision("CONCEPT", "prepayment-and-fee", "DRAFT", "admin@example.com", null, { title: "중도상환과 수수료" }, "2026-10-29T11:05:00+09:00");

const OFFICIAL_HOSTS = [".go.kr", ".or.kr", "fss.or.kr", "law.go.kr", "bok.or.kr", "kftc.or.kr", "crefia.or.kr"];
const isOfficialUrl = (url: string) => { try { const host = new URL(url).hostname; return OFFICIAL_HOSTS.some(h => host === h.replace(/^\./, "") || host.endsWith(h)); } catch { return false; } };
const isDate = (s: string | undefined | null) => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);

/** 개념 본문 검증(FR-25: 출처·필수 항목·정답 수). */
function validateConcept(id: string, body: ConceptDraft): ContentValidationItem[] {
  const problems: ContentValidationItem[] = [];
  const p = (field: string | null, message: string, entityType: ContentValidationItem["entityType"] = "CONCEPT", entityId = id) => problems.push({ entityType, entityId, field, message });
  if (!body.title?.trim()) p("title", "제목이 비어 있다.");
  if (!body.summary?.trim()) p("summary", "요약이 비어 있다.");
  if (!Number.isInteger(body.orderNo) || body.orderNo < 1) p("orderNo", "순서는 1 이상의 정수여야 한다.");
  if (!body.sections?.length) p("sections", "본문 절이 1개 이상 필요하다.");
  body.sections?.forEach((s, i) => { if (!s.heading?.trim() || !s.body?.trim()) p(`sections[${i}]`, `${i + 1}번째 절의 제목 또는 본문이 비어 있다.`); });
  if (!body.sources?.length) p("sources", "출처가 1개 이상 필요하다.");
  body.sources?.forEach((s, i) => {
    if (!s.title?.trim()) p(`sources[${i}].title`, `${i + 1}번째 출처의 제목이 비어 있다.`);
    if (!isOfficialUrl(s.url)) p(`sources[${i}].url`, `${i + 1}번째 출처 URL이 공식 기관 주소(go.kr·or.kr 등)가 아니다.`);
    if (!isDate(s.checkedOn)) p(`sources[${i}].checkedOn`, `${i + 1}번째 출처의 확인일이 YYYY-MM-DD 형식이 아니다.`);
  });
  if (!body.quizzes?.length) p("quizzes", "확인 문제가 1개 이상 필요하다.");
  body.quizzes?.forEach((q, i) => {
    const qid = q.id ? String(q.id) : `new-${i + 1}`;
    if (!q.question?.trim()) p("question", `${i + 1}번째 문항의 질문이 비어 있다.`, "QUIZ", `${id}#${qid}`);
    if (q.options?.length !== 4) p("options", `${i + 1}번째 문항의 선택지는 정확히 4개여야 한다.`, "QUIZ", `${id}#${qid}`);
    const correct = q.options?.filter(o => o.correct).length ?? 0;
    if (correct !== 1) p("options", `${i + 1}번째 문항의 정답은 정확히 1개여야 한다(지금 ${correct}개).`, "QUIZ", `${id}#${qid}`);
    q.options?.forEach((o, j) => { if (!o.text?.trim()) p(`options[${j}].text`, `${i + 1}번째 문항 ${j + 1}번 선택지가 비어 있다.`, "QUIZ", `${id}#${qid}`); });
    if (!q.explanation?.trim()) p("explanation", `${i + 1}번째 문항의 해설이 비어 있다.`, "QUIZ", `${id}#${qid}`);
  });
  return problems;
}
const TERM_CATEGORIES: TermCategory[] = ["업무", "금리", "상환", "심사", "연체", "건전성", "리스"];
function validateTerm(slug: string, body: TermDraft): ContentValidationItem[] {
  const problems: ContentValidationItem[] = [];
  const p = (field: string | null, message: string) => problems.push({ entityType: "TERM", entityId: slug, field, message });
  if (!body.term?.trim()) p("term", "용어가 비어 있다.");
  if (!TERM_CATEGORIES.includes(body.category)) p("category", `분류는 ${TERM_CATEGORIES.join("·")} 중 하나여야 한다.`);
  if (!body.definition?.trim()) p("definition", "정의가 비어 있다.");
  if (!isOfficialUrl(body.sourceUrl)) p("sourceUrl", "출처 URL이 공식 기관 주소(go.kr·or.kr 등)가 아니다.");
  if (!isDate(body.sourceCheckedOn)) p("sourceCheckedOn", "출처 확인일이 YYYY-MM-DD 형식이 아니다.");
  body.relatedSlugs?.forEach(s => { if (!terms.has(s)) p("relatedSlugs", `관련 용어 "${s}"가 사전에 없다.`); });
  body.conceptIds?.forEach(c => { if (!concepts.has(c)) p("conceptIds", `개념 "${c}"가 목차에 없다.`); });
  return problems;
}
/** 트리 전체(초안이 있으면 초안, 없으면 게시본) 검증. */
function validateTree(): ContentValidationReport {
  const problems: ContentValidationItem[] = [];
  let quizCount = 0;
  for (const rec of concepts.values()) {
    const body = rec.draft ?? rec.published;
    if (!body || rec.status === "RETIRED") continue;
    quizCount += body.quizzes.length;
    problems.push(...validateConcept(rec.id, body));
  }
  for (const rec of terms.values()) {
    const body = rec.draft ?? rec.published;
    if (!body || rec.status === "RETIRED") continue;
    problems.push(...validateTerm(rec.slug, body));
  }
  return { valid: problems.length === 0, checkedAt: nowIso(), conceptCount: concepts.size, quizCount, termCount: terms.size, problems };
}

const conceptSummary = (r: ConceptRecord): AdminConceptSummary => {
  const body = r.draft ?? r.published!;
  return { id: r.id, orderNo: body.orderNo, title: body.title, status: r.status, contentVersion: r.contentVersion, hasDraft: !!r.draft, quizCount: body.quizzes.length, publishedAt: r.publishedAt, updatedAt: r.updatedAt };
};
const conceptView = (r: ConceptRecord): AdminConcept => (r.draft ? { ...r.draft, status: r.status, contentVersion: r.contentVersion, hasDraft: true, publishedAt: r.publishedAt, updatedAt: r.updatedAt } : { ...r.published!, status: r.status, contentVersion: r.contentVersion, hasDraft: false, publishedAt: r.publishedAt, updatedAt: r.updatedAt });
const termSummary = (r: TermRecord): AdminTermSummary => {
  const body = r.draft ?? r.published!;
  return { slug: r.slug, term: body.term, category: body.category, status: r.status, contentVersion: r.contentVersion, hasDraft: !!r.draft, updatedAt: r.updatedAt };
};
const termView = (r: TermRecord): AdminTerm => (r.draft ? { ...r.draft, status: r.status, contentVersion: r.contentVersion, hasDraft: true, updatedAt: r.updatedAt } : { ...r.published!, status: r.status, contentVersion: r.contentVersion, hasDraft: false, updatedAt: r.updatedAt });

/** 422 ContentValidationError. problems 와 함께 같은 내용을 details(field = "TYPE:id.field") 로도 넣는다(공통 ApiError 가 details 만 보존). */
function invalid(fail: Fail, problems: ContentValidationItem[], message: string): MockResult {
  const details = problems.map(p => ({ field: `${p.entityType}:${p.entityId}${p.field ? `.${p.field}` : ""}`, message: p.message }));
  const base = fail(422, "CONTENT_INVALID", message, details);
  return { ...base, body: { ...(base.body as ApiErrorBody), problems } };
}

/** `/admin/*` 요청을 처리한다. 모르는 경로면 null. 권한 확인(401·403)은 index.ts가 먼저 한다. */
export function mockAdmin(method: string, pathname: string, params: URLSearchParams, body: unknown, me: User, ok: Ok, fail: Fail): MockResult | null {
  const key = `${method} ${pathname}`;
  let m: RegExpMatchArray | null;

  // ── 심사 큐
  if (key === "GET /admin/applications") return ok(listApplications(params.get("status"), Number(params.get("page") ?? 0)));
  if ((m = pathname.match(/^\/admin\/applications\/(\d+)$/)) && method === "GET") {
    const app = applications.find(a => a.id === Number(m![1]));
    return app ? ok(app) : fail(404, "NOT_FOUND", "그 신청을 찾지 못했어요. 목록을 새로 고쳐요.");
  }
  if ((m = pathname.match(/^\/admin\/applications\/(\d+)\/override$/)) && method === "POST") {
    const app = applications.find(a => a.id === Number(m![1]));
    if (!app) return fail(404, "NOT_FOUND", "그 신청을 찾지 못했어요. 목록을 새로 고쳐요.");
    const req = body as AdminOverrideRequest;
    if (!["APPROVED", "CONDITIONAL", "REJECTED"].includes(req?.decision)) return fail(400, "VALIDATION", "결정은 승인·조건부 승인·거절 중 하나여야 해요.", [{ field: "decision", message: "열거형" }]);
    if (!req.reason || req.reason.trim().length < 10) return fail(400, "VALIDATION", "변경 사유를 10자 이상 적어요.", [{ field: "reason", message: "10자 이상" }]);
    if (app.status === "EXECUTED") return fail(409, "CONFLICT", "이미 실행된 신청이라 결정을 바꿀 수 없어요. 계약 쪽에서 처리해요.");
    if (app.status === "CANCELLED") return fail(409, "CONFLICT", "취소된 신청은 결정을 바꿀 수 없어요.");
    if (req.decision === "CONDITIONAL" && req.amount !== undefined && req.amount > app.requestedAmount) return fail(400, "VALIDATION", "조건부 승인 금액은 요청 금액보다 클 수 없어요.", [{ field: "amount", message: "요청 금액 이하" }]);
    return ok(applyOverride(app, req));
  }

  // ── 포트폴리오
  if (key === "GET /admin/portfolio") return ok(PORTFOLIO);

  // ── 배치
  if (key === "POST /admin/batch/daily-close") {
    const { untilDate } = (body ?? {}) as { untilDate?: string };
    if (!isDate(untilDate)) return fail(400, "VALIDATION", "실행할 날짜를 YYYY-MM-DD 형식으로 적어요.", [{ field: "untilDate", message: "날짜 형식" }]);
    const latest = [...sandboxDates.values()].sort()[sandboxDates.size - 1];
    if (untilDate! > "2026-12-31") return fail(400, "VALIDATION", "2026년 안의 날짜만 실행할 수 있어요.", [{ field: "untilDate", message: "범위" }]);
    if (untilDate! <= latest && [...sandboxDates.values()].every(d => d >= untilDate!)) return ok([]);
    return ok(runDailyClose(untilDate!));
  }
  if (key === "GET /admin/batch/executions") {
    const sandboxId = params.get("sandboxId");
    const rows = sandboxId ? executions.filter(e => e.sandboxId === Number(sandboxId)) : executions;
    return ok([...rows].sort((a, b) => b.id - a.id));
  }

  // ── 콘텐츠: 개념
  if (key === "GET /admin/content/concepts") return ok([...concepts.values()].map(conceptSummary).sort((a, b) => a.orderNo - b.orderNo));
  if ((m = pathname.match(/^\/admin\/content\/concepts\/([^/]+)(?:\/(publish|retire))?$/))) {
    const id = decodeURIComponent(m[1]);
    const rec = concepts.get(id);
    if (!rec) return fail(404, "NOT_FOUND", "그 개념을 찾지 못했어요. 목록에서 다시 골라요.");
    if (!m[2] && method === "GET") return ok(conceptView(rec));
    if (!m[2] && method === "PUT") {
      const draft = body as ConceptDraft;
      const problems = validateConcept(id, draft).filter(x => x.message.includes("비어 있다") || x.message.includes("정답") || x.message.includes("4개") || x.message.includes("정수"));
      if (problems.length) return invalid(fail, problems, "필수 항목이 비었거나 정답 수가 맞지 않아 초안을 저장하지 못했어요.");
      const updatedAt = nowIso();
      rec.draft = { ...draft, id, status: rec.status, contentVersion: rec.contentVersion, hasDraft: true, publishedAt: rec.publishedAt, updatedAt };
      rec.updatedAt = updatedAt;
      if (rec.status !== "PUBLISHED") rec.status = "DRAFT";
      addRevision("CONCEPT", id, "DRAFT", me.email, null, { title: draft.title, orderNo: draft.orderNo });
      return ok(conceptView(rec));
    }
    if (m[2] === "publish" && method === "POST") {
      if (!rec.draft) return fail(409, "CONFLICT", "게시할 초안이 없어요. 먼저 초안을 저장해요.");
      const report = validateTree();
      if (!report.valid) return invalid(fail, report.problems, `트리 전체 재검증에서 문제 ${report.problems.length}건이 나와 게시하지 못했어요.`);
      const at = nowIso();
      rec.contentVersion += 1;
      rec.published = { ...rec.draft, status: "PUBLISHED", contentVersion: rec.contentVersion, hasDraft: false, publishedAt: at, updatedAt: at };
      rec.draft = null; rec.status = "PUBLISHED"; rec.publishedAt = at; rec.updatedAt = at;
      addRevision("CONCEPT", id, "PUBLISH", me.email, rec.contentVersion, { title: rec.published.title, orderNo: rec.published.orderNo });
      rec.published.quizzes.forEach(q => addRevision("QUIZ", `${id}#${q.id ?? "new"}`, "PUBLISH", me.email, rec.contentVersion, { question: q.question }));
      return ok(conceptView(rec));
    }
    if (m[2] === "retire" && method === "POST") {
      const at = nowIso();
      rec.status = "RETIRED"; rec.updatedAt = at;
      if (rec.published) rec.published = { ...rec.published, status: "RETIRED", updatedAt: at };
      addRevision("CONCEPT", id, "RETIRE", me.email, rec.contentVersion, { title: (rec.draft ?? rec.published)?.title });
      return ok(conceptView(rec));
    }
  }

  // ── 콘텐츠: 용어
  if (key === "GET /admin/content/terms") return ok([...terms.values()].map(termSummary).sort((a, b) => a.term.localeCompare(b.term, "ko")));
  if ((m = pathname.match(/^\/admin\/content\/terms\/([^/]+)(?:\/(publish|retire))?$/))) {
    const slug = decodeURIComponent(m[1]);
    const rec = terms.get(slug);
    if (!rec) return fail(404, "NOT_FOUND", "그 용어를 찾지 못했어요. 목록에서 다시 골라요.");
    if (!m[2] && method === "GET") return ok(termView(rec));
    if (!m[2] && method === "PUT") {
      const draft = body as TermDraft;
      const problems = validateTerm(slug, draft).filter(x => x.message.includes("비어 있다") || x.message.includes("분류"));
      if (problems.length) return invalid(fail, problems, "필수 항목이 비어 초안을 저장하지 못했어요.");
      const updatedAt = nowIso();
      rec.draft = { ...draft, slug, status: rec.status, contentVersion: rec.contentVersion, hasDraft: true, updatedAt };
      rec.updatedAt = updatedAt;
      if (rec.status !== "PUBLISHED") rec.status = "DRAFT";
      addRevision("TERM", slug, "DRAFT", me.email, null, { term: draft.term, category: draft.category });
      return ok(termView(rec));
    }
    if (m[2] === "publish" && method === "POST") {
      if (!rec.draft) return fail(409, "CONFLICT", "게시할 초안이 없어요. 먼저 초안을 저장해요.");
      const report = validateTree();
      if (!report.valid) return invalid(fail, report.problems, `트리 전체 재검증에서 문제 ${report.problems.length}건이 나와 게시하지 못했어요.`);
      const at = nowIso();
      rec.contentVersion += 1;
      rec.published = { ...rec.draft, status: "PUBLISHED", contentVersion: rec.contentVersion, hasDraft: false, updatedAt: at };
      rec.draft = null; rec.status = "PUBLISHED"; rec.updatedAt = at;
      addRevision("TERM", slug, "PUBLISH", me.email, rec.contentVersion, { term: rec.published.term, category: rec.published.category });
      return ok(termView(rec));
    }
    if (m[2] === "retire" && method === "POST") {
      const at = nowIso();
      rec.status = "RETIRED"; rec.updatedAt = at;
      if (rec.published) rec.published = { ...rec.published, status: "RETIRED", updatedAt: at };
      addRevision("TERM", slug, "RETIRE", me.email, rec.contentVersion, { term: (rec.draft ?? rec.published)?.term });
      return ok(termView(rec));
    }
  }

  // ── 콘텐츠: 검증·이력
  if (key === "POST /admin/content/validate") return ok(validateTree());
  if (key === "GET /admin/content/revisions") {
    const entityType = params.get("entityType");
    const entityId = params.get("entityId");
    const limit = Math.min(200, Number(params.get("limit") ?? 50) || 50);
    return ok(revisions.filter(r => (!entityType || r.entityType === entityType) && (!entityId || r.entityId === entityId)).slice(0, limit));
  }
  return null;
}
