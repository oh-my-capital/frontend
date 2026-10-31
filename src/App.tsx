import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import PageTitle from "./components/PageTitle";
import ProtectedRoute from "./components/ProtectedRoute";
import { AuthProvider } from "./context/AuthContext";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import NotFoundPage from "./pages/NotFoundPage";
import SettingsPage from "./pages/SettingsPage";
import SignupPage from "./pages/SignupPage";
// WP6 — 배우기·용어 사전·방법론·내 학습
import ConceptPage from "./pages/learn/ConceptPage";
import CoursePage from "./pages/learn/CoursePage";
import MethodologyPage from "./pages/learn/MethodologyPage";
import MyLearningPage from "./pages/learn/MyLearningPage";
import GlossaryPage from "./pages/glossary/GlossaryPage";
import TermPage from "./pages/glossary/TermPage";
// WP7 — 계산기·모의 여신
import PrepaymentCalculatorPage from "./pages/calculators/PrepaymentCalculatorPage";
import ScheduleCalculatorPage from "./pages/calculators/ScheduleCalculatorPage";
import ScreeningCalculatorPage from "./pages/calculators/ScreeningCalculatorPage";
import ApplicationPage from "./pages/sandbox/ApplicationPage";
import ApplyPage from "./pages/sandbox/ApplyPage";
import ContractPage from "./pages/sandbox/ContractPage";
import NotificationsPage from "./pages/sandbox/NotificationsPage";
import ProfilePage from "./pages/sandbox/ProfilePage";
import SandboxPage from "./pages/sandbox/SandboxPage";
// WP21 — 증명서 발급·납입 캘린더
import CalendarPage from "./pages/sandbox/calendar/CalendarPage";
import CertificatePrintPage from "./pages/sandbox/certificates/CertificatePrintPage";
import CertificatesPage from "./pages/sandbox/certificates/CertificatesPage";
// WP8 — 운영
import AdminApplicationsPage from "./pages/admin/AdminApplicationsPage";
import AdminBatchPage from "./pages/admin/AdminBatchPage";
import AdminContentPage from "./pages/admin/AdminContentPage";
import AdminPortfolioPage from "./pages/admin/AdminPortfolioPage";

/**
 * 라우트 전체(docs/design/screens.md). 공개 화면은 로그인 없이, 샌드박스·내 학습·설정은 ProtectedRoute, 운영은 adminOnly.
 * WP6~8 화면은 자리표시 컴포넌트다. 해당 WP가 pages/<영역>/ 안의 파일 본문만 바꾸면 된다.
 */
export default function App() {
  return (
    <AuthProvider>
      <PageTitle />
      <Routes>
        <Route element={<Layout />}>
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

          <Route path="/calculators" element={<Navigate to="/calculators/schedule" replace />} />
          <Route path="/calculators/schedule" element={<ScheduleCalculatorPage />} />
          <Route path="/calculators/screening" element={<ScreeningCalculatorPage />} />
          <Route path="/calculators/prepayment" element={<PrepaymentCalculatorPage />} />

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

          <Route path="/admin" element={<Navigate to="/admin/applications" replace />} />
          <Route path="/admin/applications" element={<ProtectedRoute adminOnly><AdminApplicationsPage /></ProtectedRoute>} />
          <Route path="/admin/portfolio" element={<ProtectedRoute adminOnly><AdminPortfolioPage /></ProtectedRoute>} />
          <Route path="/admin/content" element={<ProtectedRoute adminOnly><AdminContentPage /></ProtectedRoute>} />
          <Route path="/admin/batch" element={<ProtectedRoute adminOnly><AdminBatchPage /></ProtectedRoute>} />

          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </AuthProvider>
  );
}
