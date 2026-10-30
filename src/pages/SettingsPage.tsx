import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authApi } from "../api/auth";
import { ApiError, errorMessage } from "../api/client";
import SubPageHeader from "../components/SubPageHeader";
import { useAuth } from "../context/AuthContext";

const MIN_PASSWORD = 12;
const WITHDRAW_PHRASE = "탈퇴합니다";

/** 계정 설정(S-32): 비밀번호 변경(다른 세션 폐기) · 탈퇴(확인 문구 입력). */
export default function SettingsPage() {
  const { user } = useAuth();
  return (
    <>
      <SubPageHeader section="account" current="/settings" title="계정 설정" description="비밀번호를 바꾸거나 계정을 지울 수 있어요. 이 서비스는 이메일과 비밀번호 외의 개인정보를 갖고 있지 않아요." meta={user ? `${user.email} · ${user.role === "ADMIN" ? "운영자" : "일반 사용자"}` : undefined} tabs={false} />
      <main className="page-main settings-main">
        <div className="page-grid">
          <div className="stack">
            <PasswordForm />
            <WithdrawForm />
          </div>
          <aside>
            <div className="panel panel-soft">
              <h3>내 샌드박스와 학습</h3>
              <p className="muted" style={{ marginTop: 8, fontSize: 15 }}>계정과 함께 보관되는 것은 가상 고객 프로필, 신청·계약·거래, 가상 시계, 확인 문제 기록이에요.</p>
              <div className="btn-row" style={{ marginTop: 14 }}>
                <Link className="btn btn-secondary btn-small" to="/sandbox">내 샌드박스</Link>
                <Link className="btn btn-secondary btn-small" to="/me/learning">내 학습</Link>
              </div>
            </div>
          </aside>
        </div>
      </main>
    </>
  );
}

function PasswordForm() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setDone(false);
    if (next.length < MIN_PASSWORD) return setError(`새 비밀번호는 ${MIN_PASSWORD}자 이상이어야 해요. 지금 ${next.length}자예요.`);
    if (next !== confirm) return setError("새 비밀번호 확인이 달라요. 같은 비밀번호를 다시 입력해요.");
    if (next === current) return setError("새 비밀번호가 현재 비밀번호와 같아요. 다른 비밀번호를 정해요.");
    setBusy(true);
    setError(null);
    try {
      await authApi.changePassword({ currentPassword: current, newPassword: next });
      setCurrent(""); setNext(""); setConfirm("");
      setDone(true);
    } catch (err) {
      setError(err instanceof ApiError && err.status === 400 ? err.message : errorMessage(err, "비밀번호를 바꾸지 못했어요. 잠시 뒤 다시 시도해요."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="panel" aria-labelledby="pw-title">
      <h2 id="pw-title">비밀번호 변경</h2>
      <p>바꾸면 지금 이 기기만 로그인 상태로 남고, 다른 기기의 세션은 모두 끊겨요.</p>
      <form className="settings-form" onSubmit={submit} aria-busy={busy} noValidate>
        <div className="field">
          <label className="field-label" htmlFor="pw-current">현재 비밀번호</label>
          <input id="pw-current" className="field-input" type="password" autoComplete="current-password" value={current} onChange={e => setCurrent(e.target.value)} required />
        </div>
        <div className="field">
          <label className="field-label" htmlFor="pw-next">새 비밀번호</label>
          <input id="pw-next" className="field-input" type="password" autoComplete="new-password" minLength={MIN_PASSWORD} value={next} onChange={e => setNext(e.target.value)} aria-describedby="pw-next-hint" required />
          <p id="pw-next-hint" className="field-hint">{MIN_PASSWORD}자 이상.</p>
        </div>
        <div className="field">
          <label className="field-label" htmlFor="pw-confirm">새 비밀번호 확인</label>
          <input id="pw-confirm" className="field-input" type="password" autoComplete="new-password" minLength={MIN_PASSWORD} value={confirm} onChange={e => setConfirm(e.target.value)} required />
        </div>
        {error && <p className="form-error" role="alert">{error}</p>}
        {done && <p className="form-done" role="status">비밀번호를 바꿨어요. 다른 기기에서는 다시 로그인해야 해요.</p>}
        <div className="form-actions">
          <button className="btn btn-primary" type="submit" disabled={busy || !current || !next || !confirm}>{busy ? "바꾸고 있어요…" : "비밀번호 바꾸기"}</button>
        </div>
      </form>
    </section>
  );
}

function WithdrawForm() {
  const { user, clearSession } = useAuth();
  const navigate = useNavigate();
  const [phrase, setPhrase] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isAdmin = user?.role === "ADMIN";

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (phrase.trim() !== WITHDRAW_PHRASE) return setError(`확인 문구 "${WITHDRAW_PHRASE}"를 그대로 입력해요.`);
    setBusy(true);
    setError(null);
    try {
      await authApi.deleteAccount();
      // 서버 세션은 탈퇴와 함께 사라졌다. 보호 화면에서 바로 로그아웃하면 로그인 화면으로 밀려나므로 홈으로 먼저 옮긴다.
      navigate("/", { replace: true, state: { notice: "탈퇴했어요. 샌드박스와 학습 기록을 모두 지웠어요." } });
      clearSession();
    } catch (err) {
      setError(err instanceof ApiError && err.status === 403 ? "관리자 계정은 탈퇴할 수 없어요. 다른 운영자에게 요청해요." : errorMessage(err, "탈퇴하지 못했어요. 잠시 뒤 다시 시도해요."));
      setBusy(false);
    }
  };

  return (
    <section className="panel settings-danger" aria-labelledby="withdraw-title">
      <h2 id="withdraw-title">탈퇴</h2>
      <p>탈퇴하면 가상 고객 프로필, 신청·계약·거래 내역, 가상 시계, 알림, 확인 문제 기록이 모두 지워지고 되돌릴 수 없어요. 같은 이메일로 다시 가입할 수는 있어요.</p>
      {isAdmin ? (
        <p className="muted">관리자 계정은 심사 변경 이력을 남겨야 하므로 여기서 탈퇴할 수 없어요.</p>
      ) : (
        <form className="settings-form" onSubmit={submit} aria-busy={busy} noValidate>
          <div className="field">
            <label className="field-label" htmlFor="withdraw-phrase">확인 문구</label>
            <input id="withdraw-phrase" className="field-input" type="text" autoComplete="off" value={phrase} onChange={e => setPhrase(e.target.value)} aria-describedby="withdraw-hint" required />
            <p id="withdraw-hint" className="field-hint">"{WITHDRAW_PHRASE}"라고 입력하면 버튼이 켜져요.</p>
          </div>
          {error && <p className="form-error" role="alert">{error}</p>}
          <div className="form-actions">
            <button className="btn btn-danger" type="submit" disabled={busy || phrase.trim() !== WITHDRAW_PHRASE}>{busy ? "지우고 있어요…" : "탈퇴하고 모든 기록 지우기"}</button>
          </div>
        </form>
      )}
    </section>
  );
}
