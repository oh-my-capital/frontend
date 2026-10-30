/**
 * VITE_MOCK=1 분기. client.ts가 네트워크 대신 이 함수를 부른다. 외부 라이브러리 없이 메서드·경로를 맞춰 고정 응답을 돌려준다.
 * 가입·로그인은 메모리에 사용자를 들고, 토큰은 "mock-<userId>"다. 응답은 120~250ms 뒤에 돌려 로딩 문구가 보이게 한다.
 * WP6~8은 자기 영역의 응답이 더 필요하면 이 파일에 경로를 추가하거나 fixtures를 확장한다.
 */
import type { Credentials, Error as ApiErrorBody, Session, User } from "../types";
import * as F from "./fixtures";
import { mockAdmin } from "./admin";

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
  if (key === "GET /me/learning") return requireLogin() ?? ok(F.MY_LEARNING);

  // ── learning · glossary · methodology
  if (key === "GET /learning/concepts") return ok(F.CONCEPTS);
  let m = pathname.match(/^\/learning\/concepts\/([^/]+)(\/quiz(\/attempts)?)?$/);
  if (m) {
    const concept = F.CONCEPTS.find(c => c.id === m![1]);
    if (!concept) return fail(404, "NOT_FOUND", "그 개념을 찾지 못했어요. 입문 과정 목차에서 다시 골라요.");
    if (!m[2] && method === "GET") return ok(F.conceptDetail(concept));
    if (m[2] === "/quiz" && method === "GET") return ok(F.quizFor(concept.id));
    if (m[3] && method === "POST") {
      const { contentVersion, answers } = body as { contentVersion: number; answers: Record<string, number> };
      if (contentVersion !== 1) return fail(409, "CONFLICT", "문제 내용이 바뀌었어요. 문제를 다시 불러와요.");
      const quiz = F.quizFor(concept.id);
      const items = quiz.questions.map(q => {
        const selected = answers[String(q.id)] ?? 0;
        const correct = selected === 1;
        return { quizId: q.id, correct, selectedOptionId: selected, correctOptionId: 1, feedback: correct ? "맞았어요." : "다시 생각해 봐요.", explanation: "선택지 1이 정답인 이유를 설명하는 해설이다.", nextAction: correct ? "다음 문제로 가요." : "개념 본문의 정의 절을 다시 읽어요." };
      });
      const score = Math.round(items.filter(i => i.correct).length / items.length * 100);
      return ok({ score, passed: score >= 80, saved: !!me, items });
    }
  }
  if (key === "GET /glossary") {
    const q = params.get("q")?.trim().toLowerCase();
    const category = params.get("category");
    const initial = params.get("initial");
    let terms = F.TERMS;
    if (category) terms = terms.filter(t => t.category === category);
    if (q) terms = terms.filter(t => t.term.toLowerCase().includes(q) || (t.english ?? "").toLowerCase().includes(q) || t.definition.includes(q));
    if (initial) terms = terms.filter(t => t.term.toUpperCase().startsWith(initial.toUpperCase()));
    return ok(terms);
  }
  m = pathname.match(/^\/glossary\/([^/]+)$/);
  if (m && method === "GET") {
    const term = F.TERMS.find(t => t.slug === m![1]);
    return term ? ok(F.termDetail(term)) : fail(404, "NOT_FOUND", "그 용어를 찾지 못했어요. 용어 사전에서 검색해요.");
  }
  if (key === "GET /methodology") return ok(F.METHODOLOGY);

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

  // ── admin — 운영 콘솔 응답은 mock/admin.ts(WP8)가 맡는다. 권한 확인만 여기서 한다.
  if (pathname.startsWith("/admin")) {
    const denied = requireAdmin(); if (denied) return denied;
    const handled = mockAdmin(method, pathname, params, body, me!, ok, fail);
    if (handled) return handled;
  }

  return fail(404, "NOT_FOUND", `mock에 ${method} ${pathname} 응답이 없어요. src/api/mock/index.ts에 추가해요.`);
}
