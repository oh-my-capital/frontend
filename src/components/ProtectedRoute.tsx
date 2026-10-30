import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Loading from "./Loading";

/**
 * 로그인이 필요한 화면. 미로그인이면 /login 으로 보내고 원래 주소를 state.from 에 담아 로그인 뒤 돌아온다.
 * adminOnly 면 USER 역할은 홈으로 보낸다(운영 콘솔은 메뉴에서도 숨긴다).
 */
export default function ProtectedRoute({ children, adminOnly = false }: { children: ReactNode; adminOnly?: boolean }) {
  const { user, isAuthenticated, checkingSession } = useAuth();
  const location = useLocation();
  if (checkingSession) return <main className="page-main"><Loading message="로그인 상태를 확인하고 있어요" /></main>;
  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: `${location.pathname}${location.search}` }} />;
  if (adminOnly && user?.role !== "ADMIN") return <Navigate to="/" replace />;
  return <>{children}</>;
}
