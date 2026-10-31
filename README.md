# CapiMATE 웹 · frontend

캐피탈(여신전문금융)을 배우는 교육용 모의 여신 서비스의 화면. React 19 + Vite + TypeScript, react-router 7, `@remixicon/react`, oxlint. **UI 라이브러리·Tailwind·차트 라이브러리를 쓰지 않는다**(ADR-015) — 표는 HTML `table`, 그림은 인라인 SVG로 직접 그린다. 디자인 기준은 docs `design/ui-guidelines.md` 하나다.

## 명령

Node 버전은 `.nvmrc`(22). 백엔드는 형제 저장소 `backend`가 8090에서 띄운다.

```sh
npm ci
npm run dev            # http://localhost:5190, /api → http://localhost:8090 프록시
VITE_MOCK=1 npm run dev  # 백엔드 없이 고정 응답으로 화면 확인
npm run lint           # oxlint
npm run build          # tsc -b && vite build → dist/
npm run preview        # dist/ 를 5190에서 확인
```

백엔드를 다른 주소에 띄웠으면 `API_PROXY_TARGET=http://localhost:8091 npm run dev`처럼 프록시 대상만 바꾼다. dev 서버 포트를 5190이 아닌 값으로 띄우면 **백엔드의 `FRONTEND_ORIGIN`에 그 origin도 넣어야 한다**(쉼표로 여러 개). 같은 origin의 `/api`로 보내도 브라우저가 `Origin` 헤더를 붙이고 vite 프록시가 그대로 넘기므로, 빠뜨리면 모든 POST가 403 `Invalid CORS request`가 된다.

## 환경변수

`.env.example`을 복사해 `.env.local`로 쓴다. `VITE_` 변수는 번들에 들어가므로 비밀값을 넣지 않는다.

| 변수 | 기본 | 설명 |
|---|---|---|
| `VITE_API_BASE_URL` | `/api` | API 경로. 배포도 같은 origin의 `/api`를 쓴다 |
| `VITE_MOCK` | (비움) | `1`이면 `src/api/mock/`의 고정 응답으로 동작 |
| `API_PROXY_TARGET` | `http://localhost:8090` | dev·preview 서버의 `/api` 프록시 대상(빌드에는 안 들어감) |

## 디자인 시스템 v3

색·글자 크기·간격 **리터럴을 CSS·JSX에 적지 않는다.** 필요하면 `styles/tokens.css`에 토큰을 먼저 만든다(ADR-017).
v3(ADR-019)는 시중 캐피탈 사이트 8곳의 역설계(docs `design/rea-capital-sites.md`) 결론으로 머리·바닥·하위 화면 머리·홈을 다시 짰다.
**메뉴는 `src/components/nav.ts` 한 파일**이 정의하고 머리 메가 메뉴·모바일 드로어·바닥 바로가기·`SubPageHeader` 위치 표시와 탭이 모두 읽는다.
새 화면을 메뉴에 넣을 때는 `nav.ts`만 고친다.

```text
styles/
├── tokens.css   색(면·글자·선·남색·황토·상태·건전성 5단계·그림 계열)
│                글자 사다리 --fs-micro(12) ~ --fs-display, 굵기·줄간격·자간
│                4px 눈금 --sp-1 ~ --sp-12, 선 --rule/--rule-heavy/--rule-accent, --radius 0
│                크기 --touch(44) --control-h(48) --content-w, 모션 --t-fast/--t-base
│                v3: --utility-h --header-row-h --gnb-brand-w(메가 메뉴 격자) --fs-wordmark
│                    --shadow-overlay --z-header/--z-overlay --banner-* --measure
├── base.css     리셋·타이포·Pretendard @font-face·레이아웃·공용 조각
│                .panel .panel-head .section-head .figure-row .tabs/.tabpanel
│                .progress-bar .bar-cell/.bar-track .table .status-* .state-box
│                .disclosure .fold .stepper .timeline .figure-frame .forbidden-panel
├── charts.css   .chart(겉틀) .chart-row .chart-legend .chart-summary .chart-data
│                .chart-grid/-axis/-line/-area/-dot/-value .ladder-* .mixbar-*
├── brand.css    워드마크·머리(유틸리티 줄 + 메가 메뉴 + 1100px 이하 드로어)·바닥·SubPageHeader
└── home · account · learn · glossary · calculators · sandbox · admin   화면별 규칙만
```

공용 컴포넌트(`src/components/`): `nav.ts`(메뉴 정의) `Layout`(본문 바로가기 포함) `Header` `SiteFooter` `Brand` `Icon` `PageTitle` `SubPageHeader`
`ProtectedRoute`(+`ForbiddenPage`) `Loading` `LoadError` `EmptyState` `Tabs`(+`FilterGroup`) `ProgressBar`
`Stepper` `Timeline` `DataTable` `StatusChip` `Money` `MoneyInput` `RateInput` `Disclosure` `ConceptDiagram`.

