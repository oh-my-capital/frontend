/**
 * WP7 영역(계산기 3종·모의 여신 샌드박스)의 mock 엔진. index.ts 가 calculators·sandbox 경로를 이 파일의 mockLab 으로 넘긴다.
 * - 숫자는 전부 docs/domain/business-rules.md 의 규칙으로 계산하며, 같은 입력이면 calculation-examples.md 의 골든 값
 *   (예시 1·2·3·5·5-2·6·7·8·11)이 그대로 나온다. 화면에 쓰는 고정 숫자는 없다.
 * - 샌드박스는 사용자마다 메모리에 상태(영업일·결제계좌·프로필·신청·계약·회차·연체·알림)를 들고, 시간 진행은
 *   docs/architecture/batch-and-clock.md 의 일마감 순서를 날짜마다 그대로 따라간다. 새로 고침하면 시드 상태로 돌아간다.
 * - 골든 값과 문서가 어긋나는 한 곳(기한이익상실 뒤 연체 대상금액)은 골든 값(예시 4-2: 잔액만)을 따른다.
 */
import type {
  Application, ApplicationRequest, BatchExecution, ClockAdvanceRequest, ClockAdvanceResult, Contract, ContractEvent, ContractSummary,
  Decision, Delinquency, Error as ApiErrorBody, LedgerEntry, Notification, PrepaymentCalcRequest, PrepaymentQuote, Product, Profile,
  Provision, RepaymentMethod, Sandbox, ScheduleRequest, ScheduleResponse, ScheduleRow, ScreeningReason, ScreeningRequest, ScreeningResult,
  Transaction, TransactionAllocation, User,
} from "../types";
import type { MockResult } from "./index";
import { DISCLOSURE, PRODUCTS } from "./fixtures";

type Ok = (body: unknown, status?: number) => MockResult;
type Fail = (status: number, code: string, message: string, details?: ApiErrorBody["details"]) => MockResult;

const fmt = new Intl.NumberFormat("ko-KR");
const won = (n: number) => `${fmt.format(n)}원`;
export const METHOD_LABEL: Record<RepaymentMethod, string> = { EQUAL_PAYMENT: "원리금균등", EQUAL_PRINCIPAL: "원금균등", BULLET: "만기일시" };

// ── 날짜(UTC 기준 YYYY-MM-DD) ────────────────────────────────────────────────
const pad = (n: number) => String(n).padStart(2, "0");
const toDate = (s: string) => new Date(`${s}T00:00:00Z`);
const iso = (d: Date) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
export function addDays(s: string, n: number): string { const d = toDate(s); d.setUTCDate(d.getUTCDate() + n); return iso(d); }
/** b − a (일). */
export function diffDays(a: string, b: string): number { return Math.round((toDate(b).getTime() - toDate(a).getTime()) / 86_400_000); }
function addMonths(start: string, months: number, day: number): string {
  const [y, m] = start.split("-").map(Number);
  return iso(new Date(Date.UTC(y, m - 1 + months, day)));
}
/** 토·일이면 다음 월요일(business-rules §5, 예시 10). */
function nextBusinessDay(date: string): string {
  const wd = toDate(date).getUTCDay();
  return wd === 6 ? addDays(date, 2) : wd === 0 ? addDays(date, 1) : date;
}
function isMonthEnd(date: string): boolean { return toDate(addDays(date, 1)).getUTCMonth() !== toDate(date).getUTCMonth(); }
function monthOf(date: string): string { return date.slice(0, 7); }
function isValidDate(s: unknown): s is string { return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(toDate(s).getTime()); }
function ageOn(birthDate: string, asOf: string): number {
  const b = toDate(birthDate); const a = toDate(asOf);
  let age = a.getUTCFullYear() - b.getUTCFullYear();
  if (a.getUTCMonth() < b.getUTCMonth() || (a.getUTCMonth() === b.getUTCMonth() && a.getUTCDate() < b.getUTCDate())) age -= 1;
  return age;
}

// ── 반올림(business-rules §1) ────────────────────────────────────────────────
/** 원 미만 절사. 부동소수점 오차(0.9999999…)로 정수가 깎이지 않게 1e-7 을 더한다(참값의 소수부는 1/438000 단위라 안전). */
const floorWon = (x: number) => Math.floor(x + 1e-7);
const halfUp = (x: number) => Math.floor(x + 0.5);
const floorManWon = (x: number) => Math.floor(x / 10_000) * 10_000;

// ── 스케줄(FR-13, 예시 1·2·3·10) ──────────────────────────────────────────────
function monthlyPaymentOf(principal: number, r: number, n: number): number {
  return r === 0 ? halfUp(principal / n) : halfUp(principal * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1));
}
/** 회차표. 이자 = 월 이율 × 직전 잔액 절사, 마지막 회차 원금 = 남은 잔액 전부. */
export function schedule(principal: number, termMonths: number, annualRate: number, startDate: string, paymentDay: number, method: RepaymentMethod, firstInstallmentNo = 1): ScheduleRow[] {
  const r = annualRate / 100 / 12;
  const rows: ScheduleRow[] = [];
  let balance = principal;
  const monthly = monthlyPaymentOf(principal, r, termMonths);
  const equalPrincipal = Math.floor(principal / termMonths);
  for (let k = 1; k <= termMonths; k++) {
    const interest = floorWon(balance * r);
    let principalPart: number;
    if (k === termMonths) principalPart = balance;
    else if (method === "EQUAL_PAYMENT") principalPart = monthly - interest;
    else if (method === "EQUAL_PRINCIPAL") principalPart = equalPrincipal;
    else principalPart = 0;
    balance -= principalPart;
    const dueDate = addMonths(startDate, k, paymentDay);
    rows.push({ installmentNo: firstInstallmentNo + k - 1, dueDate, adjustedDueDate: nextBusinessDay(dueDate), principal: principalPart, interest, payment: principalPart + interest, balanceAfter: balance, status: null, paidOn: null });
  }
  return rows;
}

export function scheduleResponse(req: ScheduleRequest): ScheduleResponse {
  const methods = req.methods?.length ? req.methods : (["EQUAL_PAYMENT", "EQUAL_PRINCIPAL", "BULLET"] as RepaymentMethod[]);
  return {
    results: methods.map(method => {
      const rows = schedule(req.principal, req.termMonths, req.annualRate, req.startDate, req.paymentDay, method);
      const totalInterest = rows.reduce((s, row) => s + row.interest, 0);
      return { method, monthlyPayment: method === "EQUAL_PAYMENT" ? rows[0].payment : null, firstPayment: rows[0].payment, lastPayment: rows[rows.length - 1].payment, totalInterest, totalPayment: req.principal + totalInterest, rows };
    }),
    disclosure: DISCLOSURE,
  };
}

// ── 심사(business-rules §3, 예시 6·7·8) ───────────────────────────────────────
const BANDS = [
  { band: "A", min: 900, spread: { CREDIT_LOAN: 0, AUTO_INSTALLMENT: 0 }, multiple: 1.5 },
  { band: "B", min: 800, spread: { CREDIT_LOAN: 2, AUTO_INSTALLMENT: 1 }, multiple: 1.2 },
  { band: "C", min: 700, spread: { CREDIT_LOAN: 5, AUTO_INSTALLMENT: 2.5 }, multiple: 1.0 },
  { band: "D", min: 600, spread: { CREDIT_LOAN: 9, AUTO_INSTALLMENT: 4.5 }, multiple: 0.6 },
] as const;
const DSR_LIMIT = 50;
const LTV_RATE = 0.9;
const AUTO_DEBIT_DISCOUNT = 0.2;
const MAX_RATE = 20;

