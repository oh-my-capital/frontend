import { Link } from "react-router-dom";
import { ApiError } from "../../../api/client";

/**
 * 403 화면. ProtectedRoute(adminOnly)는 USER 역할을 홈으로 돌려보내므로, 여기까지 오는 경우는 세션이 바뀌어 API가 403을
 * 돌려줄 때다. (ProtectedRoute 가 redirect 대신 403 화면을 그리도록 바꾸는 요청은 보고에 적었다.)
 */
export default function AdminForbidden({ error }: { error?: unknown }) {
  const requestId = error instanceof ApiError ? error.requestId : "";
  return (
    <main className="page-main">
      <div className="panel admin-forbidden" role="alert">
        <span className="eyebrow">403</span>
        <h1 style={{ marginTop: 6 }}>운영자만 볼 수 있는 화면이에요</h1>
        <p className="muted" style={{ marginTop: 12 }}>지금 계정은 운영자 역할이 아니에요. 운영자 계정으로 다시 로그인하거나 홈으로 돌아가요.</p>
        <div className="btn-row" style={{ marginTop: 20 }}>
          <Link className="btn btn-primary" to="/login">다시 로그인</Link>
          <Link className="btn btn-secondary" to="/">홈으로</Link>
        </div>
        {requestId && <p className="faint" style={{ marginTop: 12 }}>요청 ID {requestId}</p>}
      </div>
    </main>
  );
}

