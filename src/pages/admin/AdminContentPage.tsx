import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { adminApi } from "../../api/admin";
import { errorMessage, IS_MOCK } from "../../api/client";
import type { AdminConceptSummary, AdminTermSummary, ContentValidationReport } from "../../api/types";
import DataTable, { type Column } from "../../components/DataTable";
import EmptyState from "../../components/EmptyState";
import LoadError from "../../components/LoadError";
import Loading from "../../components/Loading";
import StatusChip, { statusLabel } from "../../components/StatusChip";
import SubPageHeader from "../../components/SubPageHeader";
import Tabs from "../../components/Tabs";
import { formatNumber } from "../../lib/format";
import ConceptEditor from "./content/ConceptEditor";
import RevisionsTable from "./content/RevisionsTable";
import TermEditor from "./content/TermEditor";
import ValidationList from "./content/ValidationList";
import { ForbiddenPage } from "../../components/ProtectedRoute";
import { formatDateTime, isForbidden, requestIdOf } from "./parts/adminLabels";
import { useLoad } from "./parts/useLoad";

type Tab = "concepts" | "terms";

/**
 * 콘텐츠 운영(S-22, FR-25): 탭(개념·용어) → 목록(상태·버전·초안) → 편집 폼(필드별·JSON) → 게시·내림. 보조 열에 트리 검증과 이력.
 * 주소 ?tab=&id= 로 상태를 들고 있어 새로 고침해도 같은 항목이 열린다.
 */