/** 월 여유로 역산한 최대 원금(§3.3 3항). */
function principalFromPayment(pay: number, annualRate: number, n: number, method: RepaymentMethod): number {
  const r = annualRate / 100 / 12;
  if (pay <= 0) return 0;
  if (method === "EQUAL_PAYMENT") return r === 0 ? pay * n : pay * (Math.pow(1 + r, n) - 1) / (r * Math.pow(1 + r, n));
  if (method === "EQUAL_PRINCIPAL") return pay / (1 / n + r);
  return r === 0 ? 0 : pay / r;
}

export function screen(req: ScreeningRequest): ScreeningResult {
  const product = PRODUCTS.find(p => p.code === req.productCode) ?? PRODUCTS[0];
  const isAuto = product.code === "AUTO_INSTALLMENT";
  const reasons: ScreeningReason[] = [];
  const push = (ruleCode: string, input: string, threshold: string, outcome: ScreeningReason["outcome"], message: string, reasonCode: string | null = null) =>
    reasons.push({ orderNo: reasons.length + 1, ruleCode, input, threshold, outcome, reasonCode, message });

  const age = ageOn(req.birthDate, req.asOf);
  const ageOk = age >= 19;
  push("ELIG-AGE", `만 ${age}세`, "만 19세 이상", ageOk ? "PASS" : "FAIL", ageOk ? "연령 조건을 충족한다" : "만 19세 미만이라 신청할 수 없다", ageOk ? null : "AGE_UNDER_19");
  const incomeOk = req.annualIncome > 0;
  push("ELIG-INCOME", won(req.annualIncome), "0원 초과", incomeOk ? "PASS" : "FAIL", incomeOk ? "소득이 확인된다" : "연소득이 없어 상환 능력을 평가할 수 없다", incomeOk ? null : "INCOME_MISSING");
  const scoreOk = req.creditScore >= 600;
  push("ELIG-SCORE", `${req.creditScore}점`, "600점 이상", scoreOk ? "PASS" : "FAIL", scoreOk ? "신용점수 조건을 충족한다" : "신용점수가 600점 미만이라 거절", scoreOk ? null : "CREDIT_SCORE_LOW");
  const vehicle = req.vehicleValue ?? 0;
  const productMax = isAuto ? floorWon(vehicle * LTV_RATE) : product.maxAmount ?? Number.MAX_SAFE_INTEGER;
  const productOk = req.requestedAmount >= product.minAmount && req.requestedAmount <= productMax && product.allowedTerms.includes(req.termMonths) && product.allowedMethods.includes(req.repaymentMethod) && (!isAuto || vehicle > 0);
  push("ELIG-PRODUCT", `${won(req.requestedAmount)} · ${req.termMonths}회 · ${METHOD_LABEL[req.repaymentMethod]}`,
    isAuto ? `300만~차량가 90%(${won(productMax)}) · 12~72회 · 원리금균등` : `100만~5,000만 · 12·24·36·48·60회`,
    productOk ? "PASS" : "FAIL", productOk ? "상품 범위 안이다" : (isAuto && vehicle <= 0 ? "차량가가 없어 한도를 정할 수 없다" : "금액·기간·방식이 상품 범위를 벗어난다"), productOk ? null : "PRODUCT_CONSTRAINT");

  const emptyLimits = { productCap: null, incomeCap: null, dsrCap: null, ltvCap: null, finalLimit: null, bindingRule: null };
  if (!ageOk || !incomeOk || !scoreOk || !productOk) {
    push("DECISION", "자격 규칙 미충족", "자격 4개 규칙 모두 통과", "FAIL", "자격 단계에서 하나 이상 미충족이라 거절. 금리·한도는 계산하지 않는다");
    return { decision: "REJECTED", source: "AUTO", creditBand: null, rate: { base: product.baseRate, spread: 0, discount: 0, applied: product.baseRate, capped: false }, limits: emptyLimits, dsr: { existingAnnual: req.existingAnnualDebtService, newAnnual: 0, ratio: 0, limit: DSR_LIMIT }, monthlyPayment: null, offeredAmount: null, reasons, disclosure: DISCLOSURE };
  }

  const band = BANDS.find(b => req.creditScore >= b.min)!;
  const spread = band.spread[product.code as "CREDIT_LOAN" | "AUTO_INSTALLMENT"];
  const discount = req.autoDebit ? AUTO_DEBIT_DISCOUNT : 0;
  const rawRate = Math.round((product.baseRate + spread - discount) * 100) / 100;
  const capped = rawRate > MAX_RATE;
  const applied = capped ? MAX_RATE : rawRate;
  push("RATE", `밴드 ${band.band}(${req.creditScore}점)${req.autoDebit ? " · 자동이체" : ""}`, `${product.baseRate.toFixed(2)} + ${spread.toFixed(2)} − ${discount.toFixed(2)}`, "INFO", `적용 금리 ${applied.toFixed(2)}%${capped ? " (최고금리 20.00%로 제한)" : ""}`);

  if (isAuto) push("LIMIT-LTV", `차량가 ${won(vehicle)} × 0.9`, won(productMax), "INFO", "담보(LTV 90%) 한도");
  else push("LIMIT-PRODUCT", product.name, won(productMax), "INFO", "상품 최대 한도");
  const incomeCap = floorWon(req.annualIncome * band.multiple);
  push("LIMIT-INCOME", `${fmt.format(req.annualIncome)} × ${band.multiple}`, won(incomeCap), "INFO", `소득배수 한도(밴드 ${band.band})`);
  const annualRoom = req.annualIncome * (DSR_LIMIT / 100) - req.existingAnnualDebtService;
  const monthlyRoom = floorWon(annualRoom / 12);
  const dsrCap = Math.max(0, floorWon(principalFromPayment(monthlyRoom, applied, req.termMonths, req.repaymentMethod)));
  push("LIMIT-DSR", `월 여유 ${won(Math.max(0, monthlyRoom))}`, won(dsrCap), "INFO", `DSR ${DSR_LIMIT}% 안에서 월 납입이 가능한 최대 원금`);

  const candidates = [
    { code: isAuto ? "LIMIT-LTV" : "LIMIT-PRODUCT", value: productMax },
    { code: "LIMIT-INCOME", value: incomeCap },
    { code: "LIMIT-DSR", value: dsrCap },
  ];
  const binding = candidates.reduce((min, c) => (c.value < min.value ? c : min));
  const finalLimit = floorManWon(binding.value);
  const bindingReason = reasons.find(r => r.ruleCode === binding.code);
  if (bindingReason) bindingReason.message += " — 최종 한도를 정한 규칙(병목)";

  let decision: Decision;
  let offered: number | null;
  if (req.requestedAmount <= finalLimit) {
    decision = "APPROVED"; offered = req.requestedAmount;
    push("DECISION", `요청 ${won(req.requestedAmount)}`, `최종 한도 ${won(finalLimit)}`, "PASS", "요청 금액이 최종 한도 안이라 승인");
  } else if (finalLimit >= product.minAmount) {
    decision = "CONDITIONAL"; offered = finalLimit;
    push("DECISION", `요청 ${won(req.requestedAmount)}`, `최종 한도 ${won(finalLimit)}`, "FAIL", `요청이 한도를 넘어 ${won(finalLimit)}으로 줄여 조건부 승인`, "LIMIT_REDUCED");
  } else {
    decision = "REJECTED"; offered = null;
    const dsrBottleneck = binding.code === "LIMIT-DSR";
    push("DECISION", `요청 ${won(req.requestedAmount)}`, `최종 한도 ${won(finalLimit)} < 상품 최소 ${won(product.minAmount)}`, "FAIL", dsrBottleneck ? "DSR 역산 한도가 상품 최소 금액에 못 미쳐 거절" : "최종 한도가 상품 최소 금액에 못 미쳐 거절", dsrBottleneck ? "DSR_EXCEEDED" : "LIMIT_BELOW_MIN");
  }

  // DSR 은 신청 조건(요청 금액) 기준 첫 12회 납입액 합으로 계산한다(§3.3).
  const rows = schedule(req.requestedAmount, req.termMonths, applied, req.asOf, 15, req.repaymentMethod);
  const newAnnual = rows.slice(0, 12).reduce((s, r) => s + r.payment, 0);
  const ratio = Math.round((req.existingAnnualDebtService + newAnnual) / req.annualIncome * 10_000) / 100;
  return {
    decision, source: "AUTO", creditBand: band.band,
    rate: { base: product.baseRate, spread, discount, applied, capped },
    limits: { productCap: isAuto ? null : productMax, incomeCap, dsrCap, ltvCap: isAuto ? productMax : null, finalLimit, bindingRule: binding.code },
    dsr: { existingAnnual: req.existingAnnualDebtService, newAnnual, ratio, limit: DSR_LIMIT },
    monthlyPayment: rows[0].payment, offeredAmount: offered, reasons, disclosure: DISCLOSURE,
  };
}

