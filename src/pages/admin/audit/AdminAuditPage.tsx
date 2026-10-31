import { Link, useSearchParams } from "react-router-dom";
import { adminAnalyticsApi, type AuditEntry, type AuditType } from "../../../api/adminAnalytics";
import DataTable, { type Column } from "../../../components/DataTable";
import EmptyState from "../../../components/EmptyState";
import LoadError from "../../../components/LoadError";
import Loading from "../../../components/Loading";
import { ForbiddenPage } from "../../../components/ProtectedRoute";
import StatusChip from "../../../components/StatusChip";
import SubPageHeader from "../../../components/SubPageHeader";
import { formatNumber } from "../../../lib/format";
import { formatDateTime, isForbidden, requestIdOf } from "../parts/adminLabels";
import { useLoad } from "../parts/useLoad";
import { AUDIT_TYPE, AUDIT_TYPES } from "../analytics/riskLabels";
import "../../../styles/admin-analytics.css";

const PAGE_SIZE = 20;

/**
 * 운영 이력(S-222, FR-44): 종류 거르개 → 시간순 표(시각·종류·운영자·대상·요약) → 이전·다음 쪽.
 * 원천은 심사 결정 변경·콘텐츠 게시/내림·전역 일마감·연체 메모 네 곳이다(business-rules WP22 §22.6). 주소의 ?type=&page= 로 상태를 남긴다.
 */
export default function AdminAuditPage() {
  const [params, setParams] = useSearchParams();
  const type = (params.get("type") ?? "") as AuditType | "";
  const page = Math.max(0, Number(params.get("page") ?? "0") || 0);
  const audit = useLoad(() => adminAnalyticsApi.audit({ type, page, size: PAGE_SIZE }), [type, page]);
  if (isForbidden(audit.error)) return <ForbiddenPage requestId={requestIdOf(audit.error)} />;

  const go = (next: { type?: AuditType | ""; page?: number }) => {
    const copy = new URLSearchParams(params);
    const t = next.type ?? type;
    const p = next.page ?? page;
    if (t) copy.set("type", t); else copy.delete("type");
    if (p > 0) copy.set("page", String(p)); else copy.delete("page");
    setParams(copy);
  };

  const columns: Column<AuditEntry>[] = [
    { key: "at", header: "시각", rowHeader: true, nowrap: true, render: r => <span className="admin-time">{formatDateTime(r.occurredAt)}</span> },
    { key: "type", header: "종류", nowrap: true, render: r => <StatusChip label={AUDIT_TYPE[r.type]?.label ?? r.type} tone={AUDIT_TYPE[r.type]?.tone ?? "neutral"} /> },
    { key: "actor", header: "운영자", render: r => <span className="admin-email">{r.actorEmailMasked}</span> },
    { key: "target", header: "대상", nowrap: true, render: r => r.target },
    { key: "summary", header: "요약", render: r => <span className="audit-summary">{r.summary}</span> },
  ];
  const data = audit.data;

  return (
    <>
      <SubPageHeader
        section="admin"
        current="/admin/audit"
        title="운영 이력"
        description="운영자가 한 일을 시간순으로 한 목록에 모았어요. 심사 결정 변경, 콘텐츠 게시·내림, 전역 일마감 실행, 연체 관리 메모가 들어가요. 운영자 이메일은 앞 두 글자만 보여요."
      />
      <main className="page-main admin-main">
        <section aria-labelledby="audit-title">
          <div className="section-head">
            <div>
              <h2 id="audit-title">이력</h2>
              <p>최신순. 초안 저장은 게시 전 작업이라 넣지 않는다. 전역 일마감은 이 기능을 넣은 뒤(WP22)의 실행부터 기록된다.</p>
            </div>
          </div>
          <div className="admin-filter">
            <div className="field">
              <label className="field-label" htmlFor="audit-type">종류</label>
              <select id="audit-type" className="field-select" value={type} onChange={e => go({ type: e.target.value as AuditType | "", page: 0 })}>
                <option value="">전체</option>
                {AUDIT_TYPES.map(t => <option key={t} value={t}>{AUDIT_TYPE[t].label}</option>)}
              </select>
            </div>
            <p className="admin-count" aria-live="polite">{data ? <>{type ? AUDIT_TYPE[type].label : "전체"} <strong>{formatNumber(data.totalItems)}</strong>건</> : "불러오는 중"}</p>
          </div>
          {audit.loading && !data && <Loading message="운영 이력을 불러오고 있어요" minHeight={240} />}
          {audit.error != null && <LoadError error={audit.error} onRetry={audit.reload} />}
          {data && data.totalItems === 0 && (
            <EmptyState
              title={type ? `${AUDIT_TYPE[type].label} 기록이 없어요` : "아직 운영 기록이 없어요"}
              description="심사 큐에서 결정을 바꾸거나, 콘텐츠를 게시하거나, 배치를 실행하거나, 연체 관리에서 메모를 남기면 여기에 쌓여요."
              action={{ to: "/admin/applications", label: "심사 큐로 가기" }}
            />
          )}
          {data && data.totalItems > 0 && (
            <>
              <DataTable caption="운영 이력" captionNote={`${data.page + 1} / ${Math.max(1, data.totalPages)}쪽, 한 쪽 ${data.size}건.`} columns={columns} rows={data.items} rowKey={r => r.id} scroll compact />
              <nav className="admin-pager" aria-label="이력 쪽 이동">
                <button type="button" className="btn btn-secondary btn-small" disabled={data.page <= 0} onClick={() => go({ page: data.page - 1 })}>이전</button>
                <span>{data.page + 1} / {Math.max(1, data.totalPages)}</span>
                <button type="button" className="btn btn-secondary btn-small" disabled={data.page + 1 >= data.totalPages} onClick={() => go({ page: data.page + 1 })}>다음</button>
              </nav>
            </>
          )}
        </section>
        <div className="next-actions">
          <Link to="/admin/collections">연체 관리 →</Link>
          <Link to="/admin/batch">배치 →</Link>
          <Link to="/admin/content">콘텐츠 →</Link>
        </div>
      </main>
    </>
  );
}
