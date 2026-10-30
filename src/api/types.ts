/**
 * docs/contracts/CapiMATE-API.yml(0.1.0)의 components.schemas·requestBodies·responses·인라인 요청 본문을 손으로 옮긴 타입.
 * 계약이 바뀌면 계약 커밋과 같은 PR에서 이 파일을 맞춘다. 금액은 원 단위 정수, 비율은 % number(예 7.9).
 * 스키마 이름은 계약과 같게 두고, 인라인 본문·열거형은 뒤에 Request/열거형 이름을 붙였다.
 */

// ── 공통 열거형(계약의 enum을 이름 붙여 재사용) ─────────────────────────────
export type UserRole = "USER" | "ADMIN";
export type RepaymentMethod = "EQUAL_PAYMENT" | "EQUAL_PRINCIPAL" | "BULLET";
export type Decision = "APPROVED" | "CONDITIONAL" | "REJECTED";
export type ScreeningSource = "AUTO" | "OVERRIDE";
export type ReasonOutcome = "PASS" | "FAIL" | "INFO";
export type LinkedCalculator = "schedule" | "screening" | "prepayment";
export type EmploymentType = "EMPLOYEE" | "SELF_EMPLOYED" | "FREELANCER" | "NONE";
export type ApplicationStatus = "APPLIED" | "APPROVED" | "CONDITIONAL" | "REJECTED" | "CANCELLED" | "EXECUTED";
export type ContractStatus = "ACTIVE" | "OVERDUE" | "DEFAULTED" | "PAID_OFF";
export type ClockAdvanceMode = "ONE_DAY" | "NEXT_DUE_DATE" | "DAYS";
/** 건전성 분류(business-rules §9). 계약은 string이지만 화면 라벨을 위해 알려진 값을 적어 둔다. */
export type AssetClass = "NORMAL" | "PRECAUTIONARY" | "SUBSTANDARD" | "DOUBTFUL" | "ESTIMATED_LOSS";

/** `YYYY-MM-DD` */
export type DateString = string;
/** ISO 8601 date-time */
export type DateTimeString = string;

// ── components.schemas ─────────────────────────────────────────────────────
export interface Error {
  /** VALIDATION | NOT_FOUND | FORBIDDEN | CONFLICT | NOTHING_DUE | INSUFFICIENT_BALANCE | OVERDUE_FIRST ... */
  code: string;
  message: string;
  requestId: string;
  details?: { field?: string; message?: string }[];
}
/** 화면 코드에서 DOM Error와 헷갈리지 않게 쓰는 별칭. */
export type ApiErrorBody = Error;

export interface User { id: number; email: string; role: UserRole }
/** 원 단위 */
export type Money = number;
/** 연 %, 소수 둘째 자리 */
export type Rate = number;

/** 모든 계산 결과에 포함 */
export interface Disclosure {
  ruleSetVersion: string;
  calcVersion: string;
  dayCountBasis?: number;
  rounding?: string;
  notice: string;
}

export interface ConceptSummary {
  id: string;
  orderNo: number;
  title: string;
  summary: string;
  quizCount: number;
  linkedCalculator: LinkedCalculator | string | null;
}
export interface ConceptSection { heading: string; body: string; figure: string | null }
export interface Misconception { claim: string; correction: string }
export interface Source { title: string; url: string; checkedOn: DateString }
export interface Concept {
  id: string;
  orderNo: number;
  title: string;
  summary: string;
  sections: ConceptSection[];
  misconceptions: Misconception[];
  checklist: string[];
  linkedCalculator: LinkedCalculator | null;
  sandboxTask: string | null;
  /** 게시된 확인 문제 수 */
  quizCount: number;
  /** 게시된 개념 수(n / 12 표시용) */
  totalCount: number;
  /** 그림(노드·엣지). 없으면 빈 배열 */
  figures?: Figure[];
  /** 본문 수치(제도 수치·가정값) */
  numbers?: ContentNumber[];
  relatedTerms?: TermSummary[];
  sources: Source[];
  contentVersion: number;
  prev: string | null;
  next: string | null;
}
export interface QuizOption { id: number; text: string }
export interface QuizQuestion { id: number; question: string; options: QuizOption[] }
export interface Quiz { conceptId: string; contentVersion: number; questions: QuizQuestion[] }
export interface QuizResultItem {
  quizId: number;
  correct: boolean;
  selectedOptionId: number;
  correctOptionId: number;
  feedback: string;
  explanation: string;
  nextAction: string;
}
export interface QuizResult { score: number; passed: boolean; saved: boolean; items: QuizResultItem[] }
export interface MyLearningConcept {
  conceptId: string;
  title: string;
  bestScore: number | null;
  completed: boolean;
  lastAttemptedAt: string | null;
  wrongQuizIds: number[];
}
export interface MyLearning {
  completedCount: number;
  totalCount: number;
  concepts: MyLearningConcept[];
  nextConceptId: string | null;
}