// ── 중도상환 견적(business-rules §6, 예시 5·5-2) ──────────────────────────────
const FEE_WAIVER_DAYS = 3 * 365;

/** 남은 회차를 새 잔액으로 재산정한다(ADR-009). 날짜는 그대로, 이자는 다음 약정일 기준 월 이율 × 잔액. */
function reamortize(balance: number, remaining: ScheduleRow[], annualRate: number, method: RepaymentMethod): { rows: ScheduleRow[]; monthly: number | null } {
  const n = remaining.length;
  if (n === 0) return { rows: [], monthly: null };
  const r = annualRate / 100 / 12;
  const monthly = monthlyPaymentOf(balance, r, n);
  const equalPrincipal = Math.floor(balance / n);
  let bal = balance;
  const rows = remaining.map((row, i) => {
    const interest = floorWon(bal * r);
    const principal = i === n - 1 ? bal : method === "EQUAL_PAYMENT" ? monthly - interest : method === "EQUAL_PRINCIPAL" ? equalPrincipal : 0;
    bal -= principal;
    return { ...row, principal, interest, payment: principal + interest, balanceAfter: bal, status: "SCHEDULED", paidOn: null };
  });
  return { rows, monthly: method === "EQUAL_PAYMENT" ? monthly : null };
}

interface QuoteInput {
  outstanding: number; annualRate: number; feeRate: number; startDate: string; maturityDate: string; lastDueDate: string; asOf: string;
  remaining: ScheduleRow[]; method: RepaymentMethod; principalAmount: number | null | undefined; overdueInterest: number;
}
function quote(input: QuoteInput): PrepaymentQuote {
  const { outstanding, asOf } = input;
  const principalAmount = Math.min(outstanding, input.principalAmount ?? outstanding);
  const isFull = principalAmount >= outstanding;
  const accruedDays = Math.max(0, diffDays(input.lastDueDate, asOf));
  const accruedInterest = floorWon(outstanding * (input.annualRate / 100) * accruedDays / 365);
  const loanDays = diffDays(input.startDate, input.maturityDate);
  const remainingDays = Math.max(0, diffDays(asOf, input.maturityDate));
  const feeWaived = diffDays(input.startDate, asOf) >= FEE_WAIVER_DAYS;
  const fee = feeWaived || loanDays === 0 ? 0 : floorWon(principalAmount * (input.feeRate / 100) * remainingDays / loanDays);
  const re = isFull ? { rows: [], monthly: null } : reamortize(outstanding - principalAmount, input.remaining, input.annualRate, input.method);
  return {
    asOf, outstandingPrincipal: outstanding, principalAmount, accruedInterest, accruedDays, overdueInterest: input.overdueInterest, fee, feeRate: input.feeRate,
    remainingDays, loanDays, feeWaived, totalDue: principalAmount + accruedInterest + fee + input.overdueInterest, isFull,
    remainingSchedule: re.rows, newMonthlyPayment: re.monthly, disclosure: DISCLOSURE,
  };
}

/** 계산기용: 상환일까지의 회차는 약정일에 모두 납입했다고 본다. */
export function prepaymentQuote(req: PrepaymentCalcRequest): PrepaymentQuote {
  const rows = schedule(req.principal, req.termMonths, req.annualRate, req.startDate, req.paymentDay, req.repaymentMethod);
  const paid = rows.filter(r => r.dueDate <= req.prepaymentDate);
  const remaining = rows.filter(r => r.dueDate > req.prepaymentDate);
  const last = paid[paid.length - 1];
  return quote({
    outstanding: last ? last.balanceAfter : req.principal, annualRate: req.annualRate, feeRate: req.feeRate, startDate: req.startDate,
    maturityDate: rows[rows.length - 1].dueDate, lastDueDate: last ? last.dueDate : req.startDate, asOf: req.prepaymentDate,
    remaining, method: req.repaymentMethod, principalAmount: req.principalAmount, overdueInterest: 0,
  });
}

// ── 샌드박스 상태 ──────────────────────────────────────────────────────────────
interface RowState extends ScheduleRow { paidInterest: number; paidPrincipal: number }
interface DelinquencyState {
  startedOn: string;
  /** 현재 구간 시작일. 대상금액이 바뀌면 직전 누적을 settled 에 고정하고 새 구간을 센다(batch-and-clock.md). */
  segmentFrom: string;
  baseAmount: number;
  settled: number;
  accrued: number;
  paid: number;
  noticeSentOn: string | null;
  acceleratedOn: string | null;
}
interface ContractState {
  id: number; contractNo: string; applicationId: number; product: Product;
  principal: number; outstandingPrincipal: number; contractRate: number; overdueRate: number;
  status: Contract["status"]; assetClass: string; overdueDays: number;
  termMonths: number; repaymentMethod: RepaymentMethod; paymentDay: number; autoDebit: boolean; prepaymentFeeRate: number;
  startDate: string; maturityDate: string; totalInterestPaid: number; totalPaid: number; closedOn: string | null;
  rows: RowState[]; delinquency: DelinquencyState | null; transactions: Transaction[]; events: ContractEvent[]; provisions: Provision[];
}
interface SandboxState {
  id: number; businessDate: string; settlementBalance: number; profile: Profile | null;
  ledger: LedgerEntry[]; applications: Application[]; contracts: ContractState[]; notifications: Notification[]; executions: BatchExecution[];
  seq: number;
}

