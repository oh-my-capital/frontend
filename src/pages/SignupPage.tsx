import { useState, type FormEvent } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { ApiError, errorMessage } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { safeReturnPath } from "../lib/navigation";

const MIN_PASSWORD = 12;

/**
 * 가입(S-31): 12자 비밀번호 안내, 교육용 고지 동의 체크. 가입 성공 시 바로 로그인된다(응답이 Session).
 * 이미 로그인된 상태로 열면 돌아갈 주소로 보낸다. 단, 이 화면에서 방금 가입한 경우는 예외다 — 라우터의 주소 변경은
 * startTransition(낮은 우선순위)이고 AuthContext 의 user 갱신은 일반 우선순위라, 가입 직후 isAuthenticated 가 먼저
 * 반영되면서 state 없는 <Navigate> 가 안내 문구를 실은 navigate(state) 를 덮어썼다. 그래서 가입 뒤에는 navigate 한 번만 한다.
 */
export default function SignupPage() {
  const { signup, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const state = useLocation().state as { from?: string } | null;
  const next = safeReturnPath(state?.from);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  /** 이 화면에서 가입 요청을 보냈으면 true. 아래 <Navigate> 대신 submit 의 navigate(state) 한 번으로만 이동한다. */
  const [signedUp, setSignedUp] = useState(false);

  if (isAuthenticated && !signedUp) return <Navigate to={next} replace />;

  const validate = () => {
    const errors: Record<string, string> = {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) errors.email = "이메일 형식이 맞지 않아요. 예: name@example.com";
    if (password.length < MIN_PASSWORD) errors.password = `비밀번호는 ${MIN_PASSWORD}자 이상이어야 해요. 지금 ${password.length}자예요.`;
    if (confirm !== password) errors.confirm = "두 비밀번호가 서로 달라요. 같은 비밀번호를 다시 입력해요.";
    if (!agreed) errors.agreed = "교육용 서비스 고지에 동의해야 가입할 수 있어요.";
    return errors;
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    const errors = validate();
    setFieldErrors(errors);
    if (Object.keys(errors).length) return;
    setBusy(true);
    try {
      setSignedUp(true);
      await signup({ email: email.trim(), password });
      navigate(next, { replace: true, state: { notice: "가입했어요. 가상 고객 프로필을 만들면 첫 대출을 신청할 수 있어요." } });
    } catch (err) {
      setSignedUp(false);
      if (err instanceof ApiError && err.status === 409) setError("이미 가입된 이메일이에요. 로그인하거나 다른 이메일을 써요.");
      else setError(errorMessage(err, "가입하지 못했어요. 입력을 확인하고 다시 시도해요."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="account-main">
      <section className="account-intro" aria-labelledby="signup-title">
        <span className="eyebrow">가입</span>
        <h1 id="signup-title">이메일 하나로 내 샌드박스를 만들어요</h1>
        <p>가입하면 가상 고객 프로필·결제계좌·가상 시계가 딸린 샌드박스가 하나 생겨요. 여기서 대출을 신청하고, 시간을 넘기며 상환·연체·기한이익상실을 직접 겪어 볼 수 있어요. 학습 진척도 함께 기록돼요.</p>
        <dl>
          <div><dt>받는 정보</dt><dd>이메일과 비밀번호만. 실명·주민번호·실계좌·실제 신용정보는 받지 않고, 조회하지도 않아요.</dd></div>
          <div><dt>비밀번호</dt><dd>12자 이상. 다른 서비스에서 쓰는 비밀번호는 피해요.</dd></div>
          <div><dt>탈퇴</dt><dd>계정 설정에서 언제든 탈퇴할 수 있어요. 샌드박스와 학습 기록은 모두 지워져요.</dd></div>
        </dl>
      </section>
      <form className="account-form" onSubmit={submit} aria-busy={busy} noValidate>
        <h2>가입</h2>
        <div className="field">
          <label className="field-label" htmlFor="signup-email">이메일</label>
          <input id="signup-email" className="field-input" type="email" autoComplete="username" inputMode="email" value={email} onChange={e => setEmail(e.target.value)} aria-invalid={!!fieldErrors.email} aria-describedby={fieldErrors.email ? "signup-email-error" : undefined} required />
          {fieldErrors.email && <p id="signup-email-error" className="field-error">{fieldErrors.email}</p>}
        </div>
        <div className="field">
          <label className="field-label" htmlFor="signup-password">비밀번호</label>
          <input id="signup-password" className="field-input" type="password" autoComplete="new-password" minLength={MIN_PASSWORD} value={password} onChange={e => setPassword(e.target.value)} aria-invalid={!!fieldErrors.password} aria-describedby={fieldErrors.password ? "signup-password-error" : "signup-password-hint"} required />
          <p id="signup-password-hint" className="field-hint">{MIN_PASSWORD}자 이상. 문장처럼 길게 쓰면 기억하기 쉽고 안전해요.</p>
          {fieldErrors.password && <p id="signup-password-error" className="field-error">{fieldErrors.password}</p>}
        </div>
        <div className="field">
          <label className="field-label" htmlFor="signup-confirm">비밀번호 확인</label>
          <input id="signup-confirm" className="field-input" type="password" autoComplete="new-password" minLength={MIN_PASSWORD} value={confirm} onChange={e => setConfirm(e.target.value)} aria-invalid={!!fieldErrors.confirm} aria-describedby={fieldErrors.confirm ? "signup-confirm-error" : undefined} required />
          {fieldErrors.confirm && <p id="signup-confirm-error" className="field-error">{fieldErrors.confirm}</p>}
        </div>
        <div className="field">
          <label className="field-check">
            <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} aria-invalid={!!fieldErrors.agreed} aria-describedby={fieldErrors.agreed ? "signup-agree-error" : undefined} required />
            <span>교육용 모의 서비스임을 확인했어요. 여기서의 대출·심사·연체는 실제 금융거래가 아니며 신용에 영향을 주지 않아요.</span>
          </label>
          {fieldErrors.agreed && <p id="signup-agree-error" className="field-error">{fieldErrors.agreed}</p>}
        </div>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="btn btn-primary btn-block" type="submit" disabled={busy}>{busy ? "만들고 있어요…" : "가입하고 시작하기"}</button>
        <p className="account-switch">이미 계정이 있나요? <Link to="/login" state={state}>로그인</Link></p>
      </form>
    </main>
  );
}
