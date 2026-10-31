import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { adminAnalyticsApi, NOTE_MAX, NOTE_MIN, type CollectionItem, type CollectionQueue, type DelinquencyBucket } from "../../../api/adminAnalytics";
import { ApiError, errorMessage } from "../../../api/client";
import DataTable, { type Column } from "../../../components/DataTable";
import Disclosure from "../../../components/Disclosure";
import EmptyState from "../../../components/EmptyState";
import LoadError from "../../../components/LoadError";
import Loading from "../../../components/Loading";
import Money from "../../../components/Money";
import { ForbiddenPage } from "../../../components/ProtectedRoute";
import StatusChip, { statusLabel } from "../../../components/StatusChip";
import SubPageHeader from "../../../components/SubPageHeader";
import { FilterGroup } from "../../../components/Tabs";
import { formatDate, formatNumber } from "../../../lib/format";
import { formatDateTime, isForbidden, requestIdOf } from "../parts/adminLabels";
import { useLoad } from "../parts/useLoad";
import { BUCKETS, STATE_LABEL, bucketTone } from "../analytics/riskLabels";
import "../../../styles/admin-analytics.css";

/**
 * 연체 관리(S-221, FR-43, 교육용): 구간 거르개(건수·청구 합계) → 연체 계약 표 → 계약을 고르면 내부 메모 패널.
 * 연락·문자·추심·채권 매각 기능은 없다(ADR-001). 메모는 운영자끼리만 보는 기록이며 고객에게 가지 않는다.
 */
export default function AdminCollectionsPage() {
  const [params, setParams] = useSearchParams();
  const bucket = (params.get("bucket") ?? "") as DelinquencyBucket | "";
  const selected = Number(params.get("contract") ?? "") || null;
  const queue = useLoad(() => adminAnalyticsApi.collections(bucket), [bucket]);
  if (isForbidden(queue.error)) return <ForbiddenPage requestId={requestIdOf(queue.error)} />;

  const update = (key: string, value: string | null) => {
    const copy = new URLSearchParams(params);
    if (value) copy.set(key, value); else copy.delete(key);
    setParams(copy, { replace: true });
  };
  const current = queue.data?.items.find(i => i.contractId === selected) ?? null;

  return (
    <>
      <SubPageHeader
        section="admin"
        current="/admin/collections"
        title="연체 관리(교육용)"
        description="연체 중인 모의 계약을 구간별로 모아 연체일·미납 원리금·연체이자와 다음 단계(45일 통지·60일 기한이익상실·건전성 경계)의 예정일을 봐요. 운영자는 내부 메모만 남길 수 있고, 고객에게 연락하거나 문자를 보내는 기능은 없어요."
        meta={queue.data ? `기준 시점 ${formatDateTime(queue.data.asOf)}` : undefined}
      />
      <main className="page-main admin-main">
        <p className="admin-note collection-boundary" role="note">
          교육용 화면이에요. 실제 채권 추심·연락·문자 발송·채권 매각은 하지 않으며, 메모는 운영 기록으로만 남아요. 이메일은 앞 두 글자만 보여요.
        </p>
        <div className="admin-grid">
          <div className="stack admin-stack">
            <section aria-labelledby="queue-title">
              <div className="section-head">
                <div>
                  <h2 id="queue-title">연체 계약</h2>
                  <p>연체일 많은 순. 금액은 각 샌드박스의 마지막 일마감일 기준이며 청구 합계는 계약 상세의 “지금 갚을 금액”과 같은 정의다.</p>
                </div>
              </div>
              {queue.data && <BucketFilter queue={queue.data} bucket={bucket} onChange={b => { update("bucket", b); }} />}
              {queue.loading && !queue.data && <Loading message="연체 계약을 모으고 있어요" minHeight={240} />}
              {queue.error != null && <LoadError error={queue.error} onRetry={queue.reload} />}
              {queue.data && queue.data.items.length === 0 && (
                <EmptyState
                  title={bucket ? `${STATE_LABEL[bucket]} 구간의 연체 계약이 없어요` : "연체 중인 계약이 없어요"}
                  description="자동이체를 신청하지 않은 모의 계약이 납입일을 넘기면 다음 일마감부터 여기에 나타나요."
                  action={{ to: "/admin/analytics", label: "리스크 지표 보기" }}
                />
              )}
              {queue.data && queue.data.items.length > 0 && (
                <>
                  <QueueTable items={queue.data.items} selected={selected} onSelect={id => update("contract", id === selected ? null : String(id))} />
                  <Disclosure />
                </>
              )}
            </section>
          </div>
          <aside>
            {current ? <NotesPanel item={current} onClose={() => update("contract", null)} onSaved={queue.reload} /> : <ReadingPanel />}
          </aside>
        </div>
        <div className="next-actions">
          <Link to="/admin/analytics">리스크 지표로 →</Link>
          <Link to="/admin/audit?type=COLLECTION_NOTE">메모 이력 보기 →</Link>
          <Link to="/admin/portfolio">포트폴리오 →</Link>
        </div>
      </main>
    </>
  );
}

