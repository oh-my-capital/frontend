import { useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { adminApi } from "../../api/admin";
import { ApiError, errorMessage, IS_MOCK } from "../../api/client";
import type { BatchExecution } from "../../api/types";
import DataTable, { type Column } from "../../components/DataTable";
import LoadError from "../../components/LoadError";
import Loading from "../../components/Loading";
import StatusChip, { statusLabel } from "../../components/StatusChip";
import SubPageHeader from "../../components/SubPageHeader";
import { formatDate, formatNumber } from "../../lib/format";
import { ForbiddenPage } from "../../components/ProtectedRoute";
import { isForbidden, JOB_NAME, requestIdOf, todayIso } from "./parts/adminLabels";
import { useLoad } from "./parts/useLoad";

const DAILY_CLOSE_STEPS = [
  "D-3 납입 예정 알림",
  "당일 실제 납입일 회차의 자동이체 시도 → 성공 PAID / 실패 OVERDUE + 연체 시작",
  "연체 계약의 연체일수 +1, 연체이자 재계산",
  "건전성 분류 재계산(변경 시 이력)",
  "연체 45일 통지, 60일 기한이익상실",
  "월말이면 월마감(충당금 저장)",
  "영업일 = D+1, batch_executions 기록",
];

/** 배치(S-23, FR-26): 날짜 입력 → 전역 일마감 실행 → 결과 표, 실행 이력 표(샌드박스 필터). */
export default function AdminBatchPage() {
  const [params, setParams] = useSearchParams();
  const sandboxFilter = params.get("sandboxId") ?? "";
  const [historyVersion, setHistoryVersion] = useState(0);
  const history = useLoad(() => adminApi.listExecutions({ sandboxId: sandboxFilter ? Number(sandboxFilter) : undefined }), [sandboxFilter, historyVersion]);

  if (isForbidden(history.error)) return <ForbiddenPage requestId={requestIdOf(history.error)} />;

  return (
    <>
      <SubPageHeader
        section="admin"
        current="/admin/batch"
        title="배치"
        description="모든 샌드박스의 일마감을 지정한 날짜까지 한 번에 실행하고, 샌드박스·작업·날짜별 실행 기록을 확인해요. 같은 샌드박스·날짜가 이미 실행됐으면 건너뛰어요."
        meta={IS_MOCK ? "mock 모드 · 실행 결과는 새로 고침하면 사라져요" : undefined}
      />
      <main className="page-main admin-main">
        <div className="admin-grid">
          <div className="stack admin-stack">
            <DailyCloseForm onRan={() => setHistoryVersion(v => v + 1)} />
            <section aria-labelledby="history-title">
              <div className="section-head"><div><h2 id="history-title">실행 이력</h2><p>최신순. 샌드박스 ID로 걸러 볼 수 있다.</p></div></div>
              <form className="admin-filter" role="search" aria-label="실행 이력 필터" onSubmit={(e: FormEvent<HTMLFormElement>) => { e.preventDefault(); const v = String(new FormData(e.currentTarget).get("sandboxId") ?? "").trim(); const copy = new URLSearchParams(params); if (v) copy.set("sandboxId", v); else copy.delete("sandboxId"); setParams(copy); }}>
                <div className="field">
                  <label className="field-label" htmlFor="hist-sandbox">샌드박스 ID</label>
                  <input id="hist-sandbox" name="sandboxId" className="field-input num" type="text" inputMode="numeric" pattern="[0-9]*" defaultValue={sandboxFilter} key={sandboxFilter} style={{ maxWidth: 160 }} />
                </div>
                <button type="submit" className="btn btn-secondary">걸러 보기</button>
                {sandboxFilter && <button type="button" className="btn btn-secondary" onClick={() => { const copy = new URLSearchParams(params); copy.delete("sandboxId"); setParams(copy); }}>모두 보기</button>}
                <p className="admin-count" aria-live="polite">{history.data ? <>{sandboxFilter ? `샌드박스 ${sandboxFilter}` : "전체"} <strong>{history.data.length}</strong>건</> : "불러오는 중"}</p>
              </form>
              {history.loading && !history.data && <Loading message="실행 이력을 불러오고 있어요" minHeight={200} />}
              {history.error != null && <LoadError error={history.error} onRetry={history.reload} />}
              {history.data && <ExecutionsTable caption="실행 이력" rows={history.data} emptyMessage="아직 실행 기록이 없어요. 위에서 날짜를 정해 전역 일마감을 실행해요." />}
            </section>
          </div>
          <aside>
            <div className="panel panel-soft">
              <h3>일마감 순서</h3>
              <p className="muted" style={{ marginTop: 8, fontSize: 15 }}>한 날짜, 샌드박스 단위 한 트랜잭션으로 아래 순서대로 처리해요.</p>
              <ol className="admin-steps">
                {DAILY_CLOSE_STEPS.map(step => <li key={step}>{step}</li>)}
              </ol>
              <div className="btn-row" style={{ marginTop: 14 }}>
                <Link className="btn btn-secondary btn-small" to="/methodology">방법론 보기</Link>
              </div>
            </div>
          </aside>
        </div>
        <div className="next-actions">
          <Link to="/admin/portfolio">실행 뒤 포트폴리오 확인 →</Link>
          <Link to="/admin/applications">심사 큐로 →</Link>
        </div>
      </main>
    </>
  );
}

function DailyCloseForm({ onRan }: { onRan: () => void }) {
  const [untilDate, setUntilDate] = useState(todayIso());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BatchExecution[] | null>(null);
  const [summary, setSummary] = useState<string | null>(null);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(untilDate)) return setError("실행할 날짜를 YYYY-MM-DD 형식으로 적어요.");
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const rows = await adminApi.dailyClose({ untilDate });
      setResult(rows);
      const sandboxes = new Set(rows.map(r => r.sandboxId)).size;
      const failed = rows.filter(r => r.status === "FAILED").length;
      const monthEnd = rows.filter(r => r.jobName === "MONTHLY_CLOSE").length;
      setSummary(rows.length === 0
        ? `${formatDate(untilDate)}까지 실행할 일마감이 없어요. 모든 샌드박스가 이미 그 날짜 이상이에요.`
        : `${sandboxes}개 샌드박스에서 ${formatDate(untilDate)}까지 작업 ${rows.length}건을 실행했어요(월마감 ${monthEnd}건). 실패 ${failed}건.`);
      onRan();
    } catch (err) {
      setError(err instanceof ApiError && err.status === 400 ? err.message : errorMessage(err, "일마감을 실행하지 못했어요. 잠시 뒤 다시 시도해요."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="panel" aria-labelledby="run-title">
      <h2 id="run-title">전역 일마감 실행</h2>
      <p className="muted" style={{ fontSize: 15 }}>각 샌드박스의 영업일을 이 날짜까지 하루씩 진행해요. 이미 실행된 (샌드박스, 날짜)는 건너뛰고, 월말이 끼어 있으면 월마감도 같이 돌아요.</p>
      <form className="admin-form admin-run" onSubmit={submit} aria-busy={busy} noValidate>
        <div className="field">
          <label className="field-label" htmlFor="run-date">실행할 날짜까지</label>
          <input id="run-date" className="field-input" type="date" value={untilDate} onChange={e => setUntilDate(e.target.value)} aria-describedby="run-date-hint" required />
          <p id="run-date-hint" className="field-hint">영업일이 이 날짜 이전인 샌드박스만 진행돼요.</p>
        </div>
        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={busy || !untilDate}>{busy ? "실행하고 있어요…" : "전역 일마감 실행"}</button>
        </div>
      </form>
      {error && <p className="form-error" role="alert">{error}</p>}
      {summary && <p className="form-done" role="status" aria-live="polite">{summary}</p>}
      {result && result.length > 0 && <ExecutionsTable caption="이번 실행 결과" rows={result} compact />}
    </section>
  );
}

function ExecutionsTable({ caption, rows, compact = false, emptyMessage }: { caption: string; rows: BatchExecution[]; compact?: boolean; emptyMessage?: string }) {
  const columns: Column<BatchExecution>[] = [
    { key: "id", header: "ID", numeric: true, render: r => r.id },
    { key: "sandbox", header: "샌드박스", numeric: true, render: r => (r.sandboxId === null ? "전체" : r.sandboxId) },
    { key: "job", header: "작업", rowHeader: true, render: r => <>{JOB_NAME[r.jobName] ?? r.jobName}<span className="faint admin-sub"><code>{r.jobName}</code></span></> },
    { key: "date", header: "영업일", nowrap: true, render: r => formatDate(r.businessDate) },
    { key: "status", header: "상태", nowrap: true, render: r => { const chip = statusLabel(r.status); return <StatusChip label={chip.label} tone={chip.tone} />; } },
    { key: "count", header: "처리 계약", numeric: true, render: r => `${formatNumber(r.processedContracts)}건` },
    { key: "error", header: "오류", render: r => (r.errorMessage ? <span className="admin-error-text">{r.errorMessage}</span> : <span className="faint">—</span>) },
  ];
  return <DataTable caption={caption} captionNote="batch_executions의 샌드박스·작업·영업일·상태·처리 건수·오류다." columns={columns} rows={rows} rowKey={r => r.id} scroll compact={compact} emptyMessage={emptyMessage} />;
}