export default function AdminContentPage() {
  const [params, setParams] = useSearchParams();
  const tab: Tab = params.get("tab") === "terms" ? "terms" : "concepts";
  const selectedId = params.get("id");
  const [version, setVersion] = useState(0);
  const bump = () => setVersion(v => v + 1);

  const concepts = useLoad(() => adminApi.listConcepts(), [version], tab === "concepts");
  const terms = useLoad(() => adminApi.listTerms(), [version], tab === "terms");
  const concept = useLoad(() => adminApi.getConcept(selectedId!), [selectedId], tab === "concepts" && !!selectedId);
  const term = useLoad(() => adminApi.getTerm(selectedId!), [selectedId], tab === "terms" && !!selectedId);
  const revisions = useLoad(() => adminApi.listRevisions(selectedId ? { entityType: tab === "concepts" ? "CONCEPT" : "TERM", entityId: selectedId, limit: 50 } : { limit: 30 }), [tab, selectedId, version]);

  const update = (next: Record<string, string | null>) => {
    const copy = new URLSearchParams(params);
    for (const [k, v] of Object.entries(next)) { if (v === null || v === "") copy.delete(k); else copy.set(k, v); }
    setParams(copy);
  };
  const editorRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (selectedId) editorRef.current?.scrollIntoView({ block: "start" }); }, [selectedId]);

  const listError = tab === "concepts" ? concepts.error : terms.error;
  if (isForbidden(listError)) return <ForbiddenPage requestId={requestIdOf(listError)} />;

  const firstId = tab === "concepts" ? concepts.data?.[0]?.id : terms.data?.[0]?.slug;
  const openLabel = tab === "concepts" ? "첫 개념 편집 열기" : "첫 용어 편집 열기";

  return (
    <>
      <SubPageHeader
        section="admin"
        current="/admin/content"
        title="콘텐츠 운영"
        description="개념·확인 문제·용어를 초안으로 저장하고, 출처와 필수 항목을 검증한 뒤 게시하거나 내려요. 게시 직전에는 트리 전체를 다시 검증하고 이력을 남겨요."
        meta={IS_MOCK ? "mock 모드 · 저장·게시는 새로 고침하면 사라져요" : undefined}
      />
      <main className="page-main admin-main">
        <div className="admin-grid">
          <div className="stack admin-stack">
            <div className="admin-tabline">
              <Tabs
                label="콘텐츠 종류"
                current={tab}
                onChange={id => update({ tab: id === "terms" ? "terms" : null, id: null })}
                items={[
                  {
                    id: "concepts",
                    label: <>개념{concepts.data && <b>{formatNumber(concepts.data.length)}</b>}</>,
                    content: (
                      <>
                        {concepts.loading && !concepts.data && <Loading message="개념 목록을 불러오고 있어요" minHeight={240} />}
                        {concepts.error != null && <LoadError error={concepts.error} onRetry={concepts.reload} />}
                        {concepts.data && concepts.data.length === 0 && (
                          <EmptyState title="개념이 하나도 없어요" description="콘텐츠 시드가 올라가면 여기에 목차 순서대로 보여요." action={{ to: "/course", label: "학습자 화면에서 목차 확인하기" }} />
                        )}
                        {concepts.data && concepts.data.length > 0 && <ConceptList rows={concepts.data} selectedId={selectedId} onSelect={id => update({ id })} />}
                      </>
                    ),
                  },
                  {
                    id: "terms",
                    label: <>용어{terms.data && <b>{formatNumber(terms.data.length)}</b>}</>,
                    content: (
                      <>
                        {terms.loading && !terms.data && <Loading message="용어 목록을 불러오고 있어요" minHeight={240} />}
                        {terms.error != null && <LoadError error={terms.error} onRetry={terms.reload} />}
                        {terms.data && terms.data.length === 0 && (
                          <EmptyState title="용어가 하나도 없어요" description="콘텐츠 시드가 올라가면 가나다순으로 보여요." action={{ to: "/glossary", label: "용어 사전 확인하기" }} />
                        )}
                        {terms.data && terms.data.length > 0 && <TermList rows={terms.data} selectedId={selectedId} onSelect={slug => update({ id: slug })} />}
                      </>
                    ),
                  },
                ]}
              />
            </div>

            <div ref={editorRef} className="admin-editor-slot">
              {!selectedId && (
                <EmptyState
                  title="아직 고른 항목이 없어요"
                  description="목록에서 “열기”를 누르면 편집 폼이 여기에 열려요. 초안이 있으면 초안을, 없으면 게시본을 불러와요."
                  action={firstId ? { to: `/admin/content?${new URLSearchParams({ ...(tab === "terms" ? { tab } : {}), id: firstId })}`, label: openLabel } : undefined}
                />
              )}
              {selectedId && tab === "concepts" && (
                <>
                  {concept.loading && !concept.data && <Loading message="개념을 불러오고 있어요" minHeight={240} />}
                  {concept.error != null && <LoadError error={concept.error} onRetry={concept.reload} />}
                  {concept.data && <ConceptEditor key={concept.data.id} concept={concept.data} onChanged={view => { concept.setData(view); bump(); }} />}
                </>
              )}
              {selectedId && tab === "terms" && (
                <>
                  {term.loading && !term.data && <Loading message="용어를 불러오고 있어요" minHeight={240} />}
                  {term.error != null && <LoadError error={term.error} onRetry={term.reload} />}
                  {term.data && <TermEditor key={term.data.slug} term={term.data} onChanged={view => { term.setData(view); bump(); }} />}
                </>
              )}
            </div>
          </div>

          <aside>
            <ValidatePanel />
            <section className="admin-aside-table" aria-labelledby="rev-title">
              <h3 id="rev-title" className="sr-only">이력</h3>
              {revisions.loading && !revisions.data && <Loading message="이력을 불러오고 있어요" minHeight={160} />}
              {revisions.error != null && <LoadError error={revisions.error} onRetry={revisions.reload} />}
              {revisions.data && (
                <RevisionsTable rows={revisions.data} caption={selectedId ? `이력 · ${selectedId}` : "최근 이력"} captionNote={selectedId ? "이 항목의 초안 저장·게시·내림 기록이다." : "전체 콘텐츠의 최근 30건. 항목을 고르면 그 항목만 본다."} />
              )}
              {selectedId && <p className="faint admin-aside-note"><button type="button" className="admin-linklike" onClick={() => update({ id: null })}>전체 이력 보기</button></p>}
            </section>
          </aside>
        </div>
        <div className="next-actions">
          <Link to="/course">학습자 화면에서 목차 확인 →</Link>
          <Link to="/glossary">용어 사전 확인 →</Link>
        </div>
      </main>
    </>
  );
}

