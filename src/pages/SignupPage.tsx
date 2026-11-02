import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { ApiError, errorMessage } from "../api/client";
import { legalApi, type LegalDocument, type SignupRequest } from "../api/legal";
import { useAuth } from "../context/AuthContext";
import { safeReturnPath } from "../lib/navigation";
import "../styles/legal.css";

const MIN_PASSWORD = 12;

/**
 * 가입(S-31): 12자 비밀번호 안내, 교육용 고지 동의 체크, 필수 동의 2종(이용약관·개인정보처리방침, WP36 FR-59).
 * 동의 문구 옆 "요약 보기"는 같은 화면에서 펼쳐 입력값을 잃지 않게 하고, 전문은 새 탭으로 연다. 보낸 버전은 화면이 받은 문서 버전이다.
 * 가입 성공 시 바로 로그인된다(응답이 Session).
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
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [docs, setDocs] = useState<{ terms: LegalDocument | null; privacy: LegalDocument | null }>({ terms: null, privacy: null });
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  /** 이 화면에서 가입 요청을 보냈으면 true. 아래 <Navigate> 대신 submit 의 navigate(state) 한 번으로만 이동한다. */
  const [signedUp, setSignedUp] = useState(false);

  /** 동의 대상 문서(버전·요약). 못 받아도 가입은 할 수 있다(버전 없이 보내면 서버가 현재 버전으로 기록한다). */
  const loadDocs = useCallback((signal?: AbortSignal) => {
    Promise.all([legalApi.document("terms", signal), legalApi.document("privacy", signal)])
      .then(([terms, privacy]) => setDocs({ terms, privacy }))
      .catch(() => { /* 문서를 못 받으면 링크만 보인다 */ });
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    loadDocs(controller.signal);
    return () => controller.abort();
  }, [loadDocs]);

  if (isAuthenticated && !signedUp) return <Navigate to={next} replace />;

  const validate = () => {
    const errors: Record<string, string> = {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) errors.email = "이메일 형식이 맞지 않아요. 예: name@example.com";
    if (password.length < MIN_PASSWORD) errors.password = `비밀번호는 ${MIN_PASSWORD}자 이상이어야 해요. 지금 ${password.length}자예요.`;
    if (confirm !== password) errors.confirm = "두 비밀번호가 서로 달라요. 같은 비밀번호를 다시 입력해요.";
    if (!agreed) errors.agreed = "교육용 서비스 고지에 동의해야 가입할 수 있어요.";
    if (!agreeTerms) errors.agreeTerms = "이용약관에 동의해야 가입할 수 있어요.";
    if (!agreePrivacy) errors.agreePrivacy = "개인정보처리방침에 동의해야 가입할 수 있어요.";
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
      const body: SignupRequest = {
        email: email.trim(),
        password,
        agreeTerms,
        agreePrivacy,
        ...(docs.terms ? { termsVersion: docs.terms.version } : {}),
        ...(docs.privacy ? { privacyVersion: docs.privacy.version } : {}),
      };
      await signup(body);
      navigate(next, { replace: true, state: { notice: "가입했어요. 가상 고객 프로필을 만들면 첫 대출을 신청할 수 있어요." } });
    } catch (err) {
      setSignedUp(false);
      if (err instanceof ApiError && err.code === "CONSENT_VERSION_MISMATCH") {
        // 화면을 연 뒤 약관이 바뀌었다. 새 문서를 다시 받고 동의를 다시 묻는다.
        setAgreeTerms(false);
        setAgreePrivacy(false);
        loadDocs();
        setError("약관이 방금 바뀌었어요. 새 내용을 확인하고 다시 동의해요.");
      } else if (err instanceof ApiError && err.code === "CONSENT_REQUIRED") setError("이용약관과 개인정보처리방침에 모두 동의해야 가입할 수 있어요.");
      else if (err instanceof ApiError && err.status === 409) setError("이미 가입된 이메일이에요. 로그인하거나 다른 이메일을 써요.");
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
        <img className="account-art" src="/images/capital-sandbox.webp" width={1200} height={800} alt="자동차 옆 상담 창구에서 상담원이 계약서 봉투를 건네는 일러스트" />
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
        <fieldset className="signup-consents">
          <legend className="signup-consents-title">필수 동의</legend>
          <ConsentCheck id="signup-terms" checked={agreeTerms} onChange={setAgreeTerms} error={fieldErrors.agreeTerms} doc={docs.terms} to="/legal/terms"
            label="(필수) 이용약관에 동의해요. 만 14세 이상이에요." />
          <ConsentCheck id="signup-privacy" checked={agreePrivacy} onChange={setAgreePrivacy} error={fieldErrors.agreePrivacy} doc={docs.privacy} to="/legal/privacy"
            label="(필수) 개인정보처리방침을 읽고 동의해요." />
        </fieldset>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="btn btn-primary btn-block" type="submit" disabled={busy}>{busy ? "만들고 있어요…" : "가입하고 시작하기"}</button>
        <p className="account-switch">이미 계정이 있나요? <Link to="/login" state={state}>로그인</Link></p>
      </form>
    </main>
  );
}

/** 필수 동의 체크 하나: 체크 + 같은 화면에서 펼치는 요약(버전·시행일·초안 표시) + 전문 새 탭 링크. */
function ConsentCheck({ id, checked, onChange, error, doc, to, label }: {
  id: string; checked: boolean; onChange: (value: boolean) => void; error?: string; doc: LegalDocument | null; to: string; label: string;
}) {
  return (
    <div className="signup-consent">
      <label className="field-check">
        <input id={id} type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} aria-invalid={!!error} aria-describedby={error ? `${id}-error` : undefined} required />
        <span>{label}</span>
      </label>
      <details className="fold">
        <summary>요약 보기{doc ? ` · 버전 ${doc.version}` : ""}</summary>
        <div className="fold-body">
          {doc?.draftNotice && <p><strong>{doc.draftNotice}</strong></p>}
          {doc ? <p>{doc.summary}</p> : <p>문서를 불러오지 못했어요. 아래 링크에서 전문을 볼 수 있어요.</p>}
          <a href={to} target="_blank" rel="noreferrer">전문 새 탭에서 보기</a>
        </div>
      </details>
      {error && <p id={`${id}-error`} className="field-error">{error}</p>}
    </div>
  );
}