export interface TermSummary {
  slug: string;
  term: string;
  english: string | null;
  /** 계약은 string 이지만 값은 TermCategory 열거형(업무·금리·상환·심사·연체·건전성·리스) 중 하나다. */
  category: TermCategory | string;
  definition: string;
}
export interface Term extends TermSummary {
  formula: string | null;
  example: string | null;
  caution: string | null;
  related: TermSummary[];
  conceptIds: string[];
  sourceUrl: string;
  sourceCheckedOn: DateString;
}

export interface CreditBand {
  band: string;
  minScore: number;
  maxScore: number;
  /** 상품 코드 → 스프레드(%p) */
  spreads: Record<string, number>;
  incomeMultiple: number;
}
export interface AssetClassRule { code: AssetClass | string; label: string; minOverdueDays: number; provisionRate: number }
export interface RegulatoryFigure { name: string; value: string; sourceUrl: string; checkedOn: DateString }
export interface Methodology {
  ruleSetVersion: string;
  calcVersion: string;
  rounding: Record<string, string>;
  dayCountBasis: number;
  creditBands: CreditBand[];
  dsrLimit: number;
  ltvRate: number;
  overdueSpread: number;
  legalMaxRate: number;
  accelerationNoticeDays: number;
  accelerationDays: number;
  assetClasses: AssetClassRule[];
  products: Product[];
  regulatoryFigures: RegulatoryFigure[];
  /** 교육용 가정값 목록 */
  assumptions: string[];
}

export interface ScheduleRequest {
  principal: Money;
  termMonths: number;
  annualRate: Rate;
  startDate: DateString;
  paymentDay: number;
  /** 없으면 세 방식 모두 */
  methods?: RepaymentMethod[];
}
export interface ScheduleRow {
  installmentNo: number;
  dueDate: DateString;
  adjustedDueDate: DateString;
  principal: Money;
  interest: Money;
  payment: Money;
  balanceAfter: Money;
  status: string | null;
  paidOn: DateString | null;
}
export interface ScheduleMethodResult {
  method: RepaymentMethod;
  /** 원리금균등만 */
  monthlyPayment: Money | null;
  firstPayment: Money;
  lastPayment: Money;
  totalInterest: Money;
  totalPayment: Money;
  rows: ScheduleRow[];
}
export interface ScheduleResponse { results: ScheduleMethodResult[]; disclosure: Disclosure }

export interface ScreeningRequest {
  birthDate: DateString;
  annualIncome: Money;
  existingAnnualDebtService: Money;
  creditScore: number;
  productCode: string;
  requestedAmount: Money;
  termMonths: number;
  repaymentMethod: RepaymentMethod;
  autoDebit: boolean;
  vehicleValue?: Money | null;
  /** 기준일(나이 계산) */
  asOf: DateString;
}
export interface ScreeningReason {
  orderNo: number;
  ruleCode: string;
  input: string;
  threshold: string;
  outcome: ReasonOutcome;
  reasonCode: string | null;
  message: string;
}
export interface ScreeningRate { base: Rate; spread: Rate; discount: Rate; applied: Rate; capped: boolean }
export interface ScreeningLimits {
  productCap: Money | null;
  incomeCap: Money | null;
  dsrCap: Money | null;
  ltvCap: Money | null;
  finalLimit: Money | null;
  /** 한도를 결정한 규칙 코드 */
  bindingRule: string | null;
}
export interface ScreeningDsr { existingAnnual: Money; newAnnual: Money; ratio: number; limit: number }
export interface ScreeningResult {
  decision: Decision;
  source: ScreeningSource;
  creditBand: string | null;
  rate: ScreeningRate;
  limits: ScreeningLimits;
  dsr: ScreeningDsr;
  monthlyPayment: Money | null;
  offeredAmount: Money | null;
  reasons: ScreeningReason[];
  disclosure: Disclosure;
}

