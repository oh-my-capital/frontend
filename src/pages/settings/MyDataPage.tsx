import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { errorMessage } from "../../api/client";
import { CHANNEL_LABEL, DOCUMENT_LABEL, DOCUMENT_PATH, legalApi, type ConsentStatus } from "../../api/legal";
import Icon from "../../components/Icon";
import LoadError from "../../components/LoadError";
import Loading from "../../components/Loading";
import { setDocumentTitle } from "../../components/PageTitle";
import StatusChip from "../../components/StatusChip";
import SubPageHeader from "../../components/SubPageHeader";
import { useAuth } from "../../context/AuthContext";
import { formatDate } from "../../lib/format";
import { useLoad } from "../learn/useLoad";
import { formatBytes, formatKstDateTime } from "../legal/format";
import "../../styles/legal.css";

/**
 * 내 데이터(S-362, `/settings/data`, FR-60): JSON 한 파일 내려받기 · 동의 기록과 재동의 · 탈퇴 시 지워지는 범위.
 * 범위는 business-rules "WP36 — 약관·동의·내 데이터"의 내보내기·탈퇴 표와 같다.
 */
export default function MyDataPage() {
  const { user } = useAuth();
  const consents = useLoad<ConsentStatus>(signal => legalApi.consents(signal), []);
  useEffect(() => { setDocumentTitle("내 데이터 · 계정"); }, []);
  return (
    <>
      <SubPageHeader
        section="account"
        current="/settings/data"
        title="내 데이터"
        description="이 서비스가 나에 대해 가진 기록을 JSON 파일 하나로 내려받고, 약관·처리방침 동의 기록을 확인해요. 탈퇴하면 무엇이 지워지는지도 여기에 적었어요."
        meta={user ? `${user.email} · ${user.role === "ADMIN" ? "운영자" : "일반 사용자"}` : undefined}
      />
      <main className="page-main legal my-data">
        <div className="page-grid">
          <div className="stack legal-stack">
            <DownloadPanel />
            <section className="panel" aria-labelledby="consent-title">
              <h2 id="consent-title">동의 기록</h2>
              <p className="muted">가입할 때와 새 버전이 시행될 때 받은 동의예요. 동의한 버전·시각·경로만 남기고 IP나 기기 정보는 저장하지 않아요.</p>
              {consents.error ? (
                <LoadError error={consents.error} message="동의 기록을 불러오지 못했어요. 잠시 뒤 다시 시도해요." onRetry={consents.retry} />
              ) : !consents.data ? (
                <Loading message="동의 기록을 불러오고 있어요" />
              ) : (
                <ConsentTable status={consents.data} onChange={consents.retry} />
              )}
            </section>
            <DeletionScope />
          </div>
          <aside aria-label="관련 문서">
            <div className="panel panel-soft">
              <h3>문서</h3>
              <ul className="legal-sources">
                <li><Link to="/legal/privacy">개인정보처리방침</Link><span className="faint">처리 항목·보관 기간·권리 행사 방법</span></li>
                <li><Link to="/legal/terms">이용약관</Link><span className="faint">서비스 성격·탈퇴</span></li>
              </ul>
            </div>
            <div className="panel panel-soft">
              <h3>내 권리</h3>
              <dl className="def-list legal-rights">
                <div><dt>열람</dt><dd>이 화면에서 바로 내려받아요.</dd></div>
                <div><dt>정정</dt><dd>비밀번호는 계정 설정, 가상 프로필은 모의 여신에서 고쳐요.</dd></div>
                <div><dt>삭제</dt><dd>탈퇴하면 바로 지워져요.</dd></div>
              </dl>
            </div>
          </aside>
        </div>
        <div className="next-actions">
          <Link to="/settings">계정 설정 <Icon name="next" size={16} /></Link>
          <Link to="/me/learning">내 학습 <Icon name="next" size={16} /></Link>
          <Link to="/sandbox">내 샌드박스 <Icon name="next" size={16} /></Link>
        </div>
      </main>
    </>
  );
}