/** 예시 11 의 출발점: 영업일 2026-01-15, 결제계좌 0. learner 계정만 프로필(1995-03-02 · 48,000,000 · 0 · 820)을 미리 둔다. */
const SEED_DATE = "2026-01-15";
const SEED_PROFILE: Profile = { birthDate: "1995-03-02", employmentType: "EMPLOYEE", annualIncome: 48_000_000, existingAnnualDebtService: 0, creditScore: 820 };
const sandboxes = new Map<number, SandboxState>();
function sandboxOf(user: User): SandboxState {
  let s = sandboxes.get(user.id);
  if (!s) {
    s = { id: user.id, businessDate: SEED_DATE, settlementBalance: 0, profile: user.id === 1 ? { ...SEED_PROFILE } : null, ledger: [], applications: [], contracts: [], notifications: [], executions: [], seq: 0 };
    sandboxes.set(user.id, s);
  }
  return s;
}
const nextId = (s: SandboxState) => ++s.seq;

function assetClassOf(days: number): string {
  return days >= 365 ? "ESTIMATED_LOSS" : days >= 180 ? "DOUBTFUL" : days >= 90 ? "SUBSTANDARD" : days >= 30 ? "PRECAUTIONARY" : "NORMAL";
}
const PROVISION_RATE: Record<string, number> = { NORMAL: 1, PRECAUTIONARY: 10, SUBSTANDARD: 20, DOUBTFUL: 75, ESTIMATED_LOSS: 100 };

function overdueUnpaid(c: ContractState): number { return c.delinquency ? c.delinquency.settled + c.delinquency.accrued - c.delinquency.paid : 0; }
/** 지금 갚아야 할 회차: 연체·일부 납입 회차와, 실제 납입일이 영업일 이전인 미납 회차. */
function dueRows(c: ContractState, date: string): RowState[] {
  return c.rows.filter(r => r.status === "OVERDUE" || r.status === "PARTIAL" || (r.status === "SCHEDULED" && r.adjustedDueDate <= date));
}
function unpaidInterestOf(rows: RowState[]): number { return rows.reduce((s, r) => s + (r.interest - r.paidInterest), 0); }
function amountDueNow(c: ContractState, date: string): number {
  if (c.status === "PAID_OFF") return 0;
  if (c.status === "DEFAULTED") return c.outstandingPrincipal + unpaidInterestOf(c.rows.filter(r => r.status !== "PAID")) + overdueUnpaid(c);
  return dueRows(c, date).reduce((s, r) => s + (r.payment - r.paidInterest - r.paidPrincipal), 0) + overdueUnpaid(c);
}
/** 다음 납입 회차 = 아직 납입일이 오지 않은 첫 회차. 연체·일부 납입 회차는 amountDueNow 로 따로 청구한다. */
function nextDueRow(c: ContractState): RowState | undefined { return c.rows.find(r => r.status === "SCHEDULED"); }

function addEvent(s: SandboxState, c: ContractState, type: string, amount: number | null, detail: Record<string, unknown> | null = null): ContractEvent {
  const event: ContractEvent = { id: nextId(s), contractId: c.id, businessDate: s.businessDate, type, amount, detail };
  c.events.push(event);
  return event;
}
function notify(s: SandboxState, c: ContractState | null, type: string, title: string, body: string): Notification {
  const n: Notification = { id: nextId(s), contractId: c?.id ?? null, businessDate: s.businessDate, type, title, body, read: false };
  s.notifications.push(n);
  return n;
}
function ledger(s: SandboxState, type: string, amount: number, contractNo: string | null): LedgerEntry {
  s.settlementBalance += amount;
  const entry: LedgerEntry = { id: nextId(s), businessDate: s.businessDate, type, amount, balanceAfter: s.settlementBalance, contractNo };
  s.ledger.push(entry);
  return entry;
}

/** 받은 금액을 연체이자 → 미납 이자 → 미납 원금 순으로, 오래된 회차부터 배분한다(§6, ADR-010). 기한이익상실 뒤에는 잔액 전체가 원금 대상이다. */
function allocate(s: SandboxState, c: ContractState, amount: number, type: string, fee = 0): Transaction {
  let remaining = amount - fee;
  const overdueInterest = Math.min(remaining, overdueUnpaid(c));
  if (c.delinquency) c.delinquency.paid += overdueInterest;
  remaining -= overdueInterest;
  const targets = c.status === "DEFAULTED" ? c.rows.filter(r => r.status !== "PAID") : dueRows(c, s.businessDate);
  const allocations = new Map<number, TransactionAllocation>();
  const alloc = (no: number) => { let a = allocations.get(no); if (!a) { a = { installmentNo: no, interest: 0, principal: 0 }; allocations.set(no, a); } return a; };
  let interest = 0;
  for (const row of targets) {
    if (remaining <= 0) break;
    const pay = Math.min(remaining, row.interest - row.paidInterest);
    if (pay > 0) { row.paidInterest += pay; alloc(row.installmentNo).interest += pay; interest += pay; remaining -= pay; }
  }
  let principal = 0;
  for (const row of targets) {
    if (remaining <= 0) break;
    const pay = Math.min(remaining, row.principal - row.paidPrincipal);
    if (pay > 0) { row.paidPrincipal += pay; alloc(row.installmentNo).principal += pay; principal += pay; remaining -= pay; }
  }
  for (const row of targets) {
    if (row.paidInterest >= row.interest && row.paidPrincipal >= row.principal) { row.status = "PAID"; row.paidOn = s.businessDate; }
    else if (row.paidInterest > 0 || row.paidPrincipal > 0) row.status = "PARTIAL";
  }
  c.outstandingPrincipal -= principal;
  c.totalInterestPaid += interest;
  c.totalPaid += amount;
  ledger(s, type, -amount, c.contractNo);
  const tx: Transaction = { id: nextId(s), type, businessDate: s.businessDate, totalAmount: amount, fee, overdueInterest, interest, principal, allocations: [...allocations.values()], settlementBalanceAfter: s.settlementBalance };
  c.transactions.push(tx);
  settleStatus(s, c);
  return tx;
}

/** 납입 뒤 상태 정리: 연체 정상화, 완제. */
function settleStatus(s: SandboxState, c: ContractState) {
  if (c.status === "PAID_OFF") return;
  const stillOverdue = c.rows.some(r => r.status === "OVERDUE" || r.status === "PARTIAL") || overdueUnpaid(c) > 0;
  if (c.delinquency && !stillOverdue && c.status !== "DEFAULTED") {
    c.delinquency = null; c.status = "ACTIVE"; c.overdueDays = 0;
    if (c.assetClass !== "NORMAL") { addEvent(s, c, "CLASS_CHANGED", null, { from: c.assetClass, to: "NORMAL" }); c.assetClass = "NORMAL"; }
    addEvent(s, c, "OVERDUE_CLEARED", null, null);
  }
  if (c.outstandingPrincipal <= 0 && !stillOverdue) {
    c.status = "PAID_OFF"; c.closedOn = s.businessDate; c.delinquency = null; c.overdueDays = 0;
    for (const row of c.rows) if (row.status !== "PAID") { row.status = "PAID"; row.paidOn = s.businessDate; }
    addEvent(s, c, "PAID_OFF", c.totalPaid, { totalInterest: c.totalInterestPaid });
    notify(s, c, "PAID_OFF", "대출을 모두 갚았어요", `${c.contractNo} 계약이 완제됐어요. 총 납입 ${won(c.totalPaid)}, 총 이자 ${won(c.totalInterestPaid)}이에요.`);
  }
}