export interface PrepaymentCalcRequest {
  principal: Money;
  termMonths: number;
  annualRate: Rate;
  repaymentMethod: RepaymentMethod;
  startDate: DateString;
  paymentDay: number;
  prepaymentDate: DateString;
  feeRate: Rate;
  /** 없으면 전액 */
  principalAmount?: Money | null;
}
export interface PrepaymentQuote {
  asOf: DateString;
  outstandingPrincipal: Money;
  principalAmount: Money;
  accruedInterest: Money;
  accruedDays: number;
  overdueInterest: Money;
  fee: Money;
  feeRate: Rate;
  remainingDays: number;
  loanDays: number;
  /** 3년 경과 */
  feeWaived: boolean;
  totalDue: Money;
  isFull: boolean;
  /** 일부 상환 시 재산정 */
  remainingSchedule: ScheduleRow[];
  newMonthlyPayment: Money | null;
  disclosure: Disclosure;
}

export interface Sandbox {
  id: number;
  businessDate: DateString;
  settlementBalance: Money;
  profile: Profile | null;
  activeContracts: number;
  overdueContracts: number;
  unreadNotifications: number;
  nextDueDate: DateString | null;
}
export interface Profile {
  birthDate: DateString;
  employmentType: EmploymentType;
  annualIncome: Money;
  existingAnnualDebtService: Money;
  creditScore: number;
}
export interface LedgerEntry {
  id: number;
  businessDate: DateString;
  type: string;
  amount: Money;
  balanceAfter: Money;
  contractNo: string | null;
}
export interface ClockAdvanceResult {
  fromDate: DateString;
  toDate: DateString;
  daysAdvanced: number;
  executions: BatchExecution[];
  newEvents: ContractEvent[];
  newNotifications: number;
  sandbox: Sandbox;
}
export interface Product {
  code: string;
  name: string;
  minAmount: Money;
  maxAmount: Money | null;
  allowedTerms: number[];
  baseRate: Rate;
  allowedMethods: RepaymentMethod[];
  prepaymentFeeRate: Rate;
  requiresCollateral: boolean;
  ltvRate: Rate | null;
  description: string;
}
export interface Collateral { description?: string; appraisedValue?: Money }
export interface ApplicationRequest {
  productCode: string;
  requestedAmount: Money;
  termMonths: number;
  repaymentMethod: RepaymentMethod;
  paymentDay: number;
  autoDebit: boolean;
  purpose?: string;
  collateral?: Collateral | null;
}
export interface ApplicationOverride {
  beforeDecision: string;
  afterDecision: string;
  afterAmount: Money | null;
  reason: string;
  createdAt: DateTimeString;
}
export interface Application {
  id: number;
  applicationNo: string;
  product: Product;
  requestedAmount: Money;
  termMonths: number;
  repaymentMethod: RepaymentMethod;
  paymentDay: number;
  autoDebit: boolean;
  status: ApplicationStatus;
  appliedOn: DateString;
  decidedOn: DateString | null;
  collateral: Record<string, unknown> | null;
  screening: ScreeningResult;
  overrides: ApplicationOverride[];
  contractId: number | null;
}
export interface ContractSummary {
  id: number;
  contractNo: string;
  productName: string;
  principal: Money;
  outstandingPrincipal: Money;
  contractRate: Rate;
  status: ContractStatus;
  assetClass: AssetClass | string;
  overdueDays: number;
  nextDueDate: DateString | null;
  nextPayment: Money | null;
}
export interface Delinquency {
  startedOn: DateString;
  days: number;
  baseAmount: Money;
  accruedOverdueInterest: Money;
  unpaidOverdueInterest: Money;
  noticeSentOn: DateString | null;
  acceleratedOn: DateString | null;
}
export interface Contract extends ContractSummary {
  applicationId: number;
  overdueRate: Rate;
  termMonths: number;
  repaymentMethod: RepaymentMethod;
  paymentDay: number;
  autoDebit: boolean;
  prepaymentFeeRate: Rate;
  startDate: DateString;
  maturityDate: DateString;
  paidInstallments: number;
  totalInstallments: number;
  totalInterestPaid: Money;
  totalPaid: Money;
  delinquency: Delinquency | null;
  /** 지금 수동 상환으로 갚아야 하는 금액 */
  amountDueNow: Money;
  closedOn: DateString | null;
  disclosure: Disclosure;
}
export interface TransactionAllocation { installmentNo: number; interest: Money; principal: Money }
export interface Transaction {
  id: number;
  type: string;
  businessDate: DateString;
  totalAmount: Money;
  fee: Money;
  overdueInterest: Money;
  interest: Money;
  principal: Money;
  allocations: TransactionAllocation[];
  settlementBalanceAfter: Money;
}
export interface ContractEvent {
  id: number;
  contractId: number;
  businessDate: DateString;
  type: string;
  amount: Money | null;
  detail: Record<string, unknown> | null;
}
export interface Provision {
  baseMonth: string;
  assetClass: AssetClass | string;
  outstandingPrincipal: Money;
  provisionRate: number;
  provisionAmount: Money;
}
export interface Notification {
  id: number;
  contractId: number | null;
  businessDate: DateString;
  type: string;
  title: string;
  body: string;
  read: boolean;
}
export interface AdminApplicationItem {
  id: number;
  applicationNo: string;
  sandboxId: number;
  userEmailMasked: string;
  productName: string;
  requestedAmount: Money;
  status: string;
  decision: string;
  source: string;
  appliedOn: DateString;
}
export interface AdminApplicationPage { items: AdminApplicationItem[]; page: number; totalPages: number; totalItems: number }
export interface PortfolioByAssetClass { assetClass: AssetClass | string; contracts: number; outstanding: Money; provision: Money }
export interface PortfolioMonthly {
  month: string;
  disbursed: Money;
  repaidPrincipal: Money;
  interestIncome: Money;
  overdueRatio: number;
  provision: Money;
}
export interface Portfolio {
  asOf: DateTimeString;
  contracts: number;
  activeContracts: number;
  totalOutstanding: Money;
  overdueContracts: number;
  overdueOutstanding: Money;
  /** 잔액 기준 */
  overdueRatio: number;
  byAssetClass: PortfolioByAssetClass[];
  totalProvision: Money;
  monthly: PortfolioMonthly[];
}
export interface BatchExecution {
  id: number;
  sandboxId: number | null;
  jobName: string;
  businessDate: DateString;
  status: string;
  processedContracts: number;
  errorMessage: string | null;
}

