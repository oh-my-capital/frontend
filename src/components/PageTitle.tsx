import { useEffect } from "react";
import { matchPath, useLocation } from "react-router-dom";
import { BRAND_NAME } from "./Brand";
import { NAV_MENUS, SUBPAGE_SECTIONS } from "./nav";
import { OG_IMAGE_ALT, OG_IMAGE_PATH, PAGE_META, SITE_DESCRIPTION, normalizeSiteUrl, type PageMeta } from "./pageMeta";

/**
 * 경로별 문서 메타(docs/design/screens.md, WP39 메타 정책). 라우트가 바뀔 때 다음을 맞춘다.
 * - `<title>`: "화면 제목 · CapiMATE"
 * - `<meta name="description">`, Open Graph(og:title·description·type·url·image·site_name·locale), twitter:card
 * - `<link rel="canonical">`: 사이트 주소 + 경로(쿼리 없음). 검색 노출 화면에만 둔다.
 * - `<meta name="robots">`: 로그인 필요·운영·가입 흐름·없는 주소는 "noindex, nofollow"(로그인·가입은 "noindex, follow").
 * 화면 표는 pageMeta.ts. 화면 안에서 더 구체적인 제목(개념 이름 등)이 필요하면 setDocumentTitle 을 부른다.
 * 사이트 주소는 빌드 환경변수 VITE_SITE_URL, 없으면 지금 접속한 origin 을 쓴다(실제 도메인을 코드에 적지 않는다).
 */
export default function PageTitle() {
  const { pathname } = useLocation();
  useEffect(() => { applyPageMeta(pathname); }, [pathname]);
  return null;
}

/** 화면 안에서 제목을 더 구체적으로 바꾼다(문서 제목과 og:title 을 함께). description 을 주면 설명도 바꾼다. */
export function setDocumentTitle(title: string, description?: string) {
  const full = `${title} · ${BRAND_NAME}`;
  document.title = full;
  setMeta("property", "og:title", full);
  if (description) {
    setMeta("name", "description", description);
    setMeta("property", "og:description", description);
  }
}

const LOGIN_FLOW = new Set(["/login", "/signup"]);

function findMeta(pathname: string): PageMeta | null {
  return PAGE_META.find(meta => matchPath({ path: meta.path, end: true }, pathname))
    ?? navFallback(pathname)
    // 하위 경로(다른 WP가 더한 상세 등)는 가장 먼저 맞는 상위 경로의 제목을 쓰되 검색에는 내지 않는다. 홈("/")은 제외.
    ?? withNoindex(PAGE_META.find(meta => meta.path !== "/" && matchPath({ path: meta.path, end: false }, pathname)));
}

/** pageMeta.ts 에 아직 없는 화면(다른 WP가 메뉴에만 등록한 경로)은 메뉴 이름을 제목으로, noindex 로 둔다. */
function navFallback(pathname: string): PageMeta | null {
  const links = [
    ...NAV_MENUS.flatMap(menu => menu.groups.flatMap(group => group.links)),
    ...Object.values(SUBPAGE_SECTIONS).flatMap(section => section.links),
  ];
  const link = links.find(item => item.to === pathname);
  return link ? { path: link.to, title: link.label, index: false } : null;
}

function withNoindex(meta: PageMeta | undefined): PageMeta | null {
  return meta ? { ...meta, index: false } : null;
}

function siteOrigin(): string {
  return normalizeSiteUrl(import.meta.env.VITE_SITE_URL) || window.location.origin;
}

function applyPageMeta(pathname: string) {
  const meta = findMeta(pathname);
  const title = `${meta ? meta.title : "없는 주소"} · ${BRAND_NAME}`;
  const description = meta?.description ?? SITE_DESCRIPTION;
  const site = siteOrigin();
  const url = `${site}${pathname}`;
  const indexable = meta?.index ?? false;

  document.title = title;
  setMeta("name", "description", description);
  setMeta("name", "robots", indexable ? "index, follow" : LOGIN_FLOW.has(pathname) ? "noindex, follow" : "noindex, nofollow");
  setMeta("property", "og:site_name", BRAND_NAME);
  setMeta("property", "og:locale", "ko_KR");
  setMeta("property", "og:type", "website");
  setMeta("property", "og:title", title);
  setMeta("property", "og:description", description);
  setMeta("property", "og:url", url);
  setMeta("property", "og:image", `${site}${OG_IMAGE_PATH}`);
  setMeta("property", "og:image:alt", OG_IMAGE_ALT);
  setMeta("name", "twitter:card", "summary_large_image");
  setCanonical(indexable ? url : null);
}

/** `<meta name|property=key>` 를 하나만 두고 값을 바꾼다(없으면 만든다). */
function setMeta(attr: "name" | "property", key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

/** canonical 은 검색 노출 화면에만. noindex 화면에서는 지워 신호가 엇갈리지 않게 한다. */
function setCanonical(href: string | null) {
  let el = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!href) { el?.remove(); return; }
  if (!el) {
    el = document.createElement("link");
    el.rel = "canonical";
    document.head.appendChild(el);
  }
  el.href = href;
}
