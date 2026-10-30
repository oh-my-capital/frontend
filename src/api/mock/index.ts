/**
 * VITE_MOCK=1 분기. client.ts가 네트워크 대신 이 함수를 부른다. 외부 라이브러리 없이 메서드·경로를 맞춰 고정 응답을 돌려준다.
 * 가입·로그인은 메모리에 사용자를 들고, 토큰은 "mock-<userId>"다. 응답은 120~250ms 뒤에 돌려 로딩 문구가 보이게 한다.
 * WP6~8은 자기 영역의 응답이 더 필요하면 이 파일에 경로를 추가하거나 fixtures를 확장한다.
 */
import type { Credentials, Error as ApiErrorBody, Session, User } from "../types";
import * as F from "./fixtures";
import { mockLearn } from "./learn-fixtures";

export interface MockResult { status: number; body: unknown; requestId: string }

const registry = new Map<string, { user: User; password: string }>(
  F.USERS.map(user => [user.email, { user, password: "capimate-demo-2026" }]),
);
let nextUserId = 100;
let requestCounter = 0;

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const requestId = () => `mock-${String(++requestCounter).padStart(4, "0")}`;

function ok(body: unknown, status = 200): MockResult { return { status, body, requestId: requestId() }; }
function fail(status: number, code: string, message: string, details?: ApiErrorBody["details"]): MockResult {
  const id = requestId();
  return { status, body: { code, message, requestId: id, details } satisfies ApiErrorBody, requestId: id };
}

function userFromToken(token: string | null): User | null {
  if (!token?.startsWith("mock-")) return null;
  const id = Number(token.slice(5));
  for (const entry of registry.values()) if (entry.user.id === id) return entry.user;
  return null;
}
function session(user: User): Session {
  const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  return { token: `mock-${user.id}`, expiresAt: expires, user };
}

