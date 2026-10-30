/**
 * VITE_MOCK=1 분기. client.ts가 네트워크 대신 이 함수를 부른다. 외부 라이브러리 없이 메서드·경로를 맞춰 고정 응답을 돌려준다.
 * 가입·로그인은 메모리에 사용자를 들고, 토큰은 "mock-<userId>"다. 응답은 120~250ms 뒤에 돌려 로딩 문구가 보이게 한다.
 * WP6~8은 자기 영역의 응답이 더 필요하면 이 파일에 경로를 추가하거나 fixtures를 확장한다.
 */
import type { Credentials, Error as ApiErrorBody, Session, User } from "../types";
import * as F from "./fixtures";
import { mockLearn } from "./learn-fixtures";
import { mockAdmin } from "./admin";
import { mockLab } from "./lab-fixtures";

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
  // ── calculators · sandbox — WP7 영역은 lab-fixtures.ts 의 규칙 엔진이 응답한다(골든 값·메모리 상태·일마감).
  const lab = mockLab(method, pathname, params, body, me, ok, fail);
  if (lab) return lab;

  // ── admin — 운영 콘솔 응답은 mock/admin.ts(WP8)가 맡는다. 권한 확인만 여기서 한다.
  if (pathname.startsWith("/admin")) {
    const denied = requireAdmin(); if (denied) return denied;
    const handled = mockAdmin(method, pathname, params, body, me!, ok, fail);
    if (handled) return handled;
  }

  return fail(404, "NOT_FOUND", `mock에 ${method} ${pathname} 응답이 없어요. src/api/mock/index.ts에 추가해요.`);
}
