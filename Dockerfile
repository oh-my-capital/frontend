# CapiMATE 웹 정적 이미지(WP38, NFR-20). 빌드 컨텍스트는 이 저장소 루트다.
#   docker build -t capimate-web:<태그> .
# 1단계: Node 로 정적 파일(dist)을 만든다. 2단계: Caddy 가 dist 를 8080 에서 서빙한다(SPA fallback).
# TLS·/api 프록시는 이 이미지가 아니라 앞단 프록시(infra deploy/Caddyfile)가 맡는다.
# 공개 저장소다. 내부 주소·비밀값을 build-arg 로 넣지 않는다(VITE_ 값은 번들에 그대로 실린다).

# 빌드 스테이지는 빌드 기기 아키텍처로 돈다(산출물이 아키텍처와 무관한 정적 파일이라 교차 빌드가 빠르다).
FROM --platform=$BUILDPLATFORM node:22.23.3-alpine AS build
WORKDIR /app
# 의존성 캐시를 살리려고 잠금 파일을 먼저 복사한다.
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
# 화면 코드는 같은 origin 의 /api 만 부른다(docs contracts/runtime.md). mock 은 배포 빌드에서 끈다.
ENV VITE_API_BASE_URL=/api \
    VITE_MOCK=
RUN npm run build

# 실행 스테이지: Caddy(정적 파일 서버). 관리 API·자동 HTTPS 는 끈다(deploy/Caddyfile).
FROM caddy:2.11.7-alpine
# 비루트 사용자로 8080 을 연다. Caddy 가 쓰는 /data·/config 만 그 사용자에게 준다.
RUN addgroup -S -g 10001 web && adduser -S -D -H -u 10001 -G web web \
    && chown -R web:web /data /config
COPY deploy/Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/dist /srv
USER 10001
EXPOSE 8080
HEALTHCHECK --interval=15s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:8080/ || exit 1