// ── requestBodies · responses · 인라인 요청 본문 ───────────────────────────
/** requestBodies.Credentials — 비밀번호 12자 이상 */
export interface Credentials { email: string; password: string }
/** responses.Session */
export interface Session { token: string; expiresAt: DateTimeString; user: User }
/** PUT /me/password */
export interface PasswordChangeRequest { currentPassword: string; newPassword: string }
/** POST /learning/concepts/{conceptId}/quiz/attempts — answers: quizId → optionId */
export interface QuizAttemptRequest { contentVersion: number; answers: Record<string, number> }
/** GET /glossary 질의 */
export interface GlossaryQuery { category?: string; initial?: string; q?: string }
/** POST /sandbox/settlement-account/deposits */
export interface DepositRequest { amount: Money }
/** POST /sandbox/clock/advance */
export interface ClockAdvanceRequest { mode: ClockAdvanceMode; days?: number }
/** POST /sandbox/contracts/{id}/repayments */
export interface RepaymentRequest { amount: Money }
/** POST /sandbox/contracts/{id}/prepayments — 없으면 전액 */
export interface PrepaymentRequest { principalAmount?: Money | null }
/** POST /sandbox/notifications/read */
export interface NotificationsReadRequest { ids: number[] }
/** POST /admin/applications/{id}/override — reason 10자 이상 */
export interface AdminOverrideRequest { decision: Decision; amount?: Money; rate?: Rate; reason: string }
/** POST /admin/batch/daily-close */
export interface DailyCloseRequest { untilDate: DateString }