/** 일마감 한 날짜(batch-and-clock.md 순서). */
function dailyClose(s: SandboxState, date: string, newEvents: ContractEvent[]): BatchExecution {
  const live = s.contracts.filter(c => c.status !== "PAID_OFF");
  const before = newEvents.length;
  for (const c of live) {
    // 1. D-3 납입 예정 알림
    for (const row of c.rows) {
      if (row.status === "SCHEDULED" && row.adjustedDueDate === addDays(date, 3)) {
        const need = amountDueNow(c, row.adjustedDueDate);
        const short = need - s.settlementBalance;
        notify(s, c, "PAYMENT_DUE_SOON", `${row.installmentNo}회차 납입일이 3일 뒤예요`,
          `${c.contractNo} ${row.installmentNo}회차 ${won(row.payment)}의 납입일은 ${row.adjustedDueDate}이에요. ${c.autoDebit ? `결제계좌 잔액 ${won(s.settlementBalance)}${short > 0 ? `으로는 ${won(short)}이 부족해요. 입금해 두어야 자동이체가 돼요.` : `으로 자동이체가 가능해요.`}` : "자동이체가 없으니 계약 화면에서 직접 상환해요."}`);
      }
    }
    // 2. 자동이체
    const dueToday = c.rows.filter(r => r.status === "SCHEDULED" && r.adjustedDueDate === date);
    if (dueToday.length > 0 && c.autoDebit) {
      const need = amountDueNow(c, date);
      if (need > 0 && s.settlementBalance >= need) {
        allocate(s, c, need, "AUTO_DEBIT");
        for (const row of dueToday) {
          newEvents.push(addEvent(s, c, "PAYMENT_COMPLETED", row.payment, { installmentNo: row.installmentNo }));
          notify(s, c, "PAYMENT_COMPLETED", `${row.installmentNo}회차 자동이체가 완료됐어요`, `${c.contractNo} ${row.installmentNo}회차 ${won(row.payment)}이 결제계좌에서 빠져나갔어요. 잔액 ${won(s.settlementBalance)}.`);
        }
      }
    }
    if (c.status === "PAID_OFF") continue;
    // 3. 연체 시작(부족하면 한 푼도 빼지 않는다. 자동이체가 없는 계약도 같은 날 연체)
    const newlyOverdue = c.rows.filter(r => r.status === "SCHEDULED" && r.adjustedDueDate <= date);
    for (const row of newlyOverdue) row.status = "OVERDUE";
    if (newlyOverdue.length > 0 && !c.delinquency) {
      const base = dueRows(c, date).reduce((sum, r) => sum + (r.payment - r.paidInterest - r.paidPrincipal), 0);
      c.delinquency = { startedOn: addDays(date, 1), segmentFrom: addDays(date, 1), baseAmount: base, settled: 0, accrued: 0, paid: 0, noticeSentOn: null, acceleratedOn: null };
      c.status = "OVERDUE";
      newEvents.push(addEvent(s, c, "OVERDUE_STARTED", base, { installmentNo: newlyOverdue[0].installmentNo, overdueRate: c.overdueRate }));
      notify(s, c, "OVERDUE_STARTED", `${newlyOverdue[0].installmentNo}회차가 연체됐어요`, `${c.contractNo} ${newlyOverdue[0].installmentNo}회차 ${won(base)}이 납입되지 않았어요. 내일부터 연체이율 ${c.overdueRate.toFixed(2)}%로 연체이자가 붙어요.`);
    }
    // 4. 연체 갱신: 대상금액 재산정, 누적 연체이자 = floor(대상 × 연체이율 × 일수/365)
    const d = c.delinquency;
    if (d) {
      const base = c.status === "DEFAULTED" ? c.outstandingPrincipal : dueRows(c, date).reduce((sum, r) => sum + (r.payment - r.paidInterest - r.paidPrincipal), 0);
      if (base !== d.baseAmount && date >= d.segmentFrom) { d.settled += d.accrued; d.accrued = 0; d.segmentFrom = date; d.baseAmount = base; }
      const segDays = Math.max(0, diffDays(d.segmentFrom, date) + 1);
      d.accrued = floorWon(d.baseAmount * (c.overdueRate / 100) * segDays / 365);
      c.overdueDays = Math.max(0, diffDays(d.startedOn, date) + 1);
      // 5. 건전성
      const klass = assetClassOf(c.overdueDays);
      if (klass !== c.assetClass) { newEvents.push(addEvent(s, c, "CLASS_CHANGED", null, { from: c.assetClass, to: klass, overdueDays: c.overdueDays })); c.assetClass = klass; }
      // 6. 기한이익상실 통지·상실
      if (c.overdueDays === 45 && !d.noticeSentOn) {
        d.noticeSentOn = date;
        newEvents.push(addEvent(s, c, "ACCELERATION_NOTICE", amountDueNow(c, date), { lossDate: addDays(date, 15) }));
        notify(s, c, "ACCELERATION_NOTICE", "기한이익상실 예정 통지예요", `${c.contractNo} 연체 45일이에요. 15일 안에 ${won(amountDueNow(c, date))}을 정리하지 않으면 ${addDays(date, 15)}에 기한이익이 상실돼 잔액 전체를 한 번에 갚아야 해요.`);
      }
      if (c.overdueDays === 60 && c.status !== "DEFAULTED") {
        c.status = "DEFAULTED"; d.acceleratedOn = date;
        d.settled += d.accrued; d.accrued = 0; d.segmentFrom = addDays(date, 1); d.baseAmount = c.outstandingPrincipal;
        const claim = amountDueNow(c, date);
        newEvents.push(addEvent(s, c, "ACCELERATED", claim, { outstandingPrincipal: c.outstandingPrincipal }));
        notify(s, c, "ACCELERATED", "기한이익이 상실됐어요", `${c.contractNo} 연체 60일로 기한이익이 상실됐어요. 잔액 ${won(c.outstandingPrincipal)}을 포함해 ${won(claim)}을 한 번에 청구해요. 이제부터 잔액 전체에 연체이자가 붙어요.`);
      }
    }
  }
  // 7. 월마감: 충당금
  if (isMonthEnd(date)) {
    const month = monthOf(date);
    for (const c of s.contracts.filter(x => x.status !== "PAID_OFF")) {
      const rate = PROVISION_RATE[c.assetClass] ?? 1;
      const row: Provision = { baseMonth: month, assetClass: c.assetClass, outstandingPrincipal: c.outstandingPrincipal, provisionRate: rate, provisionAmount: floorWon(c.outstandingPrincipal * rate / 100) };
      const idx = c.provisions.findIndex(p => p.baseMonth === month);
      if (idx >= 0) c.provisions[idx] = row; else c.provisions.push(row);
    }
    s.executions.push({ id: nextId(s), sandboxId: s.id, jobName: "MONTHLY_CLOSE", businessDate: date, status: "SUCCESS", processedContracts: live.length, errorMessage: null });
  }
  // 8. 영업일 전진
  s.businessDate = addDays(date, 1);
  const exec: BatchExecution = { id: nextId(s), sandboxId: s.id, jobName: "DAILY_CLOSE", businessDate: date, status: "SUCCESS", processedContracts: live.length, errorMessage: newEvents.length > before ? null : null };
  s.executions.push(exec);
  return exec;
}

