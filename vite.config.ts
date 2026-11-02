import react from "@vitejs/plugin-react";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig, loadEnv, type Plugin } from "vite";
import { OG_IMAGE_PATH, normalizeSiteUrl, sitemapPaths } from "./src/components/pageMeta.ts";

// 런타임 계약(docs/contracts/runtime.md): 프런트 dev 5190, 백엔드 8090, 프록시 /api → 백엔드.
// 백엔드를 다른 주소에 띄웠으면 API_PROXY_TARGET으로 바꾼다. 화면 코드는 항상 같은 origin의 /api만 부른다.
const apiProxyTarget = process.env.API_PROXY_TARGET ?? "http://localhost:8090";
const proxy = { "/api": { target: apiProxyTarget, changeOrigin: true } };

/**
 * 검색용 파일(NFR-21, WP39). 사이트 주소는 빌드 환경변수 VITE_SITE_URL(예: https://<배포 주소>) 하나로 받는다.
 * - 있으면: dist/sitemap.xml 생성(pageMeta.ts 의 공개 고정 경로), dist/robots.txt 끝에 Sitemap 줄, index.html 에 canonical·og:url·og:image 절대 주소.
 * - 없으면: 셋 다 만들지 않는다(sitemap·OG 는 절대 주소가 필요하다). 공개 저장소이므로 실제 도메인을 코드에 적지 않는다.
 * 화면별 메타는 브라우저에서 components/PageTitle.tsx 가 맞춘다.
 */
function seoFiles(siteUrl: string): Plugin {
  let outDir = "dist";
  return {
    name: "capimate-seo-files",
    apply: "build",
    configResolved(config) { outDir = resolve(config.root, config.build.outDir); },
    transformIndexHtml() {
      if (!siteUrl) return [];
      return [
        { tag: "link", attrs: { rel: "canonical", href: `${siteUrl}/` }, injectTo: "head" },
        { tag: "meta", attrs: { property: "og:url", content: `${siteUrl}/` }, injectTo: "head" },
        { tag: "meta", attrs: { property: "og:image", content: `${siteUrl}${OG_IMAGE_PATH}` }, injectTo: "head" },
      ];
    },
    generateBundle() {
      if (!siteUrl) return;
      const urls = sitemapPaths().map(path => `  <url><loc>${escapeXml(`${siteUrl}${path === "/" ? "/" : path}`)}</loc></url>`);
      this.emitFile({
        type: "asset",
        fileName: "sitemap.xml",
        source: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>\n`,
      });
    },
    // public/robots.txt 는 번들을 쓰기 전에 dist 로 복사된다(vite prepareOutDir). 다 쓴 뒤에 Sitemap 줄을 붙인다.
    closeBundle() {
      const robots = resolve(outDir, "robots.txt");
      if (!siteUrl || !existsSync(robots)) return;
      const text = readFileSync(robots, "utf8");
      if (!/^Sitemap:/m.test(text)) writeFileSync(robots, `${text.trimEnd()}\n\nSitemap: ${siteUrl}/sitemap.xml\n`);
    },
  };
}

function escapeXml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export default defineConfig(({ mode }) => {
  const siteUrl = normalizeSiteUrl(loadEnv(mode, process.cwd(), "VITE_").VITE_SITE_URL);
  return {
    plugins: [react(), seoFiles(siteUrl)],
    server: { port: 5190, strictPort: true, proxy },
    preview: { port: 5190, strictPort: true, proxy },
  };
});