그림(`src/components/charts/`)은 모두 `ChartShell`을 통과한다 — 머리글 → SVG → 범례 → **한 문장 요약** → **접힌 값 표**(ADR-018).

| 컴포넌트 | 무엇을 보여 주나 |
|---|---|
| `AmortizationChart` | 회차별 납입액 구성(원금·이자 쌓은 막대) + 잔액 선 |
| `LimitLadder` | 한도 결정 요소를 같은 자로 잰 가로 막대 + 병목 강조 |
| `RateWaterfall` | 기준금리 → 가산 → 우대 → 적용 금리 계단 |
| `MixBar` | 100% 구성 막대(건전성 분포, 변제충당 분해) |
| `TrendChart` | 월별 추이 선 + 채움 + 기준선 |
| `FeeTrendChart` | 잔존기간별 중도상환수수료 추이 |

## 서체·이미지

- `public/fonts/Pretendard-{Regular,SemiBold,Bold}.subset.woff2` — SIL OFL 1.1, 전문은 같은 폴더 `OFL.txt`. self-host 하며 **CDN을 쓰지 않는다**(ADR-016). `NoonnuBasicGothicRegular.woff2`를 넣으면 그 서체가 먼저 잡힌다.
- `public/images/capital-{desk,calculator,sandbox,branch}.webp` — 홈 배너 3슬라이드·로그인·가입에 쓰는 장면 그림.

## mock 모드

`VITE_MOCK=1`이면 `src/api/client.ts`가 네트워크 대신 `src/api/mock/index.ts`를 부른다(외부 라이브러리 없음). 응답 값은 docs `domain/calculation-examples.md`의 골든 값과 `business-rules.md` 수치를 그대로 쓴다.

- 미리 만든 계정: `learner@example.com`(USER), `admin@example.com`(ADMIN), 비밀번호 `capimate-demo-2026`.
- 응답이 없는 경로는 404로 "mock에 … 응답이 없어요"를 돌려준다. 데이터는 영역별 파일에 둔다 — `mock/fixtures.ts`(공통)·`learn-fixtures.ts`(학습·용어·방법론)·`lab-fixtures.ts`(계산기·샌드박스)·`admin.ts`(운영 콘솔).
- mock은 백엔드 동작(교차 검증·실제 DB·멱등 키)을 재현하지 않는다. 화면 확인용이다.

실제 데이터로 보려면 백엔드를 `CAPIMATE_DEMO_SEED=true`로 띄운다 — 계약 11건(정상·연체·기한이익상실·완제·중도상환)과 12개월 추이가 들어 있다.

## 디렉터리

```text
src/
├── api/        client.ts(fetch 래퍼: Bearer · X-Request-Id · Idempotency-Key · ApiError · mock 분기)
│               types.ts(OpenAPI 전 스키마) · auth · home · learning · glossary · calculators · sandbox · admin
│               mock/(index.ts 라우터 + 영역별 고정 응답)
├── components/ 공용 컴포넌트 + charts/
├── context/    AuthContext(토큰 localStorage `capimate.token` · /auth/me 복원)
├── lib/        format(금액·비율·날짜) · navigation
├── pages/      HomePage · LoginPage · SignupPage · SettingsPage · NotFoundPage
│               learn/ · glossary/ · calculators/ · sandbox/ · admin/
└── styles/     위 참조
```

규칙:

- 모든 계산 결과 바로 아래에 `Disclosure`(응답의 `disclosure`를 넘긴다). 금액은 `Money` 또는 `td.num`(tabular-nums·오른쪽 정렬).
- 표는 `DataTable` 또는 `<table class="table">` + `caption` + `th scope`. 열이 많으면 `scroll`/`.table-scroll`.
- 상태는 `StatusChip`(라벨 필수). 로딩 `Loading`, 오류 `LoadError`(문장 + 다시 시도 + 요청 ID), 빈 상태 `EmptyState`(다음 행동 1개).
- 하위 화면은 `SubPageHeader` → `main.page-main` → 핵심 수치 `.figure-row` → `.page-grid`(주 내용 + `aside`) → `.next-actions`.
  `SubPageHeader`의 `section`은 `learn` `calculators` `sandbox` `admin` `account`(v2)와 `products` `support`(v3). 위치 표시·탭은 `nav.ts`에서 만든다.
- 인터랙티브 요소는 최소 `--touch`(44px). 인라인 `style`은 막대 길이·색 토큰 전달·`--figure-cols`만 허용.
- 계약(`docs/contracts/CapiMATE-API.yml`)과 `types.ts`가 어긋나면 계약을 먼저 고치고 같은 PR에서 타입을 맞춘다.

## 검수

PR마다 docs `design/ui-guidelines.md` §9 체크리스트와 1440·375 폭 스크린샷을 붙인다.