// ── 응답 변환 ──────────────────────────────────────────────────────────────────
function sandboxView(s: SandboxState): Sandbox {
  const live = s.contracts.filter(c => c.status !== "PAID_OFF");
  const dues = live.map(c => nextDueRow(c)?.adjustedDueDate).filter((d): d is string => !!d).sort();
  return {
    id: s.id, businessDate: s.businessDate, settlementBalance: s.settlementBalance, profile: s.profile,
    activeContracts: live.length, overdueContracts: live.filter(c => c.status === "OVERDUE" || c.status === "DEFAULTED").length,
    unreadNotifications: s.notifications.filter(n => !n.read).length, nextDueDate: dues[0] ?? null,
  };
}
function summaryView(c: ContractState): ContractSummary {
  const next = c.status === "PAID_OFF" ? undefined : nextDueRow(c);
  return {
    id: c.id, contractNo: c.contractNo, productName: c.product.name, principal: c.principal, outstandingPrincipal: c.outstandingPrincipal, contractRate: c.contractRate,
    status: c.status, assetClass: c.assetClass, overdueDays: c.overdueDays, nextDueDate: next?.adjustedDueDate ?? null, nextPayment: next ? next.payment - next.paidInterest - next.paidPrincipal : null,
  };
}
function contractView(s: SandboxState, c: ContractState): Contract {
  const d = c.delinquency;
  const delinquency: Delinquency | null = d ? { startedOn: d.startedOn, days: c.overdueDays, baseAmount: d.baseAmount, accruedOverdueInterest: d.settled + d.accrued, unpaidOverdueInterest: d.settled + d.accrued - d.paid, noticeSentOn: d.noticeSentOn, acceleratedOn: d.acceleratedOn } : null;
  return {
    ...summaryView(c), applicationId: c.applicationId, overdueRate: c.overdueRate, termMonths: c.termMonths, repaymentMethod: c.repaymentMethod, paymentDay: c.paymentDay, autoDebit: c.autoDebit,
    prepaymentFeeRate: c.prepaymentFeeRate, startDate: c.startDate, maturityDate: c.maturityDate, paidInstallments: c.rows.filter(r => r.status === "PAID").length, totalInstallments: c.rows.length,
    totalInterestPaid: c.totalInterestPaid, totalPaid: c.totalPaid, delinquency, amountDueNow: amountDueNow(c, s.businessDate), closedOn: c.closedOn, disclosure: DISCLOSURE,
  };
}
function rowsView(c: ContractState): ScheduleRow[] {
  return c.rows.map(({ paidInterest: _i, paidPrincipal: _p, ...row }) => row);
}

/** 계약의 중도상환 견적. 직전 납입일은 마지막으로 낸 회차의 약정일(없으면 실행일). */
function contractQuote(s: SandboxState, c: ContractState, principalAmount: number | null | undefined): PrepaymentQuote {
  const paid = c.rows.filter(r => r.status === "PAID");
  const last = paid[paid.length - 1];
  return quote({
    outstanding: c.outstandingPrincipal, annualRate: c.contractRate, feeRate: c.prepaymentFeeRate, startDate: c.startDate, maturityDate: c.maturityDate,
    lastDueDate: last ? last.dueDate : c.startDate, asOf: s.businessDate, remaining: c.rows.filter(r => r.status !== "PAID"), method: c.repaymentMethod, principalAmount, overdueInterest: 0,
  });
}

