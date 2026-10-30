import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// 런타임 계약(docs/contracts/runtime.md): 프런트 dev 5190, 백엔드 8090, 프록시 /api → 백엔드.
// 백엔드를 다른 주소에 띄웠으면 API_PROXY_TARGET으로 바꾼다. 화면 코드는 항상 같은 origin의 /api만 부른다.
const apiProxyTarget = process.env.API_PROXY_TARGET ?? "http://localhost:8090";
const proxy = { "/api": { target: apiProxyTarget, changeOrigin: true } };

export default defineConfig({
  plugins: [react()],
  server: { port: 5190, strictPort: true, proxy },
  preview: { port: 5190, strictPort: true, proxy },
});