function BucketFilter({ queue, bucket, onChange }: { queue: CollectionQueue; bucket: DelinquencyBucket | ""; onChange: (b: DelinquencyBucket | null) => void }) {
  const total = queue.summary.reduce((s, b) => s + b.contracts, 0);
  const totalDue = queue.summary.reduce((s, b) => s + b.totalDue, 0);
  return (
    <div className="stack collection-filter">
      <FilterGroup label="연체 구간 거르개">
        <button type="button" className={bucket === "" ? "is-active" : undefined} aria-pressed={bucket === ""} onClick={() => onChange(null)}>전체 {formatNumber(total)}</button>
        {BUCKETS.map(b => {
          const s = queue.summary.find(x => x.bucket === b);
          return (
            <button key={b} type="button" className={bucket === b ? "is-active" : undefined} aria-pressed={bucket === b} onClick={() => onChange(b)}>
              {STATE_LABEL[b]} {formatNumber(s?.contracts ?? 0)}
            </button>
          );
        })}
      </FilterGroup>
      <DataTable
        caption="구간별 요약"
        captionNote="거르개와 관계없이 네 구간 전부. 청구 합계 = 미납 원금 + 미납 이자 + 연체이자."
        columns={[
          { key: "bucket", header: "구간", rowHeader: true, nowrap: true, render: r => <StatusChip label={r.label} tone={bucketTone(r.bucket)} /> },
          { key: "contracts", header: "계약", numeric: true, render: r => `${formatNumber(r.contracts)}건` },
          { key: "due", header: "청구 합계", numeric: true, render: r => <Money value={r.totalDue} /> },
        ]}
        rows={queue.summary}
        rowKey={r => r.bucket}
        footer={<tr><th scope="row">합계</th><td className="num">{formatNumber(total)}건</td><td className="num"><Money value={totalDue} /></td></tr>}
        compact
      />
    </div>
  );
}

function QueueTable({ items, selected, onSelect }: { items: CollectionItem[]; selected: number | null; onSelect: (id: number) => void }) {
  const columns: Column<CollectionItem>[] = [
    {
      key: "contract",
      header: "계약",
      rowHeader: true,
      nowrap: true,
      render: r => (
        <>
          <button type="button" className="admin-linklike" onClick={() => onSelect(r.contractId)} aria-pressed={r.contractId === selected}>{r.contractNo}</button>
          <span className="admin-sub faint">{r.productName}</span>
          <span className="admin-sub faint admin-email">{r.userEmailMasked}</span>
          {r.notes > 0 && <span className="admin-sub collection-note-count">메모 {r.notes}건</span>}
        </>
      ),
    },
    {
      key: "status",
      header: "상태·연체일",
      render: r => {
        const s = statusLabel(r.status);
        return (
          <>
            <StatusChip label={s.label} tone={s.tone} detail={` ${r.overdueDays}일`} />
            <span className="admin-sub faint">{STATE_LABEL[r.bucket]}</span>
            <span className="admin-sub faint">시작 {formatDate(r.startedOn)}</span>
          </>
        );
      },
    },
    {
      key: "due",
      header: "청구 합계",
      numeric: true,
      render: r => (
        <>
          <Money value={r.totalDue} strong />
          <span className="admin-sub faint collection-breakdown">원금 <Money value={r.unpaidPrincipal} /></span>
          <span className="admin-sub faint collection-breakdown">이자 <Money value={r.unpaidInterest} /> · 연체이자 <Money value={r.overdueInterest} /></span>
        </>
      ),
    },
    {
      key: "next",
      header: "다음 단계",
      render: r => r.nextStep ? (
        <>
          <span>{r.nextStep.label}</span>
          <span className="admin-sub faint">{formatDate(r.nextStep.dueOn)} · {r.nextStep.daysLeft > 0 ? `${r.nextStep.daysLeft}일 뒤` : r.nextStep.daysLeft === 0 ? "오늘 마감" : "지남"}</span>
        </>
      ) : <span className="faint">남은 단계 없음</span>,
    },
  ];
  return (
    <DataTable
      caption="연체 계약 목록"
      captionNote="계약번호를 누르면 내부 메모가 열린다. 청구 합계 = 미납 원금 + 미납 이자 + 연체이자, 기준일은 각 샌드박스의 마지막 일마감일(영업일 − 1)이다."
      columns={columns}
      rows={items}
      rowKey={r => r.contractId}
      selectedKey={selected}
      scroll
      compact
    />
  );
}