function DownloadPanel() {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const download = async () => {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const { filename, size } = await legalApi.downloadMyData();
      setResult(`${filename}을 내려받았어요(${formatBytes(size)}).`);
    } catch (err) {
      setError(errorMessage(err, "내 데이터를 내려받지 못했어요. 잠시 뒤 다시 시도해요."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="panel" aria-labelledby="download-title">
      <h2 id="download-title">내 데이터 내려받기</h2>
      <p className="muted">지금 저장된 기록을 바로 JSON 파일 하나로 만들어요. 표 이름별로 행이 들어 있고, 열 이름은 데이터베이스와 같아요.</p>
      <dl className="def-list legal-scope">
        <div><dt>계정</dt><dd>이메일 · 역할 · 가입 시각</dd></div>
        <div><dt>동의</dt><dd>문서별 동의 버전 · 시각 · 경로 전체</dd></div>
        <div><dt>학습</dt><dd>개념별 진척 · 확인 문제 답안과 점수 · 미션 달성</dd></div>
        <div><dt>샌드박스</dt><dd>가상 프로필 · 결제계좌 원장 · 신청·심사 근거 · 계약·회차·거래·연체·충당금 · 사건·알림 · 증명서 발급 이력</dd></div>
        <div><dt>빠지는 것</dt><dd>비밀번호 해시 · 로그인 세션 · 멱등 키 같은 보안·기술 기록, 계정과 연결하지 않은 익명 이용 지표(파일 안 excluded 에 이유를 적어요)</dd></div>
      </dl>
      <div className="form-actions">
        <button type="button" className="btn btn-primary" onClick={download} disabled={busy}>
          {busy ? "파일을 만들고 있어요…" : "JSON 파일 내려받기"}
        </button>
      </div>
      <p className="legal-live" aria-live="polite">{result}</p>
      {error && <p className="form-error" role="alert">{error}</p>}
    </section>
  );
}

function ConsentTable({ status, onChange }: { status: ConsentStatus; onChange: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const required = status.documents.filter(d => d.reconsentRequired);

  const agree = async () => {
    setBusy(true);
    setError(null);
    try {
      await legalApi.agree(required.map(d => ({ document: d.document, version: d.currentVersion })));
      onChange();
    } catch (err) {
      setError(errorMessage(err, "동의를 저장하지 못했어요. 잠시 뒤 다시 시도해요."));
      setBusy(false);
    }
  };

  return (
    <>
      <div className="table-scroll">
        <table className="table table-compact">
          <caption>문서별 현재 상태</caption>
          <thead><tr><th scope="col">문서</th><th scope="col">내가 동의한 버전</th><th scope="col">현재 버전</th><th scope="col">동의 시각</th><th scope="col">상태</th></tr></thead>
          <tbody>
            {status.documents.map(d => (
              <tr key={d.document}>
                <th scope="row"><Link to={DOCUMENT_PATH[d.document]}>{DOCUMENT_LABEL[d.document]}</Link></th>
                <td className="nowrap">{d.agreedVersion ?? "—"}</td>
                <td className="nowrap">{d.currentVersion}{!d.inEffect && <span className="faint"> ({formatDate(d.effectiveDate)} 시행 예정)</span>}</td>
                <td className="nowrap">{formatKstDateTime(d.agreedAt)}</td>
                <td>{d.reconsentRequired ? <StatusChip label="재동의 필요" tone="warn" /> : <StatusChip label="최신" tone="good" />}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {required.length > 0 && (
        <div className="form-actions legal-reconsent-row">
          <button type="button" className="btn btn-primary btn-small" onClick={agree} disabled={busy}>
            {busy ? "저장하고 있어요…" : `새 버전에 동의(${required.map(d => DOCUMENT_LABEL[d.document]).join("·")})`}
          </button>
        </div>
      )}
      {error && <p className="form-error" role="alert">{error}</p>}
      {status.history.length > 0 && (
        <details className="fold legal-history">
          <summary>동의 이력 {status.history.length}건</summary>
          <div className="fold-body">
            <ol>
              {status.history.map((h, i) => (
                <li key={i}>{formatKstDateTime(h.agreedAt)} · {DOCUMENT_LABEL[h.document]} {h.version} · {CHANNEL_LABEL[h.channel]}</li>
              ))}
            </ol>
          </div>
        </details>
      )}
    </>
  );
}

function DeletionScope() {
  return (
    <section className="panel" aria-labelledby="deletion-title">
      <h2 id="deletion-title">탈퇴하면 지워지는 범위</h2>
      <p className="muted">탈퇴는 계정 설정에서 확인 문구를 입력해 해요. 지운 기록은 되돌릴 수 없으니 필요하면 먼저 내려받아요.</p>
      <div className="table-scroll">
        <table className="table table-compact">
          <caption>탈퇴 시 처리</caption>
          <thead><tr><th scope="col">구분</th><th scope="col">내용</th></tr></thead>
          <tbody>
            <tr><th scope="row">바로 지워짐</th><td>계정(이메일·비밀번호 해시), 로그인 세션, 동의 기록, 학습 진척·문제 기록, 미션, 샌드박스 전체(가상 프로필·결제계좌 원장·신청·심사·계약·회차·거래·연체·충당금·사건·알림·증명서 발급 이력), 기관 소속</td></tr>
            <tr><th scope="row">남는 것</th><td>계정과 연결하지 않은 익명 이용 지표(보관 기간이 지나면 삭제), DB 백업 사본(백업 보관 기간이 지나면 삭제)</td></tr>
            <tr><th scope="row">다시 가입</th><td>같은 이메일로 다시 가입할 수 있어요. 이전 기록은 돌아오지 않아요.</td></tr>
            <tr><th scope="row">탈퇴 불가</th><td>운영자 계정은 운영 기록을 남겨야 해서 화면에서 탈퇴할 수 없어요.</td></tr>
          </tbody>
        </table>
      </div>
      <div className="btn-row">
        <Link className="btn btn-secondary btn-small" to="/settings#withdraw-title">탈퇴하러 가기</Link>
      </div>
    </section>
  );
}
