import { useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { errorMessage } from "../../../api/client";
import {
  ORG_ROLE_LABEL,
  ORG_STATUS,
  organizationApi,
  type AdminMember,
  type IssuedInvite,
  type OrganizationDetail,
  type OrganizationSummary,
  type OrgRole,
} from "../../../api/organization";
import DataTable from "../../../components/DataTable";
import EmptyState from "../../../components/EmptyState";
import LoadError from "../../../components/LoadError";
import Loading from "../../../components/Loading";
import { ForbiddenPage } from "../../../components/ProtectedRoute";
import StatusChip from "../../../components/StatusChip";
import SubPageHeader from "../../../components/SubPageHeader";
import { formatDate } from "../../../lib/format";
import { formatDateTime, isForbidden, requestIdOf, todayIso } from "../parts/adminLabels";
import { useLoad } from "../parts/useLoad";
import "../../../styles/org.css";

/**
 * 기관 관리(S-353, FR-57, WP35): 기관 만들기(이름·좌석·기간) → 기관 목록 → 고른 기관의 상세 패널
 * (초대 코드 발급·복사, 발급 이력, 구성원 역할 지정). 초대 코드 원문은 발급 응답에서 한 번만 받으므로 화면을 떠나면 다시 볼 수 없다.
 */
export default function AdminOrganizationsPage() {
  const [params, setParams] = useSearchParams();
  const selected = Number(params.get("org") ?? "") || null;
  const list = useLoad(() => organizationApi.list(), []);
  if (isForbidden(list.error)) return <ForbiddenPage requestId={requestIdOf(list.error)} />;

  const select = (id: number | null) => {
    const copy = new URLSearchParams(params);
    if (id) copy.set("org", String(id)); else copy.delete("org");
    setParams(copy, { replace: true });
  };

  return (
    <>
      <SubPageHeader
        section="admin"
        current="/admin/organizations"
        title="기관 관리"
        description="연수·강의 기관을 만들고 좌석 수와 교육 기간을 정해요. 초대 코드를 발급해 기관에 전달하면 학습자가 진척 공유에 동의하고 합류하며, 합류한 사람 중 강사·연수 담당을 기관 담당자로 지정해요."
      />
      <main className="page-main admin-main org-admin">
        <p className="admin-note" role="note">
          교육용 모의 서비스예요. 기관 담당자는 구성원의 학습 진척(개념 완료·정답률·미션·최근 학습일)과 가린 이메일만 보며, 모의 여신 샌드박스는 보지 않아요.
        </p>
        <div className="admin-grid">
          <div className="stack admin-stack">
            <CreateForm onCreated={org => { list.reload(); select(org.id); }} />
            <section aria-labelledby="org-list-title">
              <div className="section-head">
                <div>
                  <h2 id="org-list-title">기관 목록</h2>
                  <p>최근에 만든 순서. 좌석은 담당자를 포함한 구성원 수로 센다. 기관 이름을 누르면 상세가 열린다.</p>
                </div>
              </div>
              {list.loading && !list.data && <Loading message="기관 목록을 불러오고 있어요" minHeight={160} />}
              {list.error != null && <LoadError error={list.error} onRetry={list.reload} />}
              {list.data && list.data.length === 0 && (
                <EmptyState title="아직 만든 기관이 없어요" description="위 양식에서 첫 기관을 만들고 초대 코드를 발급해요." />
              )}
              {list.data && list.data.length > 0 && <OrgTable rows={list.data} selected={selected} onSelect={id => select(id === selected ? null : id)} />}
            </section>
          </div>
          <aside>
            {selected ? <DetailPanel key={selected} id={selected} onChanged={list.reload} onClose={() => select(null)} /> : <GuidePanel />}
          </aside>
        </div>
        <div className="next-actions">
          <Link to="/org">학습자 화면(내 기관) 보기 →</Link>
          <Link to="/admin/audit">운영 이력 →</Link>
        </div>
      </main>
    </>
  );
}

function CreateForm({ onCreated }: { onCreated: (org: OrganizationDetail) => void }) {
  const today = todayIso();
  const [name, setName] = useState("");
  const [seats, setSeats] = useState("30");
  const [startsOn, setStartsOn] = useState(today);
  const [endsOn, setEndsOn] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setDone(null);
    const seatLimit = Number(seats);
    if (name.trim().length < 2) { setError("기관 이름을 2자 이상 입력해요."); return; }
    if (!Number.isInteger(seatLimit) || seatLimit < 1 || seatLimit > 500) { setError("좌석 수는 1~500 사이의 정수로 입력해요."); return; }
    if (!startsOn || !endsOn) { setError("시작일과 종료일을 모두 골라요."); return; }
    setBusy(true);
    try {
      const org = await organizationApi.create({ name: name.trim(), seatLimit, startsOn, endsOn });
      setDone(`“${org.name}” 기관을 만들었어요. 오른쪽에서 초대 코드를 발급해요.`);
      setName("");
      onCreated(org);
    } catch (err) {
      setError(errorMessage(err, "기관을 만들지 못했어요. 입력값을 확인해요."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section aria-labelledby="org-create-title">
      <div className="section-head">
        <div>
          <h2 id="org-create-title">기관 만들기</h2>
          <p>이름은 2~80자, 좌석은 1~500석이다. 종료일이 지나면 새로 합류할 수 없고 담당자는 기록을 계속 볼 수 있다.</p>
        </div>
      </div>
      <form className="panel org-create" onSubmit={submit} noValidate>
        <div className="field org-create-name">
          <label className="field-label" htmlFor="org-name">기관 이름</label>
          <input id="org-name" className="field-input" value={name} onChange={e => setName(e.target.value)} maxLength={80} placeholder="예: 2026 하반기 여신실무 연수" />
        </div>
        <div className="field">
          <label className="field-label" htmlFor="org-seats">좌석 수</label>
          <div className="field-affix">
            <input id="org-seats" className="field-input num" inputMode="numeric" value={seats} onChange={e => setSeats(e.target.value.replace(/\D/g, ""))} />
            <span>석</span>
          </div>
        </div>
        <div className="field">
          <label className="field-label" htmlFor="org-starts">시작일</label>
          <input id="org-starts" type="date" className="field-input" value={startsOn} onChange={e => setStartsOn(e.target.value)} />
        </div>
        <div className="field">
          <label className="field-label" htmlFor="org-ends">종료일</label>
          <input id="org-ends" type="date" className="field-input" value={endsOn} min={startsOn || today} onChange={e => setEndsOn(e.target.value)} />
        </div>
        <div className="org-create-actions">
          {error && <p className="form-error" role="alert">{error}</p>}
          {done && <p className="form-done" role="status">{done}</p>}
          <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? "만들고 있어요" : "기관 만들기"}</button>
        </div>
      </form>
    </section>
  );
}

function OrgTable({ rows, selected, onSelect }: { rows: OrganizationSummary[]; selected: number | null; onSelect: (id: number) => void }) {
  return (
    <DataTable
      caption="기관"
      captionNote="상태는 오늘 날짜와 교육 기간으로 정한다(시작 전·진행 중·종료)."
      columns={[
        {
          key: "name", header: "기관", rowHeader: true, render: r => (
            <>
              <button type="button" className="admin-linklike" onClick={() => onSelect(r.id)} aria-pressed={r.id === selected}>{r.name}</button>
              <span className="admin-sub faint">기관 번호 {r.id}</span>
            </>
          ),
        },
        { key: "status", header: "상태", nowrap: true, render: r => <StatusChip label={ORG_STATUS[r.status].label} tone={ORG_STATUS[r.status].tone} /> },
        { key: "seats", header: "좌석 사용", numeric: true, render: r => `${r.memberCount} / ${r.seatLimit}` },
        { key: "managers", header: "담당자", numeric: true, render: r => `${r.managerCount}명` },
        { key: "period", header: "기간", nowrap: true, render: r => <>{formatDate(r.startsOn)}<span className="admin-sub faint">~ {formatDate(r.endsOn)}</span></> },
      ]}
      rows={rows}
      rowKey={r => r.id}
      selectedKey={selected}
      scroll
      compact
    />
  );
}

function GuidePanel() {
  return (
    <div className="panel panel-soft">
      <div className="panel-head">
        <h3>운영 순서</h3>
        <p>기관을 고르면 초대 코드 발급과 담당자 지정을 여기서 해요.</p>
      </div>
      <ol className="org-steps">
        <li>기관을 만들고 좌석 수와 기간을 정한다.</li>
        <li>초대 코드를 발급해 기관에 전달한다. 원문은 발급 직후에만 보인다.</li>
        <li>강사·연수 담당이 먼저 코드로 합류하면, 구성원 표에서 “담당자로 지정”을 누른다.</li>
        <li>담당자는 내 기관 화면에서 구성원 진척과 CSV를 본다.</li>
      </ol>
    </div>
  );
}

function DetailPanel({ id, onChanged, onClose }: { id: number; onChanged: () => void; onClose: () => void }) {
  const detail = useLoad(() => organizationApi.detail(id), [id]);
  const [issued, setIssued] = useState<IssuedInvite | null>(null);
  const [days, setDays] = useState("14");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string>("");
  const [roleBusy, setRoleBusy] = useState<number | null>(null);

  if (detail.error != null) return <LoadError error={detail.error} onRetry={detail.reload} />;
  const d = detail.data;
  if (!d) return <Loading message="기관 상세를 불러오고 있어요" minHeight={200} />;

  const issue = async (event: FormEvent) => {
    event.preventDefault();
    const n = Number(days);
    if (!Number.isInteger(n) || n < 1 || n > 90) { setError("유효 일수는 1~90일로 입력해요."); return; }
    setBusy(true);
    setError(null);
    setCopied("");
    try {
      setIssued(await organizationApi.issueInvite(id, n));
      detail.reload();
    } catch (err) {
      setError(errorMessage(err, "초대 코드를 발급하지 못했어요."));
    } finally {
      setBusy(false);
    }
  };

  const copy = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied("초대 코드를 복사했어요.");
    } catch {
      setCopied("복사하지 못했어요. 코드를 직접 선택해 복사해요.");
    }
  };

  const changeRole = async (m: AdminMember, role: OrgRole) => {
    setRoleBusy(m.userId);
    setError(null);
    try {
      await organizationApi.changeRole(id, m.userId, role);
      detail.reload();
      onChanged();
    } catch (err) {
      setError(errorMessage(err, "역할을 바꾸지 못했어요."));
    } finally {
      setRoleBusy(null);
    }
  };

  const status = ORG_STATUS[d.status];
  return (
    <div className="stack org-detail">
      <div className="panel">
        <div className="panel-head org-detail-head">
          <div>
            <h3>{d.name}</h3>
            <p>{formatDate(d.startsOn)} ~ {formatDate(d.endsOn)} · 좌석 {d.memberCount} / {d.seatLimit} · 담당자 {d.managerCount}명</p>
          </div>
          <StatusChip label={status.label} tone={status.tone} />
        </div>
        <form className="org-invite-form" onSubmit={issue} noValidate>
          <div className="field">
            <label className="field-label" htmlFor="invite-days">유효 일수</label>
            <div className="field-affix">
              <input id="invite-days" className="field-input num" inputMode="numeric" value={days} onChange={e => setDays(e.target.value.replace(/\D/g, ""))} />
              <span>일</span>
            </div>
            <span className="field-hint">1~90일. 기관 종료일 다음 날 0시보다 늦으면 그때로 줄어든다.</span>
          </div>
          <button type="submit" className="btn btn-primary btn-small" disabled={busy || d.status === "ENDED"}>{busy ? "발급하고 있어요" : "초대 코드 발급"}</button>
        </form>
        {d.status === "ENDED" && <p className="field-hint">종료된 기관에는 코드를 발급할 수 없어요.</p>}
        <div aria-live="polite">
          {issued && (
            <div className="org-issued">
              <p className="org-issued-label">새 초대 코드 · {formatDateTime(issued.expiresAt)}까지</p>
              <p className="org-issued-code"><code>{issued.code}</code></p>
              <div className="btn-row">
                <button type="button" className="btn btn-secondary btn-small" onClick={() => copy(issued.code)}>복사</button>
                {copied && <span className="faint">{copied}</span>}
              </div>
              <p className="org-issued-warn">서버는 이 코드를 저장하지 않아요(앞 4자와 해시만). 이 화면을 떠나면 다시 볼 수 없으니 지금 기관에 전달해요.</p>
            </div>
          )}
        </div>
        {error && <p className="form-error" role="alert">{error}</p>}
      </div>

      <DataTable
        caption="발급한 초대 코드"
        captionNote="원문은 보관하지 않으므로 앞 4자로 구별한다."
        columns={[
          { key: "prefix", header: "앞 4자", rowHeader: true, nowrap: true, render: r => <code>{r.codePrefix}-…</code> },
          { key: "created", header: "발급", nowrap: true, render: r => formatDateTime(r.createdAt) },
          { key: "expires", header: "만료", nowrap: true, render: r => formatDateTime(r.expiresAt) },
          { key: "state", header: "상태", nowrap: true, render: r => <StatusChip label={r.expired ? "만료" : "사용 가능"} tone={r.expired ? "neutral" : "good"} /> },
        ]}
        rows={d.invites}
        rowKey={r => r.id}
        emptyMessage="아직 발급한 코드가 없어요."
        scroll
        compact
      />

      <DataTable
        caption="구성원"
        captionNote="이메일은 가려서 보인다. 담당자는 이 기관 구성원의 학습 진척만 본다."
        columns={[
          { key: "email", header: "구성원", rowHeader: true, render: r => <>{r.emailMasked}<span className="admin-sub faint">합류 {formatDate(r.joinedAt.slice(0, 10))}</span></> },
          { key: "role", header: "역할", nowrap: true, render: r => <StatusChip label={ORG_ROLE_LABEL[r.role]} tone={r.role === "MANAGER" ? "info" : "neutral"} /> },
          {
            key: "action", header: "역할 바꾸기", nowrap: true, render: r => (
              <button type="button" className="btn btn-secondary btn-small" disabled={roleBusy === r.userId}
                onClick={() => changeRole(r, r.role === "MANAGER" ? "MEMBER" : "MANAGER")}>
                {r.role === "MANAGER" ? "학습자로 되돌리기" : "담당자로 지정"}
              </button>
            ),
          },
        ]}
        rows={d.members}
        rowKey={r => r.userId}
        emptyMessage="아직 합류한 구성원이 없어요. 초대 코드를 전달해요."
        scroll
        compact
      />
      <div className="btn-row">
        <button type="button" className="btn btn-secondary btn-small" onClick={onClose}>상세 닫기</button>
      </div>
    </div>
  );
}
