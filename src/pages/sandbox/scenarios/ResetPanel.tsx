import { useState, type FormEvent } from "react";
import { errorMessage } from "../../../api/client";
import { CONFIRM_PHRASE, scenariosApi, type SandboxResetResult } from "../../../api/scenarios";
import StatusChip from "../../../components/StatusChip";
import { formatDate } from "../../../lib/format";

/**
 * 초기화 구역(S-260 아래). 확인 문구 "초기화"를 정확히 입력해야 버튼이 켜진다(계정 설정의 탈퇴와 같은 방식).
 * 결과는 aria-live 한 줄로: 지운 계약·신청·알림 수와 새 영업일.
 */
export default function ResetPanel({ disabled, onReset }: { disabled: boolean; onReset: (result: SandboxResetResult) => void }) {
  const [phrase, setPhrase] = useState("");
  const [clearProfile, setClearProfile] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<SandboxResetResult | null>(null);
  const ready = phrase.trim() === CONFIRM_PHRASE;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!ready || busy || disabled) return;
    setBusy(true);
    setError(null);
    setDone(null);
    try {
      const result = await scenariosApi.reset(clearProfile);
      setDone(result);
      setPhrase("");
      onReset(result);
    } catch (err) {
      setError(errorMessage(err, "초기화하지 못했어요. 잠시 뒤 다시 시도해요."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="panel scenario-danger" aria-labelledby="reset-title">
      <div className="scenario-danger-head">
        <h2 id="reset-title">샌드박스 초기화</h2>
        <StatusChip label="되돌릴 수 없음" tone="danger" />
      </div>
      <p>장면 없이 처음부터 다시 하고 싶을 때 써요. 내 샌드박스만 비우고 다른 학습자에게는 영향이 없어요.</p>
      <dl className="def-list scenario-reset-scope">
        <div><dt>지우는 것</dt><dd>신청·심사 결과, 계약·회차표·거래, 연체·건전성 이력·충당금, 알림, 결제계좌 기록</dd></div>
        <div><dt>되돌리는 것</dt><dd>결제계좌 잔액 0원, 영업일은 오늘 날짜</dd></div>
        <div><dt>남는 것</dt><dd>가상 고객 프로필(아래에서 함께 지울 수 있어요), 확인 문제·학습 기록, 계정</dd></div>
      </dl>
      <form className="scenario-reset-form" onSubmit={submit} aria-busy={busy} noValidate>
        <label className="field-check">
          <input type="checkbox" checked={clearProfile} onChange={e => setClearProfile(e.target.checked)} />
          <span>가상 고객 프로필도 지우기</span>
        </label>
        <div className="field">
          <label className="field-label" htmlFor="reset-phrase">확인 문구</label>
          <input id="reset-phrase" className="field-input" type="text" autoComplete="off" value={phrase} onChange={e => setPhrase(e.target.value)} aria-describedby="reset-hint" required />
          <p id="reset-hint" className="field-hint">"{CONFIRM_PHRASE}"라고 입력하면 버튼이 켜져요.</p>
        </div>
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="form-actions">
          <button className="btn btn-danger" type="submit" disabled={!ready || busy || disabled}>{busy ? "지우고 있어요…" : "내 샌드박스 초기화"}</button>
        </div>
      </form>
      <p className="scenario-reset-result" aria-live="polite">
        {done && <>초기화했어요. 계약 {done.deleted.contracts}건 · 신청 {done.deleted.applications}건 · 알림 {done.deleted.notifications}건을 지웠고 영업일은 {formatDate(done.businessDate)}이에요{done.profileKept ? "(프로필은 남겼어요)" : ""}.</>}
      </p>
    </section>
  );
}