function ConceptList({ rows, selectedId, onSelect }: { rows: AdminConceptSummary[]; selectedId: string | null; onSelect: (id: string) => void }) {
  const columns: Column<AdminConceptSummary>[] = [
    { key: "order", header: "순서", numeric: true, render: r => r.orderNo },
    { key: "title", header: "제목", rowHeader: true, render: r => <>{r.title}<span className="faint admin-sub"><code className="admin-code">{r.id}</code></span></> },
    { key: "status", header: "상태", render: r => { const c = statusLabel(r.status); return <><StatusChip label={c.label} tone={c.tone} />{r.hasDraft && r.status === "PUBLISHED" && <span className="faint admin-sub">초안 있음</span>}</>; } },
    { key: "version", header: "버전", numeric: true, render: r => `v${r.contentVersion}` },
    { key: "quiz", header: "문항", numeric: true, render: r => formatNumber(r.quizCount) },
    { key: "time", header: "수정 · 게시", render: r => <><span className="admin-time">{formatDateTime(r.updatedAt)}</span><span className="faint admin-sub admin-time">게시 {formatDateTime(r.publishedAt)}</span></> },
    { key: "open", header: "편집", render: r => <button type="button" className={`btn btn-small ${r.id === selectedId ? "btn-primary" : "btn-secondary"}`} aria-pressed={r.id === selectedId} onClick={() => onSelect(r.id)}>{r.id === selectedId ? "편집 중" : "열기"}</button> },
  ];
  return <DataTable caption="개념 목록" captionNote="초안·게시·내림을 모두 포함한다. 버전은 게시본 기준이고 초안은 게시할 때 +1 된다." columns={columns} rows={rows} rowKey={r => r.id} selectedKey={selectedId} scroll compact />;
}

function TermList({ rows, selectedId, onSelect }: { rows: AdminTermSummary[]; selectedId: string | null; onSelect: (slug: string) => void }) {
  const columns: Column<AdminTermSummary>[] = [
    { key: "term", header: "용어", rowHeader: true, render: r => <>{r.term}<span className="faint admin-sub"><code className="admin-code">{r.slug}</code></span></> },
    { key: "category", header: "분류", render: r => r.category },
    { key: "status", header: "상태", render: r => { const c = statusLabel(r.status); return <><StatusChip label={c.label} tone={c.tone} />{r.hasDraft && r.status === "PUBLISHED" && <span className="faint admin-sub">초안 있음</span>}</>; } },
    { key: "version", header: "버전", numeric: true, render: r => `v${r.contentVersion}` },
    { key: "updated", header: "수정", render: r => <span className="admin-time">{formatDateTime(r.updatedAt)}</span> },
    { key: "open", header: "편집", render: r => <button type="button" className={`btn btn-small ${r.slug === selectedId ? "btn-primary" : "btn-secondary"}`} aria-pressed={r.slug === selectedId} onClick={() => onSelect(r.slug)}>{r.slug === selectedId ? "편집 중" : "열기"}</button> },
  ];
  return <DataTable caption="용어 목록" captionNote="가나다순. 내린 용어는 사전에서 숨겨지지만 여기서는 보인다." columns={columns} rows={rows} rowKey={r => r.slug} selectedKey={selectedId} scroll compact />;
}

function ValidatePanel() {
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState<ContentValidationReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const run = async () => {
    setBusy(true); setError(null);
    try { setReport(await adminApi.validateAll()); }
    catch (err) { setError(errorMessage(err, "검증을 실행하지 못했어요. 잠시 뒤 다시 시도해요.")); }
    finally { setBusy(false); }
  };
  return (
    <div className="panel">
      <div className="panel-head">
        <h3>트리 전체 검증</h3>
        <p>저장 없이 개념·문항·용어 전체(초안이 있으면 초안)를 검증한다. 게시 직전에 같은 검증이 다시 돈다.</p>
      </div>
      <div className="btn-row">
        <button type="button" className="btn btn-primary btn-small" disabled={busy} onClick={run}>{busy ? "검증하고 있어요…" : "지금 검증"}</button>
      </div>
      {error && <p className="form-error admin-aside-note" role="alert">{error}</p>}
      {report && (
        <div className="admin-validate-result" aria-live="polite">
          <p className={report.valid ? "form-done" : "form-error"}>
            {report.valid ? "문제가 없어요. 게시할 수 있어요." : `문제 ${report.problems.length}건이 있어요. 아래 항목을 고친 뒤 다시 검증해요.`}
          </p>
          <dl className="def-list admin-def">
            <dt>검증 시각</dt><dd>{formatDateTime(report.checkedAt)}</dd>
            <dt>대상</dt><dd>개념 {report.conceptCount} · 문항 {report.quizCount} · 용어 {report.termCount}</dd>
          </dl>
          <ValidationList problems={report.problems} />
        </div>
      )}
    </div>
  );
}
