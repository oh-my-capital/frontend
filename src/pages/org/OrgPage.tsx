import { useCallback, useState, type CSSProperties, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { ApiError, errorMessage } from "../../api/client";
import { ORG_ROLE_LABEL, ORG_STATUS, organizationApi, type MyOrganization, type OrgProgress } from "../../api/organization";
import DataTable, { type Column } from "../../components/DataTable";
import EmptyState from "../../components/EmptyState";
import LoadError from "../../components/LoadError";
import Loading from "../../components/Loading";
import ProgressBar from "../../components/ProgressBar";
import StatusChip from "../../components/StatusChip";
import SubPageHeader from "../../components/SubPageHeader";
import { formatDate } from "../../lib/format";
import { useLoad } from "../calculators/parts/useLoad";
import "../../styles/org.css";

/**
 * 내 기관(S-350~352, FR-57·58, WP35). 미가입이면 초대 코드 + 공유 범위 안내 + 동의 체크, 가입하면 기관 정보·나가기,
 * 기관 담당자(MANAGER)면 같은 화면 아래에 구성원 진척 표와 CSV 내려받기를 그린다. 담당자는 학습 진척만 보고 샌드박스는 보지 않는다.
 */
export default function OrgPage() {
  const mine = useLoad<MyOrganization>(signal => organizationApi.mine(signal), []);
  const data = mine.data;

  return (
    <>
      <SubPageHeader
        section="learn"
        current="/org"
        title="내 기관(교육 과정)"
        description="연수·강의 기관에서 받은 초대 코드로 교육 과정에 합류해요. 합류하면 기관 담당자가 개념 완료 수·문제 정답률·미션 달성 수·최근 학습일을 볼 수 있고, 모의 여신 샌드박스의 내용은 보지 않아요."
        meta={data?.joined && data.organization ? `${data.organization.name} · ${ORG_ROLE_LABEL[data.role ?? "MEMBER"]}` : undefined}
      />
      <main className="page-main org">
        {mine.error != null && <LoadError error={mine.error} onRetry={mine.reload} />}
        {!data && mine.error == null && <Loading message="내 기관을 불러오고 있어요" minHeight={200} />}
        {data && !data.joined && <JoinSection data={data} onJoined={mine.setData} />}
        {data && data.joined && (
          <>
            <MembershipSection data={data} onLeft={mine.reload} />
            {data.role === "MANAGER" && <ProgressSection />}
          </>
        )}
        <div className="next-actions">
          <Link to="/course">입문 과정 →</Link>
          <Link to="/missions">학습 미션 →</Link>
          <Link to="/me/learning">내 학습 기록 →</Link>
        </div>
      </main>
    </>
  );
}

function SharingTable({ data }: { data: MyOrganization }) {
  const rows = Math.max(data.sharedItems.length, data.notShared.length);
  return (
    <table className="table table-compact org-sharing">
      <caption>공유 범위<span className="table-caption-note">기관 담당자 화면과 CSV에 나오는 항목이에요. 나가거나 탈퇴하면 그때부터 보이지 않아요.</span></caption>
      <thead>
        <tr><th scope="col">담당자가 보는 것</th><th scope="col">담당자가 보지 않는 것</th></tr>
      </thead>
      <tbody>
        {Array.from({ length: rows }, (_, i) => (
          <tr key={i}>
            <td>{data.sharedItems[i] ?? ""}</td>
            <td className="muted">{data.notShared[i] ?? ""}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function JoinSection({ data, onJoined }: { data: MyOrganization; onJoined: (d: MyOrganization) => void }) {
  const [code, setCode] = useState("");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!code.trim()) { setError("초대 코드 12자를 입력해요."); return; }
    if (!consent) { setError("공유 범위에 동의해야 합류할 수 있어요."); return; }
    setBusy(true);
    setError(null);
    try {
      onJoined(await organizationApi.join(code, consent));
    } catch (err) {
      setError(joinError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page-grid">
      <section className="stack org-stack" aria-labelledby="join-title">
        <div className="section-head">
          <div>
            <h2 id="join-title">초대 코드로 합류</h2>
            <p>기관 담당자에게 받은 12자 코드를 입력해요. 대소문자와 하이픈(-)은 구분하지 않아요. 한 번에 한 기관에만 속할 수 있어요.</p>
          </div>
        </div>
        <form className="panel org-join" onSubmit={submit} noValidate>
          <div className="field">
            <label className="field-label" htmlFor="org-code">초대 코드</label>
            <input
              id="org-code"
              className="field-input org-code-input"
              value={code}
              onChange={e => setCode(e.target.value)}
              placeholder="예: 7KQ2-M9XD-4TNV"
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              maxLength={20}
              aria-describedby="org-code-hint"
            />
            <span id="org-code-hint" className="field-hint">코드는 발급할 때 정한 날까지만 쓸 수 있어요. 지났다면 담당자에게 새 코드를 받아요.</span>
          </div>
          <SharingTable data={data} />
          <label className="field-check">
            <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} />
            <span>위 “담당자가 보는 것”을 이 기관의 담당자에게 공유하는 데 동의해요. 동의한 시각이 기록돼요.</span>
          </label>
          {error && <p className="form-error" role="alert">{error}</p>}
          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={busy || !consent}>{busy ? "합류하고 있어요" : "동의하고 합류"}</button>
          </div>
        </form>
      </section>
      <aside>
        <div className="panel panel-soft">
          <div className="panel-head"><h3>이메일은 가려서 보여요</h3></div>
          <p className="org-aside-text">담당자에게는 이메일 앞 두 글자와 도메인만 보여요. 예를 들어 abcdef@example.com 은 ab***@example.com 으로 나와요.</p>
        </div>
        <div className="panel panel-soft">
          <div className="panel-head"><h3>언제든 나갈 수 있어요</h3></div>
          <p className="org-aside-text">합류한 뒤 이 화면에서 “기관 나가기”를 누르면 구성원 기록이 지워지고 담당자 화면에서 빠져요. 계정을 탈퇴해도 함께 지워져요.</p>
        </div>
        <p className="org-note" role="note">교육용 모의 서비스예요. 기관 과정은 학습 기록 공유만 하며 수료증·학점·실제 자격과 연결되지 않아요.</p>
      </aside>
    </div>
  );
}

function joinError(err: unknown): string {
  if (err instanceof ApiError) {
    switch (err.code) {
      case "INVITE_NOT_FOUND": return "초대 코드를 찾지 못했어요. 받은 코드 12자를 다시 확인해요.";
      case "INVITE_EXPIRED": return "초대 코드의 유효 기간이 지났어요. 기관 담당자에게 새 코드를 받아요.";
      case "SEATS_FULL": return "이 기관의 좌석이 모두 찼어요. 기관 담당자에게 문의해요.";
      case "ALREADY_IN_ORGANIZATION": return "이미 다른 기관에 속해 있어요. 지금 기관에서 나간 뒤 다시 시도해요.";
      case "ORGANIZATION_ENDED": return "교육 기간이 끝난 기관이에요.";
      case "CONSENT_REQUIRED": return "공유 범위에 동의해야 합류할 수 있어요.";
      default: break;
    }
  }
  return errorMessage(err, "합류하지 못했어요. 잠시 뒤 다시 시도해요.");
}

function MembershipSection({ data, onLeft }: { data: MyOrganization; onLeft: () => void }) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const focusOnMount = useCallback((el: HTMLButtonElement | null) => { el?.focus(); }, []);
  const org = data.organization;
  if (!org) return null;
  const status = ORG_STATUS[org.status];

  const leave = async () => {
    setBusy(true);
    setError(null);
    try {
      await organizationApi.leave();
      onLeft();
    } catch (err) {
      setError(errorMessage(err, "기관에서 나가지 못했어요. 잠시 뒤 다시 시도해요."));
      setBusy(false);
    }
  };

  return (
    <div className="page-grid">
      <section className="stack org-stack" aria-labelledby="membership-title">
        <h2 id="membership-title" className="sr-only">소속 기관</h2>
        <dl className="figure-row" style={{ "--figure-cols": 3 } as CSSProperties}>
          <div><dt>기관</dt><dd className="org-figure-name">{org.name}</dd></div>
          <div><dt>기관 역할</dt><dd>{ORG_ROLE_LABEL[data.role ?? "MEMBER"]}<small>{data.role === "MANAGER" ? "구성원 진척을 볼 수 있어요" : "학습 진척을 공유해요"}</small></dd></div>
          <div><dt>교육 기간</dt><dd className="org-figure-date">{formatDate(org.startsOn)} ~ {formatDate(org.endsOn)}<small><StatusChip label={status.label} tone={status.tone} /></small></dd></div>
        </dl>
        <div className="panel">
          <div className="panel-head">
            <h3>공유 중인 항목</h3>
            <p>{formatDate(data.consentedAt?.slice(0, 10))}에 동의했어요. 담당자는 아래 항목만 보고, 모의 여신 샌드박스·알림·증명서는 보지 않아요.</p>
          </div>
          <ul className="org-shared-list">
            {data.sharedItems.map(item => <li key={item}>{item}</li>)}
          </ul>
        </div>
        <div className="panel org-leave">
          <div className="panel-head">
            <h3>기관 나가기</h3>
            <p>나가면 구성원 기록이 지워지고 담당자 화면·CSV에서 빠져요. 학습 기록 자체는 내 계정에 그대로 남아요. 다시 들어오려면 초대 코드가 필요해요.</p>
          </div>
          {!confirming ? (
            <button type="button" className="btn btn-danger btn-small" onClick={() => setConfirming(true)}>기관 나가기</button>
          ) : (
            <div className="org-confirm" role="group" aria-label="기관 나가기 확인">
              <p>“{org.name}”에서 나가요. 담당자에게 더 이상 진척이 공유되지 않아요.</p>
              <div className="btn-row">
                <button type="button" className="btn btn-danger btn-small" onClick={leave} disabled={busy}>{busy ? "나가고 있어요" : "나가기"}</button>
                <button type="button" className="btn btn-secondary btn-small" ref={focusOnMount} onClick={() => setConfirming(false)} disabled={busy}>취소</button>
              </div>
            </div>
          )}
          {error && <p className="form-error" role="alert">{error}</p>}
        </div>
      </section>
      <aside>
        <p className="org-note" role="note">교육용 모의 서비스예요. 기관 과정은 학습 기록 공유만 하며 수료증·학점·실제 자격과 연결되지 않아요.</p>
      </aside>
    </div>
  );
}

function ProgressSection() {
  const progress = useLoad<OrgProgress>(signal => organizationApi.progress(signal), []);
  const [downloading, setDownloading] = useState(false);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const p = progress.data;

  const download = async () => {
    setDownloading(true);
    setNotice(null);
    try {
      const name = await organizationApi.downloadCsv();
      setNotice({ ok: true, text: `${name} 파일을 내려받았어요.` });
    } catch (err) {
      setNotice({ ok: false, text: errorMessage(err, "CSV를 내려받지 못했어요. 잠시 뒤 다시 시도해요.") });
    } finally {
      setDownloading(false);
    }
  };

  const columns: Column<OrgProgress["members"][number]>[] = p ? [
    { key: "no", header: "구성원", rowHeader: true, nowrap: true, render: r => <><span className="org-member-no">{r.memberId}</span><span className="org-sub faint">{r.emailMasked}</span></> },
    { key: "role", header: "역할", nowrap: true, render: r => <StatusChip label={ORG_ROLE_LABEL[r.role]} tone={r.role === "MANAGER" ? "info" : "neutral"} /> },
    {
      key: "concepts", header: "개념 완료", render: r => (
        <div className="org-bar">
          <span className="num">{r.conceptsCompleted} / {p.conceptsTotal}</span>
          <ProgressBar value={r.conceptsCompleted} total={p.conceptsTotal} label={`개념 ${p.conceptsTotal}개 중 ${r.conceptsCompleted}개 완료`} tone="good" />
        </div>
      ),
    },
    { key: "accuracy", header: "정답률", numeric: true, render: r => r.quizAccuracy == null ? <span className="faint">시도 없음</span> : <>{r.quizAccuracy.toFixed(2)}%<span className="org-sub faint">채점 {r.quizAttempts}회</span></> },
    { key: "missions", header: "미션 달성", numeric: true, render: r => `${r.missionsCompleted} / ${p.missionsTotal}` },
    { key: "last", header: "최근 학습일", nowrap: true, render: r => r.lastStudiedOn ? formatDate(r.lastStudiedOn) : <span className="faint">기록 없음</span> },
    { key: "joined", header: "합류일", nowrap: true, render: r => formatDate(r.joinedOn) },
  ] : [];

  return (
    <section className="stack org-progress" aria-labelledby="progress-title">
      <div className="section-head">
        <div>
          <h2 id="progress-title">구성원 진척</h2>
          <p>기관 담당자에게만 보여요. 정답률은 채점 시도 점수의 평균이고, 미션 달성은 학습자가 미션 화면을 열 때 판정된 값이에요.</p>
        </div>
        <button type="button" className="btn btn-secondary btn-small" onClick={download} disabled={downloading || !p}>{downloading ? "만들고 있어요" : "CSV 내려받기"}</button>
      </div>
      <p className="sr-only" aria-live="polite">{notice?.ok ? notice.text : ""}</p>
      {notice && (notice.ok ? <p className="form-done">{notice.text}</p> : <p className="form-error" role="alert">{notice.text}</p>)}
      {progress.error != null && <LoadError error={progress.error} onRetry={progress.reload} />}
      {!p && progress.error == null && <Loading message="구성원 진척을 모으고 있어요" minHeight={160} />}
      {p && (
        <>
          <dl className="figure-row" style={{ "--figure-cols": 4 } as CSSProperties}>
            <div><dt>구성원 / 좌석</dt><dd>{p.summary.members}<small>/ {p.summary.seatLimit}석</small></dd></div>
            <div><dt>최근 7일 학습</dt><dd>{p.summary.activeLast7Days}명</dd></div>
            <div><dt>개념 완료 평균</dt><dd>{p.summary.avgConceptsCompleted.toFixed(1)}<small>/ {p.conceptsTotal}개</small></dd></div>
            <div><dt>전체 미션</dt><dd>{p.missionsTotal}개</dd></div>
          </dl>
          {p.members.length === 0 ? (
            <EmptyState title="아직 합류한 구성원이 없어요" description="운영자에게 받은 초대 코드를 학습자에게 나눠 주면 합류한 순서대로 여기에 나타나요." />
          ) : (
            <DataTable
              caption="구성원별 학습 진척"
              captionNote={`기준 ${formatDate(p.asOf.slice(0, 10))}. 이메일은 앞 두 글자만 보이고, 모의 여신 샌드박스(가상 고객·계약·원장)는 보이지 않는다.`}
              columns={columns}
              rows={p.members}
              rowKey={r => r.memberId}
              scroll
              compact
            />
          )}
        </>
      )}
    </section>
  );
}
