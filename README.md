# CapiMATE 웹 · frontend

캐피탈(여신전문금융)을 배우는 교육용 모의 여신 서비스의 화면. React 19 + Vite + TypeScript, react-router 7, `@remixicon/react`, oxlint. UI 라이브러리·Tailwind·차트 라이브러리는 쓰지 않는다(ADR-015). 디자인 기준은 docs `design/ui-guidelines.md` 하나다.

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

백엔드를 다른 주소에 띄웠으면 `API_PROXY_TARGET=http://localhost:8091 npm run dev`처럼 프록시 대상만 바꾼다. 화면 코드는 언제나 같은 origin의 `/api`만 부른다(docs `contracts/runtime.md`).

## 환경변수

`.env.example`을 복사해 `.env.local`로 쓴다. `VITE_` 변수는 번들에 들어가므로 비밀값을 넣지 않는다.

| 변수 | 기본 | 설명 |
|---|---|---|
| `VITE_API_BASE_URL` | `/api` | API 경로. 배포도 같은 origin의 `/api`를 쓴다 |
| `VITE_MOCK` | (비움) | `1`이면 `src/api/mock/`의 고정 응답으로 동작 |
| `API_PROXY_TARGET` | `http://localhost:8090` | dev·preview 서버의 `/api` 프록시 대상(빌드에는 안 들어감) |

## mock 모드

`VITE_MOCK=1`이면 `src/api/client.ts`가 네트워크 대신 `src/api/mock/index.ts`를 부른다(외부 라이브러리 없음). 응답 값은 docs `domain/calculation-examples.md`의 골든 값과 `business-rules.md`·`learning-roadmap.md` 수치를 그대로 쓴다.

- 미리 만든 계정: `learner@example.com`(USER), `admin@example.com`(ADMIN), 비밀번호 `capimate-demo-2026`. 새로 가입해도 되고 새로 고침하면 메모리 사용자는 사라진다.
- 응답이 없는 경로는 404로 "mock에 … 응답이 없어요"를 돌려준다. 필요한 경로는 `mock/index.ts`에 추가하고 데이터는 영역별 파일에 둔다.
  - `mock/fixtures.ts` — 계정·개념 목차·홈·용어 요약 등 공통 데이터(WP5)
  - `mock/learn-fixtures.ts` — 학습·용어 사전·방법론·내 학습 응답(개념 본문·확인 문제 채점·메모리 진척, WP6)
  - `mock/admin.ts` — 운영 콘솔 응답(심사 큐·포트폴리오·콘텐츠·배치, WP8)
  - `mock/lab-fixtures.ts` — 계산기·샌드박스 응답(WP7이 추가)
- 로그인 화면은 mock 모드일 때만 계정 안내를 보여 준다.

## 디렉터리와 소유(docs `architecture/repository-boundaries.md`)

```text
src/
├── api/
│   ├── client.ts        fetch 래퍼(Bearer · X-Request-Id · Idempotency-Key · ApiError · mock 분기)   WP5
│   ├── types.ts         OpenAPI(CapiMATE-API.yml) 전 스키마 + 요청 본문 타입                          WP5
│   ├── auth.ts, home.ts 인증·홈이 쓰는 호출                                                          WP5
│   ├── mock/            고정 응답(index.ts 라우터 · fixtures.ts · learn-fixtures.ts · admin.ts · lab-fixtures.ts)  WP5(각 WP가 추가 가능)
│   └── learning.ts · glossary.ts · calculators.ts · sandbox.ts · admin.ts                            WP6 · WP6 · WP7 · WP7 · WP8
├── components/          Header, SiteFooter, Brand, Icon, PageTitle, SubPageHeader, Layout, LoadError, Loading,
│                        EmptyState, Stepper, MoneyInput, RateInput, Money, DataTable, StatusChip, Disclosure,
│                        Timeline, ConceptDiagram, ProtectedRoute, Placeholder                        WP5
├── context/AuthContext  토큰 localStorage(capimate.token) · /auth/me 복원                            WP5
├── lib/                 format(금액·비율·날짜), navigation                                           WP5
├── pages/
│   ├── HomePage, LoginPage, SignupPage, SettingsPage, NotFoundPage                                   WP5
│   ├── learn/           CoursePage, ConceptPage, MethodologyPage, MyLearningPage                    WP6
│   ├── glossary/        GlossaryPage, TermPage                                                       WP6
│   ├── calculators/     Schedule·Screening·PrepaymentCalculatorPage                                 WP7
│   ├── sandbox/         Sandbox, Profile, Apply, Application, Contract, NotificationsPage           WP7
│   └── admin/           AdminApplications·Portfolio·Content·BatchPage                               WP8
└── styles/
    ├── tokens.css       디자인 토큰(ui-guidelines §3 그대로)                                         WP5
    ├── base.css         리셋·타이포·.btn·.field-*·.table·.table-scroll·.status-*·상태 영역·Disclosure WP5
    ├── brand.css        워드마크·머리·푸터·SubPageHeader                                              WP5
    ├── home.css, account.css                                                                         WP5
    └── learn.css · glossary.css · calculators.css · sandbox.css · admin.css                          각 WP가 만들고 main.tsx에 import
public/
├── favicon.svg
├── fonts/               NoonnuBasicGothicRegular.woff2 — 사람이 라이선스 확인 후 제공(README 참고). 없으면 시스템 폰트
└── images/              capital-desk.webp — 사람이 제공. 없으면 홈 배너는 이미지 없는 2열(계산 예시 표)
```

규칙:

- WP6·7·8은 `pages/<자기 영역>/`, `styles/<자기 영역>.css`, `api/<자기 영역>.ts`만 고친다. 자리표시 화면(`Placeholder`)은 라우트가 이미 `App.tsx`에 있으므로 **해당 파일의 본문만** 바꾼다. 공통 컴포넌트가 더 필요하면 WP5(또는 총괄)에 요청하고 그동안 자기 디렉터리에 임시로 둔다.
- 모든 계산 결과 바로 아래에 `Disclosure`(응답의 `disclosure`를 넘긴다). 금액은 `Money` 컴포넌트 또는 `td.num`(tabular-nums·오른쪽 정렬).
- 표는 `DataTable` 또는 `<table class="table">` + `caption` + `th scope`. 열이 많으면 `scroll`/`.table-scroll`.
- 상태는 `StatusChip`(라벨 필수). 로딩은 `Loading`(텍스트), 오류는 `LoadError`(문장 + 다시 시도 + 요청 ID), 빈 상태는 `EmptyState`(다음 행동 1개).
- 하위 화면은 `SubPageHeader`(section·current·title·description) → `main.page-main` → `.page-grid`(주 내용 + `aside`) → `.next-actions`.
- 계약(`docs/contracts/CapiMATE-API.yml`)과 `types.ts`가 어긋나면 계약을 먼저 고치고 같은 PR에서 타입을 맞춘다.

## 검수

PR마다 docs `design/ui-guidelines.md` §9 체크리스트와 1440·375 폭 스크린샷을 붙인다. 스크린샷은 `docs/screenshots/`에 둔다.
