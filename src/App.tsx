/**
 * 라우트 전체(docs/design/screens.md). 공개 화면은 로그인 없이, 샌드박스·내 학습·설정은 ProtectedRoute, 운영은 adminOnly.
 *
 * 화면 코드 분할(NFR-21, WP39 · ADR-034): 화면은 모두 React.lazy 로 따로 받는다. 첫 방문은 공통 틀(머리·바닥·인증)과
 * 그 화면 조각만 내려받고, 나머지 화면은 그 주소로 갈 때 받는다. 조각을 받는 동안·실패했을 때의 표시는 RouteSuspense 한 곳이 맡는다.
 *
 * 새 화면을 더하는 법(WP마다 두 줄, 주석 `// WP<번호> — …` 아래):
 *   1) 화면 상수 한 줄 — `const FooPage = lazy(() => import("./pages/foo/FooPage"));`  (화면 파일은 default export)
 *   2) Route 한 줄 — `<Route path="/foo" element={<FooPage />} />` 를 RouteSuspense 라우트 안(아래 표시 사이)에.
 *      로그인 필요면 `<ProtectedRoute>`, 운영이면 `<ProtectedRoute adminOnly>`로 감싼다.
 * 화면을 `import FooPage from …` 정적 import 로 넣지 않는다(첫 화면 JS 에 그 화면이 다시 섞인다).
 * 제목·설명·검색 노출(noindex)은 components/pageMeta.ts 에 경로 한 줄을 더한다(없으면 nav.ts 이름 + noindex 로 대신한다).
 */
import { lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import PageTitle from "./components/PageTitle";
import ProtectedRoute from "./components/ProtectedRoute";
import RouteSuspense from "./components/RouteSuspense";
import { AuthProvider } from "./context/AuthContext";
const HomePage = lazy(() => import("./pages/HomePage"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const NotFoundPage = lazy(() => import("./pages/NotFoundPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const SignupPage = lazy(() => import("./pages/SignupPage"));
// WP6 — 배우기·용어 사전·방법론·내 학습
const ConceptPage = lazy(() => import("./pages/learn/ConceptPage"));
const CoursePage = lazy(() => import("./pages/learn/CoursePage"));
const MethodologyPage = lazy(() => import("./pages/learn/MethodologyPage"));
const MyLearningPage = lazy(() => import("./pages/learn/MyLearningPage"));
const GlossaryPage = lazy(() => import("./pages/glossary/GlossaryPage"));
const TermPage = lazy(() => import("./pages/glossary/TermPage"));
// WP7 — 계산기·모의 여신
const PrepaymentCalculatorPage = lazy(() => import("./pages/calculators/PrepaymentCalculatorPage"));
const ScheduleCalculatorPage = lazy(() => import("./pages/calculators/ScheduleCalculatorPage"));
const ScreeningCalculatorPage = lazy(() => import("./pages/calculators/ScreeningCalculatorPage"));
const ApplicationPage = lazy(() => import("./pages/sandbox/ApplicationPage"));
const ApplyPage = lazy(() => import("./pages/sandbox/ApplyPage"));
const ContractPage = lazy(() => import("./pages/sandbox/ContractPage"));
const NotificationsPage = lazy(() => import("./pages/sandbox/NotificationsPage"));
const ProfilePage = lazy(() => import("./pages/sandbox/ProfilePage"));
const SandboxPage = lazy(() => import("./pages/sandbox/SandboxPage"));
// WP17 — 대환대출 비교·DSR 계산기
const DsrCalculatorPage = lazy(() => import("./pages/calculators/DsrCalculatorPage"));
const RefinanceCalculatorPage = lazy(() => import("./pages/calculators/RefinanceCalculatorPage"));
// WP21 — 증명서 발급·납입 캘린더
const CalendarPage = lazy(() => import("./pages/sandbox/calendar/CalendarPage"));
const CertificatePrintPage = lazy(() => import("./pages/sandbox/certificates/CertificatePrintPage"));
const CertificatesPage = lazy(() => import("./pages/sandbox/certificates/CertificatesPage"));
// WP8 — 운영
const AdminApplicationsPage = lazy(() => import("./pages/admin/AdminApplicationsPage"));
const AdminBatchPage = lazy(() => import("./pages/admin/AdminBatchPage"));
const AdminContentPage = lazy(() => import("./pages/admin/AdminContentPage"));
const AdminPortfolioPage = lazy(() => import("./pages/admin/AdminPortfolioPage"));
// WP20 — 학습 미션
const MissionPage = lazy(() => import("./pages/missions/MissionPage"));
const MissionsPage = lazy(() => import("./pages/missions/MissionsPage"));
// WP16 — 자동차 금융 비교
const AutoFinanceCalculatorPage = lazy(() => import("./pages/calculators/AutoFinanceCalculatorPage"));
// WP25 — 고객센터·금융소비자 권리 안내
const FaqPage = lazy(() => import("./pages/support/FaqPage"));
const GuidePage = lazy(() => import("./pages/support/GuidePage"));
const NoticePage = lazy(() => import("./pages/support/NoticePage"));
const NoticesPage = lazy(() => import("./pages/support/NoticesPage"));
const RightsPage = lazy(() => import("./pages/support/RightsPage"));
const SupportHomePage = lazy(() => import("./pages/support/SupportHomePage"));
// WP23 — 상품 안내·대표 예시
const ProductDetailPage = lazy(() => import("./pages/products/ProductDetailPage"));
const ProductsPage = lazy(() => import("./pages/products/ProductsPage"));
// WP26 — 시나리오 프리셋·초기화
const ScenariosPage = lazy(() => import("./pages/sandbox/scenarios/ScenariosPage"));
// WP22 — 리스크 지표·연체 관리·운영 이력
const AdminAnalyticsPage = lazy(() => import("./pages/admin/analytics/AdminAnalyticsPage"));
const AdminAuditPage = lazy(() => import("./pages/admin/audit/AdminAuditPage"));
const AdminCollectionsPage = lazy(() => import("./pages/admin/collections/AdminCollectionsPage"));

export default function App() {
  return (
    <AuthProvider>
      <PageTitle />
      <Routes>
        <Route element={<Layout />}>
        {/* 화면 조각 경계(WP39). 화면 Route 는 모두 이 안에 둔다 — 시작 */}
        <Route element={<RouteSuspense />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />

          <Route path="/course" element={<CoursePage />} />
          <Route path="/learn/:conceptId" element={<ConceptPage />} />
          <Route path="/glossary" element={<GlossaryPage />} />
          <Route path="/glossary/:slug" element={<TermPage />} />
          <Route path="/methodology" element={<MethodologyPage />} />
          <Route path="/me/learning" element={<ProtectedRoute><MyLearningPage /></ProtectedRoute>} />
          {/* WP20 — 학습 미션(목록·상세 공개, 진행 저장은 로그인) */}
          <Route path="/missions" element={<MissionsPage />} />
          <Route path="/missions/:id" element={<MissionPage />} />

          {/* WP23 — 상품 안내·대표 예시 */}
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/products/:code" element={<ProductDetailPage />} />

          <Route path="/calculators" element={<Navigate to="/calculators/schedule" replace />} />
          <Route path="/calculators/schedule" element={<ScheduleCalculatorPage />} />
          <Route path="/calculators/screening" element={<ScreeningCalculatorPage />} />
          <Route path="/calculators/prepayment" element={<PrepaymentCalculatorPage />} />
          {/* WP17 — 대환대출 비교·DSR 계산기 */}
          <Route path="/calculators/refinance" element={<RefinanceCalculatorPage />} />
          <Route path="/calculators/dsr" element={<DsrCalculatorPage />} />
          {/* WP16 — 자동차 금융 비교 */}
          <Route path="/calculators/auto-finance" element={<AutoFinanceCalculatorPage />} />

          <Route path="/sandbox" element={<ProtectedRoute><SandboxPage /></ProtectedRoute>} />
          <Route path="/sandbox/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
          <Route path="/sandbox/apply" element={<ProtectedRoute><ApplyPage /></ProtectedRoute>} />
          <Route path="/sandbox/applications/:id" element={<ProtectedRoute><ApplicationPage /></ProtectedRoute>} />
          <Route path="/sandbox/contracts/:id" element={<ProtectedRoute><ContractPage /></ProtectedRoute>} />
          <Route path="/sandbox/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
          {/* WP21 — 증명서 발급·인쇄용 증명서·납입 캘린더 */}
          <Route path="/sandbox/certificates" element={<ProtectedRoute><CertificatesPage /></ProtectedRoute>} />
          <Route path="/sandbox/contracts/:id/certificates/:type" element={<ProtectedRoute><CertificatePrintPage /></ProtectedRoute>} />
          <Route path="/sandbox/calendar" element={<ProtectedRoute><CalendarPage /></ProtectedRoute>} />
          <Route path="/sandbox/scenarios" element={<ProtectedRoute><ScenariosPage /></ProtectedRoute>} /> {/* WP26 — 시나리오로 시작 */}

          <Route path="/admin" element={<Navigate to="/admin/applications" replace />} />
          <Route path="/admin/applications" element={<ProtectedRoute adminOnly><AdminApplicationsPage /></ProtectedRoute>} />
          <Route path="/admin/portfolio" element={<ProtectedRoute adminOnly><AdminPortfolioPage /></ProtectedRoute>} />
          <Route path="/admin/content" element={<ProtectedRoute adminOnly><AdminContentPage /></ProtectedRoute>} />
          <Route path="/admin/batch" element={<ProtectedRoute adminOnly><AdminBatchPage /></ProtectedRoute>} />
          {/* WP22 — 리스크 지표·연체 관리·운영 이력 */}
          <Route path="/admin/analytics" element={<ProtectedRoute adminOnly><AdminAnalyticsPage /></ProtectedRoute>} />
          <Route path="/admin/collections" element={<ProtectedRoute adminOnly><AdminCollectionsPage /></ProtectedRoute>} />
          <Route path="/admin/audit" element={<ProtectedRoute adminOnly><AdminAuditPage /></ProtectedRoute>} />

          {/* WP25 — 고객센터·금융소비자 권리 안내(공개) */}
          <Route path="/support" element={<SupportHomePage />} />
          <Route path="/support/faq" element={<FaqPage />} />
          <Route path="/support/notices" element={<NoticesPage />} />
          <Route path="/support/notices/:id" element={<NoticePage />} />
          <Route path="/support/rights" element={<RightsPage />} />
          <Route path="/support/guide" element={<GuidePage />} />

          <Route path="*" element={<NotFoundPage />} />
        {/* 화면 조각 경계(WP39) — 끝. 새 Route 는 이 줄 위에 */}
        </Route>
        </Route>
      </Routes>
    </AuthProvider>
  );
}