export async function mockFetch(method: string, path: string, body: unknown, token: string | null): Promise<MockResult> {
  await sleep(120 + Math.random() * 130);
  const [pathname, search = ""] = path.split("?");
  const params = new URLSearchParams(search);
  const me = userFromToken(token);
  const requireLogin = (): MockResult | null => (me ? null : fail(401, "UNAUTHORIZED", "로그인이 필요해요. 다시 로그인한 뒤 시도해요."));
  const requireAdmin = (): MockResult | null => requireLogin() ?? (me?.role === "ADMIN" ? null : fail(403, "FORBIDDEN", "운영자만 볼 수 있는 화면이에요."));
  const key = `${method} ${pathname}`;

  // ── auth · me
  if (key === "POST /auth/signup") {
    const { email, password } = body as Credentials;
    if (!email || !password || password.length < 12) return fail(400, "VALIDATION", "비밀번호는 12자 이상이어야 해요.", [{ field: "password", message: "12자 이상" }]);
    if (registry.has(email)) return fail(409, "CONFLICT", "이미 가입된 이메일이에요. 로그인하거나 다른 이메일을 써요.");
    const user: User = { id: nextUserId++, email, role: "USER" };
    registry.set(email, { user, password });
    return ok(session(user), 201);
  }
  if (key === "POST /auth/login") {
    const { email, password } = body as Credentials;
    const entry = registry.get(email);
    if (!entry || entry.password !== password) return fail(401, "UNAUTHORIZED", "이메일 또는 비밀번호가 맞지 않아요. 다시 확인해요.");
    return ok(session(entry.user));
  }
  if (key === "POST /auth/logout") return ok(undefined, 204);
  if (key === "GET /auth/me") return requireLogin() ?? ok(me);
  if (key === "PUT /me/password") {
    const denied = requireLogin(); if (denied) return denied;
    const { currentPassword, newPassword } = body as { currentPassword: string; newPassword: string };
    const entry = registry.get(me!.email)!;
    if (entry.password !== currentPassword) return fail(400, "VALIDATION", "현재 비밀번호가 맞지 않아요.", [{ field: "currentPassword", message: "불일치" }]);
    if (!newPassword || newPassword.length < 12) return fail(400, "VALIDATION", "새 비밀번호는 12자 이상이어야 해요.", [{ field: "newPassword", message: "12자 이상" }]);
    entry.password = newPassword;
    return ok(undefined, 204);
  }
  if (key === "DELETE /me") {
    const denied = requireLogin(); if (denied) return denied;
    if (me!.role === "ADMIN") return fail(403, "FORBIDDEN", "관리자 계정은 탈퇴할 수 없어요.");
    registry.delete(me!.email);
    return ok(undefined, 204);
  }

  // ── learning · glossary · methodology · me/learning — WP6 영역은 learn-fixtures.ts 가 응답한다(콘텐츠·채점·메모리 진척).
  const learn = mockLearn(method, pathname, params, body, me);
  if (learn) return learn;
  let m: RegExpMatchArray | null;

  // ── calculators
  if (key === "POST /calculators/schedule") {
    const req = body as Parameters<typeof F.scheduleResponse>[0];
    if (!req || req.principal < 1_000_000 || req.termMonths < 1) return fail(400, "VALIDATION", "원금은 100만 원 이상, 기간은 1회 이상이어야 해요.");
    return ok(F.scheduleResponse(req));
  }
  if (key === "POST /calculators/screening") return ok(F.SCREENING_EXAMPLE_6);
  if (key === "POST /calculators/prepayment") return ok(F.PREPAYMENT_EXAMPLE_5);

  // ── sandbox
  if (key === "GET /sandbox/products") return ok(F.PRODUCTS);
  if (pathname.startsWith("/sandbox")) {
    const denied = requireLogin(); if (denied) return denied;
    if (key === "GET /sandbox") return ok(F.SANDBOX);
    if (key === "PUT /sandbox/profile") return ok(body);
    if (key === "POST /sandbox/settlement-account/deposits") {
      const { amount } = body as { amount: number };
      return ok({ id: 2, businessDate: F.SANDBOX.businessDate, type: "DEPOSIT", amount, balanceAfter: F.SANDBOX.settlementBalance + amount, contractNo: null }, 201);
    }
    if (key === "GET /sandbox/settlement-account/ledger") return ok(F.LEDGER);
    if (key === "POST /sandbox/clock/advance") {
      const { mode, days } = body as { mode: string; days?: number };
      const advanced = mode === "ONE_DAY" ? 1 : mode === "DAYS" ? (days ?? 1) : 32;
      return ok({ fromDate: "2026-01-15", toDate: mode === "NEXT_DUE_DATE" ? "2026-02-17" : "2026-01-16", daysAdvanced: advanced, executions: F.BATCH_EXECUTIONS, newEvents: [], newNotifications: 0, sandbox: F.SANDBOX });
    }
    if (key === "GET /sandbox/applications") return ok([F.APPLICATION]);
    if (key === "POST /sandbox/applications") return ok(F.APPLICATION, 201);
    m = pathname.match(/^\/sandbox\/applications\/(\d+)(\/(accept|cancel|execute))?$/);
    if (m) {
      if (m[1] !== "1") return fail(404, "NOT_FOUND", "그 신청을 찾지 못했어요.");
      if (m[3] === "execute") return ok(F.CONTRACT, 201);
      if (m[3] === "accept") return fail(409, "CONFLICT", "조건부 승인 건만 수락할 수 있어요.");
      if (m[3] === "cancel") return fail(409, "CONFLICT", "이미 실행된 신청은 취소할 수 없어요.");
      return ok(F.APPLICATION);
    }
    if (key === "GET /sandbox/contracts") return ok([F.CONTRACT_SUMMARY]);
    m = pathname.match(/^\/sandbox\/contracts\/(\d+)(?:\/([a-z-]+))?$/);
    if (m) {
      if (m[1] !== "1") return fail(404, "NOT_FOUND", "그 계약을 찾지 못했어요.");
      switch (m[2]) {
        case undefined: return ok(F.CONTRACT);
        case "schedules": return ok(F.CONTRACT_SCHEDULE);
        case "transactions": return ok(F.TRANSACTIONS);
        case "events": return ok(F.EVENTS);
        case "provisions": return ok(F.PROVISIONS);
        case "repayments": return fail(400, "NOTHING_DUE", "지금은 갚을 미납분이 없어요. 다음 납입일까지 시간을 진행해요.");
        case "prepayment-quote": return ok({ ...F.PREPAYMENT_EXAMPLE_5, asOf: F.SANDBOX.businessDate, outstandingPrincipal: 10_000_000, principalAmount: 10_000_000 });
        case "prepayments": return fail(409, "INSUFFICIENT_BALANCE", "결제계좌 잔액이 부족해요. 입금 후 다시 시도해요.");
      }
    }
    if (key === "GET /sandbox/notifications") return ok(params.get("unreadOnly") === "true" ? F.NOTIFICATIONS.filter(n => !n.read) : F.NOTIFICATIONS);
    if (key === "POST /sandbox/notifications/read") return ok(undefined, 204);
  }

  // ── admin
  if (pathname.startsWith("/admin")) {
    const denied = requireAdmin(); if (denied) return denied;
    if (key === "GET /admin/applications") return ok(F.ADMIN_APPLICATIONS);
    if (/^\/admin\/applications\/\d+\/override$/.test(pathname) && method === "POST") {
      const req = body as { decision: string; reason: string };
      if (!req.reason || req.reason.length < 10) return fail(400, "VALIDATION", "변경 사유를 10자 이상 적어요.", [{ field: "reason", message: "10자 이상" }]);
      return ok({ ...F.APPLICATION, status: req.decision, overrides: [{ beforeDecision: "APPROVED", afterDecision: req.decision, afterAmount: null, reason: req.reason, createdAt: new Date().toISOString() }] });
    }
    if (key === "GET /admin/portfolio") return ok(F.PORTFOLIO);
    if (key === "POST /admin/batch/daily-close") return ok(F.BATCH_EXECUTIONS);
    if (key === "GET /admin/batch/executions") return ok(F.BATCH_EXECUTIONS);
    if (key === "GET /admin/content/concepts") return ok(F.CONCEPTS.map(c => ({ ...c, status: "PUBLISHED", contentVersion: 1 })));
    if (key === "GET /admin/content/terms") return ok(F.TERMS.map(t => ({ ...t, status: "PUBLISHED", contentVersion: 1 })));
    if (key === "GET /admin/content/revisions") return ok([]);
    if (/^\/admin\/content\/(concepts|terms)\/[^/]+(\/publish)?$/.test(pathname)) return ok({ saved: true });
  }

  return fail(404, "NOT_FOUND", `mock에 ${method} ${pathname} 응답이 없어요. src/api/mock/index.ts에 추가해요.`);
}
