import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { errorMessage } from "../../api/client";
import { DOCUMENT_LABEL, DOCUMENT_PATH, legalApi, type ConsentStatus } from "../../api/legal";
import { useAuth } from "../../context/AuthContext";
import { formatDate } from "../../lib/format";
import "../../styles/legal.css";

const DISMISS_KEY = "capimate.reconsent.later";

function dismissed(): boolean {
  try { return sessionStorage.getItem(DISMISS_KEY) === "1"; } catch { return false; }
}

/**
 * 재동의 안내(S-363). 로그인 사용자에게 시행 중인 새 약관·처리방침 버전이 있을 때만 화면 아래 고정 띠로 묻는다.
 * Layout 이 아니라 App 의 PageTitle 옆에 둔다(WP40 이 Layout 을 고친다). "나중에"는 이 창(세션 저장소) 동안만 숨긴다.
 * 이용을 막지 않는다 — 끝내 동의하지 않으려면 탈퇴한다(business-rules WP36 재동의).
 */
export default function ReconsentNotice() {
  const { user } = useAuth();
  /** 받은 상태는 받은 사용자 id 와 함께 둔다 — 다른 계정으로 바뀌면 렌더에서 버린다(effect 안에서 동기 초기화하지 않으려고). */
  const [loaded, setLoaded] = useState<{ userId: number; status: ConsentStatus; done: boolean } | null>(null);
  const [hidden, setHidden] = useState(dismissed);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const userId = user?.id;
  useEffect(() => {
    if (userId === undefined) return;
    const controller = new AbortController();
    legalApi.consents(controller.signal)
      .then(status => setLoaded({ userId, status, done: false }))
      .catch(() => { /* 안내 띠는 보조 기능이라 실패하면 띄우지 않는다 */ });
    return () => controller.abort();
  }, [userId]);

  const current = loaded && user && loaded.userId === user.id ? loaded : null;
  const status = current?.status ?? null;
  if (current?.done) return <p className="sr-only" role="status">새 약관에 동의했어요.</p>;
  if (!user || hidden || !status || status.required.length === 0) return null;

  const docs = status.documents.filter(d => status.required.includes(d.document));
  const agree = async () => {
    setBusy(true);
    setError(null);
    try {
      const next = await legalApi.agree(docs.map(d => ({ document: d.document, version: d.currentVersion })));
      if (user) setLoaded({ userId: user.id, status: next, done: next.required.length === 0 });
    } catch (err) {
      setError(errorMessage(err, "동의를 저장하지 못했어요. 잠시 뒤 다시 시도해요."));
    } finally {
      setBusy(false);
    }
  };
  const later = () => {
    try { sessionStorage.setItem(DISMISS_KEY, "1"); } catch { /* 저장소를 못 쓰면 이번 화면에서만 숨긴다 */ }
    setHidden(true);
  };

  return (
    <section className="reconsent" role="region" aria-label="약관 변경 동의">
      <div className="reconsent-inner">
        <div className="reconsent-text">
          <strong>{docs.some(d => d.agreedVersion) ? "약관이 바뀌었어요. 새 버전을 확인하고 동의해 주세요." : "이용약관과 개인정보처리방침 동의가 필요해요."}</strong>
          <ul>
            {docs.map(d => (
              <li key={d.document}>
                <Link to={DOCUMENT_PATH[d.document]}>{DOCUMENT_LABEL[d.document]} {d.currentVersion}</Link>
                <span className="faint"> {formatDate(d.effectiveDate)}부터 시행{d.agreedVersion ? ` · 내가 동의한 버전 ${d.agreedVersion}` : ""}</span>
              </li>
            ))}
          </ul>
          {error && <p className="form-error" role="alert">{error}</p>}
        </div>
        <div className="reconsent-actions">
          <button type="button" className="btn btn-primary btn-small" onClick={agree} disabled={busy}>{busy ? "저장하고 있어요…" : "읽었고 동의해요"}</button>
          <button type="button" className="btn btn-secondary btn-small" onClick={later} disabled={busy}>나중에</button>
        </div>
      </div>
    </section>
  );
}