// ── 라우터 ────────────────────────────────────────────────────────────────────
export function mockLab(method: string, pathname: string, params: URLSearchParams, body: unknown, me: User | null, ok: Ok, fail: Fail): MockResult | null {
  const key = `${method} ${pathname}`;

  // ── 계산기(로그인 없음)
  if (key === "POST /calculators/schedule") {
    const req = body as ScheduleRequest;
    if (!req || !(req.principal >= 1_000_000) || !(req.termMonths >= 1 && req.termMonths <= 120) || !(req.annualRate >= 0 && req.annualRate <= 20) || !isValidDate(req.startDate) || !(req.paymentDay >= 1 && req.paymentDay <= 28)) {
      return fail(400, "VALIDATION", "원금은 100만 원 이상, 기간은 1~120회, 금리는 0~20%, 납입일은 1~28일이어야 해요.");
    }
    return ok(scheduleResponse(req));
  }
  if (key === "POST /calculators/screening") {
    const req = body as ScreeningRequest;
    if (!req || !isValidDate(req.birthDate) || !isValidDate(req.asOf) || !(req.creditScore >= 300 && req.creditScore <= 1000) || !(req.requestedAmount > 0)) {
      return fail(400, "VALIDATION", "생년월일·기준일은 날짜, 신용점수는 300~1000점, 신청 금액은 0원보다 커야 해요.");
    }
    return ok(screen(req));
  }
  if (key === "POST /calculators/prepayment") {
    const req = body as PrepaymentCalcRequest;
    if (!req || !(req.principal >= 1_000_000) || !(req.termMonths >= 1) || !isValidDate(req.startDate) || !isValidDate(req.prepaymentDate) || !(req.paymentDay >= 1 && req.paymentDay <= 28)) {
      return fail(400, "VALIDATION", "원금은 100만 원 이상, 기간은 1회 이상, 실행일·상환일은 날짜여야 해요.");
    }
    if (req.prepaymentDate < req.startDate) return fail(400, "VALIDATION", "상환일은 실행일 이후여야 해요.", [{ field: "prepaymentDate", message: "실행일 이후" }]);
    const q = prepaymentQuote(req);
    if (q.outstandingPrincipal <= 0) return fail(400, "VALIDATION", "상환일이 만기 이후라 남은 잔액이 없어요. 만기 전 날짜를 넣어요.", [{ field: "prepaymentDate", message: "만기 전" }]);
    if (req.principalAmount !== null && req.principalAmount !== undefined && req.principalAmount <= 0) return fail(400, "VALIDATION", "일부 상환 원금은 0원보다 커야 해요.", [{ field: "principalAmount", message: "0원 초과" }]);
    return ok(q);
  }

  // ── 샌드박스
  if (key === "GET /sandbox/products") return ok(PRODUCTS);
  if (!pathname.startsWith("/sandbox")) return null;
  if (!me) return fail(401, "UNAUTHORIZED", "로그인이 필요해요. 다시 로그인한 뒤 시도해요.");
  const s = sandboxOf(me);

  if (key === "GET /sandbox") return ok(sandboxView(s));
  if (key === "PUT /sandbox/profile") {
    const p = body as Profile;
    const details: ApiErrorBody["details"] = [];
    if (!isValidDate(p?.birthDate)) details.push({ field: "birthDate", message: "날짜 형식" });
    if (!(p?.annualIncome >= 0)) details.push({ field: "annualIncome", message: "0원 이상" });
    if (!(p?.existingAnnualDebtService >= 0)) details.push({ field: "existingAnnualDebtService", message: "0원 이상" });
    if (!(p?.creditScore >= 300 && p.creditScore <= 1000)) details.push({ field: "creditScore", message: "300~1000점" });
    if (details.length) return fail(400, "VALIDATION", "프로필 값을 확인해요. 신용점수는 300~1000점, 금액은 0원 이상이에요.", details);
    s.profile = { birthDate: p.birthDate, employmentType: p.employmentType, annualIncome: p.annualIncome, existingAnnualDebtService: p.existingAnnualDebtService, creditScore: p.creditScore };
    return ok(s.profile);
  }
  if (key === "POST /sandbox/settlement-account/deposits") {
    const { amount } = body as { amount: number };
    if (!(amount >= 1 && amount <= 100_000_000)) return fail(400, "VALIDATION", "입금액은 1원 이상 1억 원 이하여야 해요.", [{ field: "amount", message: "1~100,000,000" }]);
    return ok(ledger(s, "DEPOSIT", amount, null), 201);
  }
  if (key === "GET /sandbox/settlement-account/ledger") return ok([...s.ledger].reverse());
  if (key === "POST /sandbox/clock/advance") {
    const { mode, days } = body as ClockAdvanceRequest;
    const fromDate = s.businessDate;
    let toDateExclusive: string;
    if (mode === "ONE_DAY") toDateExclusive = addDays(fromDate, 1);
    else if (mode === "DAYS") {
      if (!(days && days >= 1 && days <= 400)) return fail(400, "VALIDATION", "진행 일수는 1~400일이어야 해요.", [{ field: "days", message: "1~400" }]);
      toDateExclusive = addDays(fromDate, days);
    } else if (mode === "NEXT_DUE_DATE") {
      const dues = s.contracts.filter(c => c.status !== "PAID_OFF").map(c => nextDueRow(c)?.adjustedDueDate).filter((d): d is string => !!d && d >= fromDate).sort();
      if (!dues.length) return fail(409, "CONFLICT", "납입 예정이 있는 계약이 없어 다음 납입일을 정할 수 없어요. 대출을 실행한 뒤 진행해요.");
      toDateExclusive = addDays(dues[0], 1);
    } else return fail(400, "VALIDATION", "진행 모드는 ONE_DAY·NEXT_DUE_DATE·DAYS 중 하나예요.");
    const executions: BatchExecution[] = [];
    const newEvents: ContractEvent[] = [];
    const notifBefore = s.notifications.length;
    for (let date = fromDate; date < toDateExclusive; date = addDays(date, 1)) executions.push(dailyClose(s, date, newEvents));
    const result: ClockAdvanceResult = { fromDate, toDate: s.businessDate, daysAdvanced: executions.length, executions, newEvents, newNotifications: s.notifications.length - notifBefore, sandbox: sandboxView(s) };
    return ok(result);
  }
  if (key === "GET /sandbox/applications") return ok([...s.applications].reverse());
  if (key === "POST /sandbox/applications") {
    if (!s.profile) return fail(422, "PROFILE_REQUIRED", "가상 고객 프로필이 아직 없어요. 프로필을 먼저 만들고 신청해요.");
    const req = body as ApplicationRequest;
    const product = PRODUCTS.find(p => p.code === req?.productCode);
    if (!product) return fail(400, "VALIDATION", "상품을 골라요.", [{ field: "productCode", message: "알 수 없는 상품" }]);
    if (!(req.requestedAmount > 0) || !(req.paymentDay >= 1 && req.paymentDay <= 28) || !(req.termMonths > 0)) return fail(400, "VALIDATION", "신청 금액·기간·납입일(1~28)을 확인해요.");
    const screening = screen({
      birthDate: s.profile.birthDate, annualIncome: s.profile.annualIncome, existingAnnualDebtService: s.profile.existingAnnualDebtService, creditScore: s.profile.creditScore,
      productCode: product.code, requestedAmount: req.requestedAmount, termMonths: req.termMonths, repaymentMethod: req.repaymentMethod, autoDebit: req.autoDebit,
      vehicleValue: req.collateral?.appraisedValue ?? null, asOf: s.businessDate,
    });
    const id = nextId(s);
    const app: Application = {
      id, applicationNo: `AP-${s.businessDate.slice(0, 4)}-${String(id).padStart(6, "0")}`, product, requestedAmount: req.requestedAmount, termMonths: req.termMonths,
      repaymentMethod: req.repaymentMethod, paymentDay: req.paymentDay, autoDebit: req.autoDebit, status: screening.decision, appliedOn: s.businessDate, decidedOn: s.businessDate,
      collateral: req.collateral ? { ...req.collateral } : null, screening, overrides: [], contractId: null,
    };
    s.applications.push(app);
    return ok(app, 201);
  }
  let m = pathname.match(/^\/sandbox\/applications\/(\d+)(?:\/(accept|cancel|execute))?$/);
  if (m) {
    const app = s.applications.find(a => a.id === Number(m![1]));
    if (!app) return fail(404, "NOT_FOUND", "그 신청을 찾지 못했어요. 내 모의 여신에서 신청 목록을 확인해요.");
    if (method === "GET" && !m[2]) return ok(app);
    if (method !== "POST") return null;
    if (m[2] === "accept") {
      if (app.status !== "CONDITIONAL") return fail(409, "CONFLICT", "조건부 승인 상태의 신청만 제안 한도로 수락할 수 있어요.");
      app.status = "APPROVED";
      return ok(app);
    }
    if (m[2] === "cancel") {
      if (app.status === "EXECUTED") return fail(409, "CONFLICT", "이미 실행된 신청은 취소할 수 없어요. 계약에서 중도상환으로 정리해요.");
      if (app.status === "CANCELLED" || app.status === "REJECTED") return fail(409, "CONFLICT", "이미 끝난 신청이라 취소할 게 없어요.");
      app.status = "CANCELLED";
      return ok(app);
    }
    if (m[2] === "execute") {
      if (app.status !== "APPROVED") return fail(409, "CONFLICT", app.status === "CONDITIONAL" ? "조건부 승인은 제안 한도를 먼저 수락해야 실행할 수 있어요." : "승인 상태의 신청만 실행할 수 있어요.");
      const amount = app.screening.offeredAmount ?? app.requestedAmount;
      const rate = app.screening.rate.applied;
      const rows = schedule(amount, app.termMonths, rate, s.businessDate, app.paymentDay, app.repaymentMethod).map(r => ({ ...r, status: "SCHEDULED", paidInterest: 0, paidPrincipal: 0 }));
      const cid = nextId(s);
      const c: ContractState = {
        id: cid, contractNo: `CT-${s.businessDate.slice(0, 4)}-${String(cid).padStart(6, "0")}`, applicationId: app.id, product: app.product,
        principal: amount, outstandingPrincipal: amount, contractRate: rate, overdueRate: Math.min(Math.round((rate + 3) * 100) / 100, MAX_RATE),
        status: "ACTIVE", assetClass: "NORMAL", overdueDays: 0, termMonths: app.termMonths, repaymentMethod: app.repaymentMethod, paymentDay: app.paymentDay, autoDebit: app.autoDebit,
        prepaymentFeeRate: app.product.prepaymentFeeRate, startDate: s.businessDate, maturityDate: rows[rows.length - 1].dueDate, totalInterestPaid: 0, totalPaid: 0, closedOn: null,
        rows, delinquency: null, transactions: [], events: [], provisions: [],
      };
      s.contracts.push(c);
      app.status = "EXECUTED"; app.contractId = c.id;
      ledger(s, "LOAN_DISBURSEMENT", amount, c.contractNo);
      addEvent(s, c, "EXECUTED", amount, { applicationNo: app.applicationNo, rate });
      notify(s, c, "LOAN_EXECUTED", "대출이 실행됐어요", `${c.contractNo} 계약이 실행되어 결제계좌에 ${won(amount)}이 입금됐어요. 1회차 납입일은 ${rows[0].adjustedDueDate}이에요.`);
      return ok(contractView(s, c), 201);
    }
  }
  if (key === "GET /sandbox/contracts") {
    const status = params.get("status");
    return ok(s.contracts.filter(c => !status || c.status === status).map(summaryView).reverse());
  }
  m = pathname.match(/^\/sandbox\/contracts\/(\d+)(?:\/([a-z-]+))?$/);
  if (m) {
    const c = s.contracts.find(x => x.id === Number(m![1]));
    if (!c) return fail(404, "NOT_FOUND", "그 계약을 찾지 못했어요. 내 모의 여신에서 계약 목록을 확인해요.");
    switch (m[2]) {
      case undefined: return ok(contractView(s, c));
      case "schedules": return ok(rowsView(c));
      case "transactions": return ok([...c.transactions].reverse());
      case "events": return ok([...c.events]);
      case "provisions": return ok([...c.provisions]);
      case "repayments": {
        if (method !== "POST") return null;
        const { amount } = body as { amount: number };
        const due = amountDueNow(c, s.businessDate);
        if (c.status === "PAID_OFF") return fail(400, "NOTHING_DUE", "이미 완제된 계약이에요.");
        if (due <= 0) return fail(400, "NOTHING_DUE", "지금은 갚을 미납분이 없어요. 미리 갚으려면 중도상환 견적을 받아요.");
        if (!(amount >= 1)) return fail(400, "VALIDATION", "상환 금액은 1원 이상이어야 해요.", [{ field: "amount", message: "1원 이상" }]);
        if (amount > due) return fail(400, "VALIDATION", `지금 갚아야 할 금액은 ${won(due)}이에요. 그보다 큰 금액은 중도상환으로 해요.`, [{ field: "amount", message: `최대 ${won(due)}` }]);
        if (amount > s.settlementBalance) return fail(409, "INSUFFICIENT_BALANCE", `결제계좌 잔액이 ${won(amount - s.settlementBalance)} 부족해요. 입금 후 다시 시도해요.`);
        const tx = allocate(s, c, amount, "MANUAL_REPAYMENT");
        addEvent(s, c, "REPAID", amount, { allocations: tx.allocations.length });
        return ok(tx, 201);
      }
      case "prepayment-quote": {
        if (c.status === "PAID_OFF") return fail(409, "CONFLICT", "이미 완제된 계약이에요.");
        if (c.status !== "ACTIVE") return fail(409, "OVERDUE_FIRST", `연체 중이에요. 먼저 연체분 ${won(amountDueNow(c, s.businessDate))}을 수동 상환으로 정리한 뒤 중도상환해요.`);
        const p = params.get("principalAmount");
        return ok(contractQuote(s, c, p ? Number(p) : null));
      }
      case "prepayments": {
        if (method !== "POST") return null;
        if (c.status === "PAID_OFF") return fail(409, "CONFLICT", "이미 완제된 계약이에요.");
        if (c.status !== "ACTIVE") return fail(409, "OVERDUE_FIRST", `연체 중이에요. 먼저 연체분 ${won(amountDueNow(c, s.businessDate))}을 수동 상환으로 정리한 뒤 중도상환해요.`);
        const { principalAmount } = (body ?? {}) as { principalAmount?: number | null };
        if (principalAmount !== null && principalAmount !== undefined && !(principalAmount >= 1)) return fail(400, "VALIDATION", "일부 상환 원금은 1원 이상이어야 해요.", [{ field: "principalAmount", message: "1원 이상" }]);
        const q = contractQuote(s, c, principalAmount);
        if (q.totalDue > s.settlementBalance) return fail(409, "INSUFFICIENT_BALANCE", `결제계좌 잔액이 ${won(q.totalDue - s.settlementBalance)} 부족해요. 입금 후 다시 시도해요.`);
        // 경과이자·수수료를 먼저 떼고, 원금은 잔여 회차의 원금에 뒤에서부터가 아니라 "잔액"에서 바로 뺀 뒤 잔여 회차를 재산정한다.
        const remaining = c.rows.filter(r => r.status !== "PAID");
        const paidRowsCount = c.rows.length - remaining.length;
        c.outstandingPrincipal -= q.principalAmount;
        c.totalInterestPaid += q.accruedInterest;
        c.totalPaid += q.totalDue;
        ledger(s, "PREPAYMENT", -q.totalDue, c.contractNo);
        const tx: Transaction = { id: nextId(s), type: q.isFull ? "PREPAYMENT_FULL" : "PREPAYMENT_PARTIAL", businessDate: s.businessDate, totalAmount: q.totalDue, fee: q.fee, overdueInterest: 0, interest: q.accruedInterest, principal: q.principalAmount, allocations: [], settlementBalanceAfter: s.settlementBalance };
        c.transactions.push(tx);
        if (q.isFull) {
          for (const row of remaining) { row.status = "PAID"; row.paidOn = s.businessDate; row.paidPrincipal = row.principal; row.paidInterest = row.interest; }
          addEvent(s, c, "PREPAID", q.totalDue, { full: true, fee: q.fee, accruedInterest: q.accruedInterest });
          settleStatus(s, c);
        } else {
          c.rows = [...c.rows.slice(0, paidRowsCount), ...q.remainingSchedule.map(r => ({ ...r, status: "SCHEDULED", paidInterest: 0, paidPrincipal: 0 }))];
          addEvent(s, c, "PREPAID", q.totalDue, { full: false, principal: q.principalAmount, fee: q.fee, accruedInterest: q.accruedInterest, newMonthlyPayment: q.newMonthlyPayment });
        }
        return ok(tx, 201);
      }
    }
  }
  if (key === "GET /sandbox/notifications") {
    const list = [...s.notifications].reverse();
    return ok(params.get("unreadOnly") === "true" ? list.filter(n => !n.read) : list);
  }
  if (key === "POST /sandbox/notifications/read") {
    const { ids } = body as { ids: number[] };
    for (const n of s.notifications) if (ids?.includes(n.id)) n.read = true;
    return ok(undefined, 204);
  }
  return null;
}
