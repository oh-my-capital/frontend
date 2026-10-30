import { useState, type FormEvent } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { IS_MOCK, errorMessage } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { safeReturnPath } from "../lib/navigation";

/** 로그인(S-30): 이메일·비밀번호, 데스크톱 한 화면 안, 가입 링크. 소셜 버튼 없음. */
export default function LoginPage() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const state = useLocation().state as { from?: string } | null;
  const next = safeReturnPath(state?.from);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (isAuthenticated) return <Navigate to={next} replace />;

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await login({ email: email.trim(), password });
      navigate(next, { replace: true });
    } catch (err) {
      setError(errorMessage(err, "로그인하지 못했어요. 이메일과 비밀번호를 확인하고 다시 시도해요."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="account-main">
      <section className="account-intro" aria-labelledby="login-title">
        <span className="eyebrow">로그인</span>
        <h1 id="login-title">내 샌드박스와 학습 기록으로 돌아가요</h1>
        <p>로그인하면 가상 고객 프로필, 신청·계약, 가상 시계가 내 샌드박스에 그대로 남아 있어요. 확인 문제 점수와 완료한 개념도 기록돼요. 계산기 세 가지는 로그인 없이도 쓸 수 있어요.</p>
        <dl>
          <div><dt>필요한 것</dt><dd>이메일과 12자 이상 비밀번호. 실명·전화번호·실계좌는 받지 않아요.</dd></div>
          <div><dt>세션</dt><dd>로그인 상태는 30일 동안 이 브라우저에 남아요. 비밀번호를 바꾸면 다른 기기의 로그인은 끊겨요.</dd></div>
          <div><dt>교육용</dt><dd>이 서비스의 대출·심사·연체는 모두 모의이며 실제 신용과 무관해요.</dd></div>
        </dl>
      </section>
      <form className="account-form" onSubmit={submit} aria-busy={busy} noValidate>
        <h2>로그인</h2>
        <div className="field">
          <label className="field-label" htmlFor="login-email">이메일</label>
          <input id="login-email" className="field-input" type="email" autoComplete="username" inputMode="email" value={email} onChange={e => setEmail(e.target.value)} required />
        </div>
        <div className="field">
          <label className="field-label" htmlFor="login-password">비밀번호</label>
          <input id="login-password" className="field-input" type="password" autoComplete="current-password" minLength={12} value={password} onChange={e => setPassword(e.target.value)} required />
        </div>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="btn btn-primary btn-block" type="submit" disabled={busy || !email || !password}>{busy ? "확인하고 있어요…" : "로그인"}</button>
        <p className="account-switch">계정이 없나요? <Link to="/signup" state={state}>가입하기</Link></p>
        {IS_MOCK && (
          <p className="account-mock">mock 모드예요. 미리 만들어 둔 계정 <code>learner@example.com</code>(일반) · <code>admin@example.com</code>(운영자), 비밀번호 <code>capimate-demo-2026</code>으로 들어갈 수 있어요. 새로 가입해도 돼요(새로 고침하면 사라져요).</p>
        )}
      </form>
    </main>
  );
}
