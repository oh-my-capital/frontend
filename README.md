# CapiMATE 웹 · frontend

**아직 스캐폴드 전이다.** WP5(docs `project/agent-briefs/WP05-frontend-foundation.md`)가 만든다.

목표 디렉터리:

```text
src/
├── api/          client.ts, types.ts, learning.ts, glossary.ts, calculators.ts, sandbox.ts, admin.ts, mock/
├── components/   Header, SiteFooter, Brand, Icon, PageTitle, SubPageHeader, LoadError, Loading, EmptyState,
│                 Stepper, MoneyInput, RateInput, DataTable, StatusChip, Disclosure, Timeline, ConceptDiagram, ProtectedRoute
├── context/      AuthContext
├── pages/        HomePage, LoginPage, SignupPage, SettingsPage, NotFoundPage, MethodologyPage, MyLearningPage,
│                 learn/, glossary/, calculators/, sandbox/, admin/
└── styles/       tokens.css, base.css, brand.css, home.css, account.css, learn.css, glossary.css, calculators.css, sandbox.css, admin.css
public/
├── fonts/        NoonnuBasicGothic*.woff2 (사람이 제공, 라이선스 확인)
└── images/       capital-desk.webp (사람이 제공, 1536×1024). 없으면 홈은 이미지 없는 구성
```

디자인 기준: docs `design/ui-guidelines.md`. 화면 목록: `design/screens.md`.
