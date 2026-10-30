import { useEffect, type ReactNode } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Loading from "./Loading";
import { setDocumentTitle } from "./PageTitle";

interface Props {
  children: ReactNode;
  adminOnly?: boolean;
  /**
   * adminOnly 인데 USER 역할일 때의 동작. 기본 "redirect"는 홈으로 보낸다(운영 콘솔은 메뉴에서도 숨긴다).
   * "page"는 주소를 바꾸지 않고 403 화면을 그려 어떤 화면을 왜 못 보는지 보여 준다.
   */
  forbidden?: "redirect" | "page";
}

/**
 * 로그인이 필요한 화면. 미로그인이면 /login 으로 보내고 원래 주소를 state.from 에 담아 로그인 뒤 돌아온다.
 * adminOnly 면 USER 역할은 홈으로 보내거나(forbidden="redirect", 기본) 403 화면을 그린다(forbidden="page").
 */
export default function ProtectedRoute({ children, adminOnly = false, forbidden = "redirect" }: Props) {
  const { user, isAuthenticated, checkingSession } = useAuth();
  const location = useLocation();
  if (checkingSession) return <main className="page-main"><Loading message="로그인 상태를 확인하고 있어요" /></main>;
  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: `${location.pathname}${location.search}` }} />;
  if (adminOnly && user?.role !== "ADMIN") {
    return forbidden === "page" ? <ForbiddenPage pathname={location.pathname} /> : <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

/**
 * 403 화면: 운영자 전용 주소를 USER 역할로 열었을 때, 또는 세션이 바뀌어 API 가 403 을 돌려줄 때.
 * 어떤 주소인지 보여 주고 다음 행동(다시 로그인·홈)을 준다.
 */
export function ForbiddenPage({ pathname, requestId }: { pathname?: string; requestId?: string }) {
  useEffect(() => { setDocumentTitle("운영자만 볼 수 있는 화면"); }, []);
  return (
    <main className="page-main">
      <div className="panel forbidden-panel" role="alert">
        <span className="eyebrow">403</span>
        <h1>운영자만 볼 수 있는 화면이에요</h1>
        <p className="muted">
          {pathname && <><code>{pathname}</code> 은 운영 콘솔 주소예요. </>}
          지금 계정은 운영자 역할이 아니에요. 운영자 계정으로 다시 로그인하거나 홈으로 돌아가요.
        </p>
        <div className="btn-row">
          <Link className="btn btn-primary" to="/login" state={{ from: pathname }}>다시 로그인</Link>
          <Link className="btn btn-secondary" to="/">홈으로</Link>
        </div>
        {requestId && <p className="faint">요청 ID {requestId}</p>}
      </div>
    </main>
  );
}
