import { useState, type CSSProperties, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { adminApi } from "../../api/admin";
import { ApiError, errorMessage, IS_MOCK } from "../../api/client";
import type { BatchExecution } from "../../api/types";
import DataTable, { type Column } from "../../components/DataTable";
import EmptyState from "../../components/EmptyState";
import LoadError from "../../components/LoadError";
import Loading from "../../components/Loading";
import StatusChip, { statusLabel } from "../../components/StatusChip";
import SubPageHeader from "../../components/SubPageHeader";
import { formatDate, formatNumber } from "../../lib/format";
import { ForbiddenPage } from "../../components/ProtectedRoute";
import { isForbidden, JOB_NAME, requestIdOf, todayIso } from "./parts/adminLabels";
import { useLoad } from "./parts/useLoad";

/** 일마감 순서(business-rules §11). 한 날짜·한 샌드박스를 한 트랜잭션으로 처리한다. */
const DAILY_CLOSE_STEPS: { title: string; detail: string }[] = [
  { title: "납입 예정 알림", detail: "실제 납입일 D-3 계약에 회차·금액·결제계좌 잔액 부족 여부를 알린다." },
  { title: "자동이체 시도", detail: "잔액이 납입액 전액 이상이면 차감해 PAID, 모자라면 한 푼도 빼지 않고 OVERDUE 로 두고 연체를 시작한다." },
  { title: "연체일수·연체이자 갱신", detail: "연체 계약의 연체일수를 1 늘리고 연체이자를 대상금액 × 연체이율 × 연체일수/365 로 다시 계산한다." },
  { title: "건전성 분류 재계산", detail: "연체일수 구간(0·30·90·180·365일)으로 분류를 다시 정하고 바뀐 계약만 이력에 남긴다." },
  { title: "연체 45일 통지", detail: "15일 안에 정리하지 않으면 기한이익이 상실된다는 ACCELERATION_NOTICE 를 보낸다." },
  { title: "연체 60일 기한이익상실", detail: "계약을 DEFAULTED 로 바꾸고 전액 청구액을 고정한다. 이후 연체 대상은 잔여 원금 전체다." },
  { title: "월말이면 월마감", detail: "그 날짜가 월말이면 진행 중 계약의 충당금(잔여 원금 × 적립률, 절사)을 기준월로 저장한다." },
  { title: "영업일 D+1 · 기록", detail: "샌드박스 영업일을 하루 넘기고 batch_executions 에 작업·날짜·상태·처리 건수를 남긴다." },
];

/** 배치(S-23, FR-26): 날짜 입력 → 전역 일마감 실행 → 결과 지표·표, 실행 이력 표(샌드박스 필터). */
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
                  <input id="hist-sandbox" name="sandboxId" className="field-input num admin-field-narrow" type="text" inputMode="numeric" pattern="[0-9]*" defaultValue={sandboxFilter} key={sandboxFilter} />
                </div>
                <button type="submit" className="btn btn-secondary">걸러 보기</button>
                {sandboxFilter && <button type="button" className="btn btn-secondary" onClick={() => { const copy = new URLSearchParams(params); copy.delete("sandboxId"); setParams(copy); }}>모두 보기</button>}
                <p className="admin-count" aria-live="polite">{history.data ? <>{sandboxFilter ? `샌드박스 ${sandboxFilter}` : "전체"} <strong>{formatNumber(history.data.length)}</strong>건</> : "불러오는 중"}</p>
              </form>
              {history.loading && !history.data && <Loading message="실행 이력을 불러오고 있어요" minHeight={200} />}
              {history.error != null && <LoadError error={history.error} onRetry={history.reload} />}
              {history.data && history.data.length === 0 && (
                <EmptyState
                  title={sandboxFilter ? `샌드박스 ${sandboxFilter}의 실행 기록이 없어요` : "아직 실행 기록이 없어요"}
                  description="위에서 날짜를 정해 전역 일마감을 실행하면 샌드박스·작업·영업일별로 한 줄씩 쌓여요."
                  action={{ to: "/admin/portfolio", label: "먼저 포트폴리오 현황 보기" }}
                />
              )}
              {history.data && history.data.length > 0 && <ExecutionHistory rows={history.data} />}
            </section>
          </div>
          <aside>
            <div className="panel panel-soft">
              <div className="panel-head">
                <h3>일마감 순서</h3>
                <p>한 날짜, 샌드박스 단위 한 트랜잭션으로 아래 8단계를 차례로 처리한다.</p>
              </div>
              <ol className="admin-steps">
                {DAILY_CLOSE_STEPS.map(step => (
                  <li key={step.title}><strong>{step.title}</strong><span>{step.detail}</span></li>
                ))}
              </ol>
              <p className="faint admin-aside-note">같은 (샌드박스, 날짜)가 이미 실행됐으면 SKIPPED 로 남기고 건너뛴다.</p>
              <div className="btn-row">
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
      <div className="panel-head">
        <h2 id="run-title">전역 일마감 실행</h2>
        <p>각 샌드박스의 영업일을 이 날짜까지 하루씩 진행한다. 이미 실행된 (샌드박스, 날짜)는 건너뛰고, 월말이 끼어 있으면 월마감도 같이 돈다.</p>
      </div>
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
      {result && result.length > 0 && <RunResult rows={result} />}
    </section>
  );
}