// ── admin content(콘텐츠 운영, 2026-10-30 계약 추가분. WP8) ────────────────
/** ContentStatus — 초안·게시·내림 */
export type ContentStatus = "DRAFT" | "PUBLISHED" | "RETIRED";
export type ContentEntityType = "CONCEPT" | "QUIZ" | "TERM";
export type ContentRevisionAction = "DRAFT" | "PUBLISH" | "RETIRE";
/** TermDraft.category 열거형 */
export type TermCategory = "업무" | "금리" | "상환" | "심사" | "연체" | "건전성" | "리스";
/** ContentSource — 공식 기관 URL만 */
export interface ContentSource { title: string; url: string; checkedOn: DateString }
export interface QuizDraftOption {
  /** 기존 선택지면 id, 새 선택지면 null */
  id?: number | null;
  text: string;
  correct: boolean;
  feedback?: string;
}
/** QuizDraft — 선택지 4개, 정답은 정확히 1개 */
export interface QuizDraft {
  /** 기존 문항이면 id, 새 문항이면 null */
  id?: number | null;
  question: string;
  options: QuizDraftOption[];
  explanation: string;
  nextAction?: string | null;
}
export interface FigureNode { id: string; label: string; kind?: string }
export interface FigureEdge { from: string; to: string; label?: string }
/** Figure — 개념 그림. ConceptDiagram이 노드·엣지로 그린다 */
export interface Figure { id: string; title: string; nodes: FigureNode[]; edges: FigureEdge[] }
/** ContentNumber — 본문 수치. statutory는 출처·확인일, assumption은 표기 */
export interface ContentNumber { label: string; value: string; kind: "statutory" | "assumption"; note?: string | null; sourceUrl?: string | null; checkedOn?: string | null }
export interface ConceptDraftSection { heading: string; body: string; figure?: string | null }
/** ConceptDraft — 초안 저장 본문. 학습 화면의 Concept과 같은 필드 + 문항 */
export interface ConceptDraft {
  orderNo: number;
  title: string;
  summary: string;
  sections: ConceptDraftSection[];
  misconceptions?: Misconception[];
  checklist?: string[];
  linkedCalculator?: LinkedCalculator | null;
  sandboxTask?: string | null;
  /** 그림(노드·엣지). 저장 시 응답 값을 그대로 보존한다 */
  figures?: Figure[];
  /** 본문 수치(제도 수치·가정값) */
  numbers?: ContentNumber[];
  relatedTermSlugs?: string[];
  /** 1개 이상 */
  sources: ContentSource[];
  /** 1개 이상 */
  quizzes: QuizDraft[];
}
export interface AdminConceptSummary {
  id: string;
  orderNo: number;
  title: string;
  status: ContentStatus;
  contentVersion: number;
  hasDraft: boolean;
  quizCount: number;
  publishedAt: DateTimeString | null;
  updatedAt: DateTimeString;
}
export interface AdminConcept extends ConceptDraft {
  id: string;
  status: ContentStatus;
  contentVersion: number;
  /** 응답이 초안이면 true */
  hasDraft: boolean;
  publishedAt: DateTimeString | null;
  updatedAt: DateTimeString;
}
/** TermDraft — 용어 초안 저장 본문 */
export interface TermDraft {
  term: string;
  english?: string | null;
  category: TermCategory;
  definition: string;
  formula?: string | null;
  example?: string | null;
  caution?: string | null;
  relatedSlugs?: string[];
  conceptIds?: string[];
  sourceUrl: string;
  sourceCheckedOn: DateString;
}
export interface AdminTermSummary {
  slug: string;
  term: string;
  category: string;
  status: ContentStatus;
  contentVersion: number;
  hasDraft: boolean;
  updatedAt: DateTimeString;
}
export interface AdminTerm extends TermDraft {
  slug: string;
  status: ContentStatus;
  contentVersion: number;
  hasDraft: boolean;
  updatedAt: DateTimeString;
}
export interface ContentValidationItem {
  entityType: ContentEntityType;
  entityId: string;
  field?: string | null;
  message: string;
}
export interface ContentValidationReport {
  valid: boolean;
  checkedAt: DateTimeString;
  conceptCount: number;
  quizCount: number;
  termCount: number;
  problems: ContentValidationItem[];
}
/** ContentValidationError — Error + problems(422 본문) */
export interface ContentValidationError extends Error {
  code: "CONTENT_INVALID";
  problems: ContentValidationItem[];
}
export interface ContentRevision {
  id: number;
  entityType: ContentEntityType;
  entityId: string;
  action: ContentRevisionAction;
  actorEmail: string;
  contentVersion: number | null;
  createdAt: DateTimeString;
  snapshot: Record<string, unknown>;
}
/** GET /admin/applications 질의 */
export interface AdminApplicationsQuery { status?: string; page?: number }
/** GET /admin/content/revisions 질의 — limit 기본 50, 최대 200 */
export interface ContentRevisionsQuery { entityType?: ContentEntityType; entityId?: string; limit?: number }
/** GET /admin/batch/executions 질의 */
export interface BatchExecutionsQuery { sandboxId?: number }
