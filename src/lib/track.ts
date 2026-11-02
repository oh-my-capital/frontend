import { IS_MOCK } from "../api/client";

/**
 * 퍼스트파티 익명 화면 조회 기록(FR-61, docs business-rules "WP40 — 서비스 지표", ADR-033).
 * - 보내는 것: 브라우저가 만든 난수 방문 ID + `page_view` + 경로(pathname). 쿼리·해시·제목·계정 정보는 보내지 않는다.
 *   서버가 경로를 라우트 패턴(`/learn/:conceptId`)으로 바꿔 저장한다. 운영 화면(`/admin`)은 보내지 않는다.
 * - 방문 ID 는 localStorage(`capimate.visitor`). 저장소를 못 쓰면 이 탭이 열려 있는 동안만 메모리에 둔다. 로그인 토큰과 잇지 않는다
 *   (Authorization 헤더를 붙이지 않는다).
 * - Do Not Track·Global Privacy Control 이 켜져 있으면 아무것도 보내지 않는다. 목업 모드(VITE_MOCK=1)도 보내지 않는다.
 * - 큐에 모았다가 20건이 차거나 5초가 지나거나 화면을 떠날 때 `navigator.sendBeacon`(문자열 = text/plain, 사전 요청 없음)으로 보내고,
 *   안 되면 `fetch keepalive`. 실패는 조용히 버린다 — 지표 때문에 화면이 멈추거나 오류를 보이면 안 된다.
 * - 경로가 바뀐 뒤 0.5초 안에 또 바뀌면(리다이렉트 `<Navigate replace>`·로그인 이동) 앞 경로는 세지 않는다.
 */
const ENDPOINT = `${import.meta.env.VITE_API_BASE_URL ?? "/api"}/events`;
const VISITOR_KEY = "capimate.visitor";
const VISITOR_PATTERN = /^[A-Za-z0-9-]{16,64}$/;
/** 서버 상한(규칙 세트 insight.maxBatchEvents)과 같다. 넘으면 서버가 400 으로 통째로 버린다. */
const MAX_BATCH = 20;
const MAX_PATH = 200;
const SETTLE_MS = 500;
const FLUSH_MS = 5000;

interface TrackEvent { type: "page_view"; path: string }

const queue: TrackEvent[] = [];
let memoryVisitor: string | null = null;
let pendingPath: string | null = null;
let pendingTimer: ReturnType<typeof setTimeout> | null = null;
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let listening = false;

type PrivacyNavigator = Navigator & { globalPrivacyControl?: boolean; msDoNotTrack?: string };

/** 추적 거부(DNT·GPC)·목업이면 false. */
export function trackingAllowed(): boolean {
  if (IS_MOCK || typeof navigator === "undefined") return false;
  const nav = navigator as PrivacyNavigator;
  const dnt = nav.doNotTrack ?? (window as Window & { doNotTrack?: string }).doNotTrack ?? nav.msDoNotTrack;
  if (dnt === "1" || dnt === "yes") return false;
  return nav.globalPrivacyControl !== true;
}

function newVisitorId(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  // randomUUID 는 보안 컨텍스트(https·localhost)에서만 있다. 없으면 같은 난수원에서 32자 hex.
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, b => b.toString(16).padStart(2, "0")).join("");
}

function visitorId(): string {
  try {
    const saved = localStorage.getItem(VISITOR_KEY);
    if (saved && VISITOR_PATTERN.test(saved)) return saved;
    const created = newVisitorId();
    localStorage.setItem(VISITOR_KEY, created);
    return created;
  } catch {
    memoryVisitor ??= newVisitorId();
    return memoryVisitor;
  }
}

function send(body: string) {
  try {
    if (typeof navigator.sendBeacon === "function" && navigator.sendBeacon(ENDPOINT, body)) return;
    void fetch(ENDPOINT, { method: "POST", body, keepalive: true, credentials: "omit", headers: { "Content-Type": "text/plain" } }).catch(() => undefined);
  } catch {
    /* 지표 전송 실패는 무시한다 */
  }
}

/** 큐를 20건씩 보낸다. */
export function flushEvents() {
  if (flushTimer) { clearTimeout(flushTimer); flushTimer = null; }
  while (queue.length > 0) {
    const batch = queue.splice(0, MAX_BATCH);
    send(JSON.stringify({ visitorId: visitorId(), events: batch }));
  }
}

function commitPending() {
  if (pendingTimer) { clearTimeout(pendingTimer); pendingTimer = null; }
  if (pendingPath === null) return;
  queue.push({ type: "page_view", path: pendingPath });
  pendingPath = null;
  if (queue.length >= MAX_BATCH) flushEvents();
  else if (!flushTimer) flushTimer = setTimeout(flushEvents, FLUSH_MS);
}

function listenForLeave() {
  if (listening) return;
  listening = true;
  const leave = () => { commitPending(); flushEvents(); };
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") leave(); });
  window.addEventListener("pagehide", leave);
}

/** 라우트가 바뀔 때 공통 틀(Layout)이 한 번 부른다. 다른 화면은 부르지 않는다. */
export function trackPageView(pathname: string) {
  if (!trackingAllowed()) return;
  if (pendingTimer) { clearTimeout(pendingTimer); pendingTimer = null; }
  const lower = pathname.toLowerCase();
  if (lower === "/admin" || lower.startsWith("/admin/") || pathname.length > MAX_PATH) {
    pendingPath = null;
    return;
  }
  listenForLeave();
  pendingPath = pathname;
  pendingTimer = setTimeout(commitPending, SETTLE_MS);
}