function ReadingPanel() {
  return (
    <div className="panel panel-soft">
      <div className="panel-head">
        <h3>다음 단계 예정일</h3>
        <p>연체일수 N이 되는 날 = 연체 시작일 + N − 1. 가상 시계는 매일 일마감을 돌리므로 달력일과 같다.</p>
      </div>
      <dl className="def-list admin-def">
        <dt>45일</dt><dd>기한이익상실 예고 통지(15일 안에 정리하지 않으면 상실)</dd>
        <dt>60일</dt><dd>기한이익상실. 잔여 원금 전체가 청구되고 이후 연체이자 대상도 잔여 원금이다.</dd>
        <dt>90·180·365일</dt><dd>상실 뒤에는 건전성 분류 경계(고정·회수의문·추정손실)가 다음 단계다.</dd>
        <dt>미납 이자</dt><dd>상실 뒤에는 상실일까지 도래한 회차의 미납 이자로 고정된다.</dd>
      </dl>
      <p className="faint admin-aside-note">이 화면은 고객에게 아무것도 보내지 않는다. 숫자는 business-rules §7·8과 WP22 §22.5의 정의를 따른다.</p>
    </div>
  );
}

function NotesPanel({ item, onClose, onSaved }: { item: CollectionItem; onClose: () => void; onSaved: () => void }) {
  const notes = useLoad(() => adminAnalyticsApi.notes(item.contractId), [item.contractId]);
  const heading = useRef<HTMLHeadingElement>(null);
  // 계약을 고르면 패널 제목으로 초점을 옮긴다. 좁은 화면에서는 패널이 표 아래에 있어 초점 이동이 곧 스크롤이다.
  useEffect(() => { heading.current?.focus(); }, [item.contractId]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const length = [...text.trim()].length;
  const ok = length >= NOTE_MIN && length <= NOTE_MAX;

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!ok) return setError(`메모는 ${NOTE_MIN}~${NOTE_MAX}자로 적어요(지금 ${length}자).`);
    setBusy(true);
    setError(null);
    setDone(null);
    try {
      await adminAnalyticsApi.addNote(item.contractId, text);
      setText("");
      setDone("메모를 남겼어요. 운영 이력에도 한 줄 기록돼요.");
      notes.reload();
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError && err.status === 400 ? err.message : errorMessage(err, "메모를 남기지 못했어요. 잠시 뒤 다시 시도해요."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="panel admin-detail" aria-labelledby="notes-title">
      <div className="admin-detail-head">
        <div>
          <p className="faint">{item.userEmailMasked} · {item.productName}</p>
          <h2 id="notes-title" ref={heading} tabIndex={-1}>{item.contractNo}</h2>
        </div>
        <button type="button" className="btn btn-secondary btn-small" onClick={onClose}>닫기</button>
      </div>
      <dl className="def-list admin-def">
        <dt>상태</dt><dd>{statusLabel(item.status).label} · 연체일 {item.overdueDays}일 · {STATE_LABEL[item.bucket]} 구간</dd>
        <dt>청구 합계</dt><dd><Money value={item.totalDue} /> (기준 {formatDate(item.asOfDate)})</dd>
        <dt>청구 내역</dt><dd>미납 원금 <Money value={item.unpaidPrincipal} /> · 미납 이자 <Money value={item.unpaidInterest} /> · 연체이자 <Money value={item.overdueInterest} /></dd>
        <dt>통지·상실</dt><dd>통지 {item.noticeSentOn ? formatDate(item.noticeSentOn) : "전"} · 상실 {item.acceleratedOn ? formatDate(item.acceleratedOn) : "전"}</dd>
        <dt>다음 단계</dt><dd>{item.nextStep ? `${item.nextStep.label} ${formatDate(item.nextStep.dueOn)}` : "없음"}</dd>
      </dl>
      <form className="admin-form" onSubmit={submit} aria-busy={busy} noValidate>
        <h3>내부 메모 남기기</h3>
        <div className="field">
          <label className="field-label" htmlFor="note-body">메모({NOTE_MIN}~{NOTE_MAX}자)</label>
          <textarea id="note-body" className="field-textarea" rows={4} value={text} maxLength={NOTE_MAX + 20} onChange={e => setText(e.target.value)} aria-describedby="note-hint note-count" />
          <p id="note-hint" className="field-hint">운영자끼리 보는 기록이에요. 고객에게 전달되지 않고, 남긴 뒤에는 고치거나 지울 수 없어요.</p>
          <p id="note-count" className={`admin-counter${ok ? " is-ok" : ""}`} aria-live="polite"><span>{NOTE_MAX}자 중 {length}자{length < NOTE_MIN ? ` · ${NOTE_MIN - length}자 더` : ""}</span></p>
        </div>
        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? "남기고 있어요…" : "메모 남기기"}</button>
        </div>
        {error && <p className="form-error" role="alert">{error}</p>}
        {done && <p className="form-done" role="status">{done}</p>}
      </form>
      <div>
        <h3 className="collection-notes-title">메모 기록</h3>
        {notes.loading && !notes.data && <Loading message="메모를 불러오고 있어요" minHeight={120} />}
        {notes.error != null && <LoadError error={notes.error} onRetry={notes.reload} />}
        {notes.data && notes.data.length === 0 && <p className="muted">아직 남긴 메모가 없어요.</p>}
        {notes.data && notes.data.length > 0 && (
          <ol className="collection-notes">
            {notes.data.map(n => (
              <li key={n.id}>
                <p>{n.body}</p>
                <span className="faint">{n.authorEmailMasked} · {formatDateTime(n.createdAt)}</span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}