/** 이번 실행 결과 요약: 작업 수·성공·실패·처리 계약. 아래에 같은 값의 표를 둔다. */
function RunResult({ rows }: { rows: BatchExecution[] }) {
  const succeeded = rows.filter(r => r.status === "SUCCESS").length;
  const failed = rows.filter(r => r.status === "FAILED").length;
  const skipped = rows.filter(r => r.status === "SKIPPED").length;
  const processed = rows.reduce((s, r) => s + r.processedContracts, 0);
  return (
    <>
      <dl className="figure-row" style={{ "--figure-cols": 4 } as CSSProperties}>
        <div>
          <dt>실행 작업</dt>
          <dd>{formatNumber(rows.length)}<small>건</small></dd>
        </div>
        <div>
          <dt>성공</dt>
          <dd>{formatNumber(succeeded)}<small>건{skipped > 0 ? ` / 건너뜀 ${formatNumber(skipped)}건` : ""}</small></dd>
        </div>
        <div>
          <dt>실패</dt>
          <dd className={failed > 0 ? "danger" : undefined}>{formatNumber(failed)}<small>건</small></dd>
        </div>
        <div>
          <dt>처리 계약</dt>
          <dd>{formatNumber(processed)}<small>건(연인원)</small></dd>
        </div>
      </dl>
      <CappedExecutions caption="이번 실행 결과" rows={rows} />
    </>
  );
}

const HISTORY_STEP = 50;

/**
 * 실행 이력: 샌드박스마다 하루 한 줄이라 수백 건이 쌓인다. 먼저 합계를 지표 줄로 말하고,
 * 표는 최근 50건씩 늘려 가며 본다(전체 건수는 거르개 줄이 말한다).
 */
function ExecutionHistory({ rows }: { rows: BatchExecution[] }) {
  const daily = rows.filter(r => r.jobName === "DAILY_CLOSE").length;
  const monthly = rows.filter(r => r.jobName === "MONTHLY_CLOSE").length;
  const failed = rows.filter(r => r.status === "FAILED").length;
  const sandboxes = new Set(rows.map(r => r.sandboxId)).size;
  const latest = rows.reduce((max, r) => (r.businessDate > max ? r.businessDate : max), rows[0].businessDate);
  return (
    <>
      <dl className="figure-row admin-figures" style={{ "--figure-cols": 4 } as CSSProperties}>
        <div>
          <dt>일마감</dt>
          <dd>{formatNumber(daily)}<small>건</small></dd>
        </div>
        <div>
          <dt>월마감</dt>
          <dd>{formatNumber(monthly)}<small>건</small></dd>
        </div>
        <div>
          <dt>실패</dt>
          <dd className={failed > 0 ? "danger" : undefined}>{formatNumber(failed)}<small>건</small></dd>
        </div>
        <div>
          <dt>마지막 영업일</dt>
          <dd>{formatDate(latest)}<small>샌드박스 {formatNumber(sandboxes)}개</small></dd>
        </div>
      </dl>
      <CappedExecutions caption="실행 이력" rows={rows} />
    </>
  );
}

/** 수백 건이 되는 실행 목록을 50건씩 늘려 가며 본다. 표 제목이 지금 몇 건을 보고 있는지 말한다. */
function CappedExecutions({ caption, rows }: { caption: string; rows: BatchExecution[] }) {
  const [shown, setShown] = useState(HISTORY_STEP);
  const visible = rows.slice(0, shown);
  return (
    <>
      <ExecutionsTable caption={visible.length < rows.length ? `${caption} — 최근 ${formatNumber(visible.length)}건` : caption} rows={visible} compact />
      {shown < rows.length && (
        <nav className="admin-pager" aria-label={`${caption} 더 보기`}>
          <span>{formatNumber(visible.length)} / {formatNumber(rows.length)}건</span>
          <button type="button" className="btn btn-secondary btn-small" onClick={() => setShown(n => n + HISTORY_STEP)}>다음 {HISTORY_STEP}건 더 보기</button>
        </nav>
      )}
    </>
  );
}

function ExecutionsTable({ caption, rows, compact = false }: { caption: string; rows: BatchExecution[]; compact?: boolean }) {
  const columns: Column<BatchExecution>[] = [
    { key: "id", header: "ID", numeric: true, render: r => r.id },
    { key: "sandbox", header: "샌드박스", numeric: true, render: r => (r.sandboxId === null ? "전체" : r.sandboxId) },
    { key: "job", header: "작업", rowHeader: true, render: r => <>{JOB_NAME[r.jobName] ?? r.jobName}<span className="faint admin-sub"><code>{r.jobName}</code></span></> },
    { key: "date", header: "영업일", nowrap: true, render: r => formatDate(r.businessDate) },
    { key: "status", header: "상태", nowrap: true, render: r => { const chip = statusLabel(r.status); return <StatusChip label={chip.label} tone={chip.tone} />; } },
    { key: "count", header: "처리 계약", numeric: true, render: r => `${formatNumber(r.processedContracts)}건` },
    { key: "error", header: "오류", render: r => (r.errorMessage ? <span className="admin-error-text">{r.errorMessage}</span> : <span className="faint">—</span>) },
  ];
  return <DataTable caption={caption} captionNote="batch_executions의 샌드박스·작업·영업일·상태·처리 건수·오류다." columns={columns} rows={rows} rowKey={r => r.id} scroll compact={compact} />;
}
