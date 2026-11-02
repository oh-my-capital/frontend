import { ledgerApi, type Reconciliation, type ReconciliationStatus } from "../../../api/ledger";
import DataTable, { type Column } from "../../../components/DataTable";
import EmptyState from "../../../components/EmptyState";
import LoadError from "../../../components/LoadError";
import Loading from "../../../components/Loading";
import Money from "../../../components/Money";
import StatusChip from "../../../components/StatusChip";
import { formatDate, formatNumber } from "../../../lib/format";
import { formatDateTime } from "../parts/adminLabels";
import { useLoad } from "../parts/useLoad";
import { RECON_STATUS, RECON_STATUSES, type TabProps } from "./ledgerLabels";

const PAGE_SIZE = 20;

/** 차액: 0이면 "0", 아니면 부호를 붙여 위험 색 글자로(라벨은 결과 열이 따로 말한다). */
function Difference({ value }: { value: number }) {
  if (value === 0) return <span className="ledger-diff-zero">0<span className="money-unit">원</span></span>;
  return <span className="ledger-diff">{value > 0 ? "+" : "−"}{formatNumber(Math.abs(value))}<span className="money-unit">원</span></span>;
}

/** 일일 대사(S-302): 요약 지표 줄 → 상태 거르개 → 대사 표(계약 Σ · 장부 · 차액) → 쪽 이동. */
export default function ReconciliationsTab({ params, update, onError }: TabProps) {
  const status = (params.get("status") ?? "") as ReconciliationStatus | "";
  const sandboxId = params.get("sandboxId") ?? "";
  const page = Math.max(0, Number(params.get("page") ?? "0") || 0);
  const recs = useLoad(() => ledgerApi.reconciliations({ status, sandboxId, page, size: PAGE_SIZE }), [status, sandboxId, page]);
  const blocked = onError(recs.error);
  if (blocked) return blocked;

  const columns: Column<Reconciliation>[] = [
    { key: "date", header: "기준일", rowHeader: true, nowrap: true, render: r => formatDate(r.businessDate) },
    { key: "who", header: "샌드박스", nowrap: true, render: r => <span className="ledger-contract">{r.sandboxId}<small>{r.userEmailMasked}</small></span> },
    { key: "status", header: "결과", nowrap: true, render: r => <StatusChip label={RECON_STATUS[r.status]?.label ?? r.status} tone={RECON_STATUS[r.status]?.tone ?? "neutral"} /> },
    { key: "loanSub", header: "대출채권 · 계약 Σ", numeric: true, nowrap: true, render: r => <Money value={r.loanSubledger} /> },
    { key: "loanLedger", header: "장부(1200+1210)", numeric: true, nowrap: true, render: r => <Money value={r.loanLedger} /> },
    { key: "loanDiff", header: "차액", numeric: true, nowrap: true, render: r => <Difference value={r.loanDifference} /> },
    { key: "provSub", header: "충당금 · 계약 Σ", numeric: true, nowrap: true, render: r => <span className="ledger-contract ledger-right"><Money value={r.provisionSubledger} /><small>{r.provisionBaseMonth ? `${r.provisionBaseMonth} 월마감` : "월마감 전"}</small></span> },
    { key: "provLedger", header: "장부(1290)", numeric: true, nowrap: true, render: r => <Money value={r.provisionLedger} /> },
    { key: "provDiff", header: "차액", numeric: true, nowrap: true, render: r => <Difference value={r.provisionDifference} /> },
    { key: "posted", header: "새 분개", numeric: true, nowrap: true, render: r => `${formatNumber(r.postedEntries)}건` },
  ];
  const data = recs.data;
  const failures = data?.items.filter(r => r.status === "FAILED" && r.message) ?? [];

  return (
    <section aria-labelledby="recon-title" className="ledger-section">
      <div className="section-head">
        <div>
          <h2 id="recon-title">일일 대사</h2>
          <p>회계 마감마다 계약 쪽(보조원장) 합계와 장부(총계정원장) 잔액을 비교한다. 차액 = 장부 − 계약이며 둘 다 0이면 일치다.</p>
        </div>
      </div>
      {data && (
        <dl className="figure-row ledger-figures">
          <div><dt>대사한 샌드박스</dt><dd>{formatNumber(data.summary.sandboxes)}<small>곳</small></dd></div>
          <div><dt>최근 결과 일치</dt><dd className="good">{formatNumber(data.summary.matched)}<small>곳</small></dd></div>
          <div><dt>불일치</dt><dd className={data.summary.mismatched > 0 ? "danger" : undefined}>{formatNumber(data.summary.mismatched)}<small>곳</small></dd></div>
          <div><dt>마감 실패</dt><dd>{formatNumber(data.summary.failed)}<small>곳</small></dd></div>
          <div><dt>마지막 실행</dt><dd className="ledger-figure-time">{data.summary.lastRunAt ? formatDateTime(data.summary.lastRunAt) : "—"}</dd></div>
        </dl>
      )}
      <div className="admin-filter ledger-filter-gap">
        <div className="field">
          <label className="field-label" htmlFor="recon-status">결과</label>
          <select id="recon-status" className="field-select" value={status} onChange={e => update({ status: e.target.value || null, page: null })}>
            <option value="">전체</option>
            {RECON_STATUSES.map(s => <option key={s} value={s}>{RECON_STATUS[s].label}</option>)}
          </select>
        </div>
        <p className="admin-count" aria-live="polite">{data ? <>기록 <strong>{formatNumber(data.totalItems)}</strong>건</> : "불러오는 중"}</p>
      </div>
      {recs.loading && !data && <Loading message="대사 기록을 불러오고 있어요" minHeight={240} />}
      {recs.error != null && <LoadError error={recs.error} onRetry={recs.reload} />}
      {data && data.totalItems === 0 && (
        <EmptyState
          title="아직 대사 기록이 없어요"
          description="시계 진행이나 전역 배치로 일마감을 돌리면 끝날 때마다 대사 한 줄이 남아요."
          action={{ to: "/admin/batch", label: "배치로 가기" }}
        />
      )}
      {data && data.totalItems > 0 && (
        <>
          <DataTable caption="대사 기록" captionNote={`최신순 · ${data.page + 1} / ${Math.max(1, data.totalPages)}쪽.`} columns={columns} rows={data.items} rowKey={r => r.id} scroll compact />
          {failures.length > 0 && (
            <ul className="ledger-failures">
              {failures.map(r => <li key={r.id}><strong>샌드박스 {r.sandboxId} · {formatDate(r.businessDate)}</strong> {r.message}</li>)}
            </ul>
          )}
          <nav className="admin-pager" aria-label="대사 쪽 이동">
            <button type="button" className="btn btn-secondary btn-small" disabled={data.page <= 0} onClick={() => update({ page: data.page - 1 > 0 ? String(data.page - 1) : null })}>이전</button>
            <span>{data.page + 1} / {Math.max(1, data.totalPages)}</span>
            <button type="button" className="btn btn-secondary btn-small" disabled={data.page + 1 >= data.totalPages} onClick={() => update({ page: String(data.page + 1) })}>다음</button>
          </nav>
        </>
      )}
      <p className="ledger-note faint">대출채권은 Σ계약 잔여 원금과 1200 대출채권 + 1210 대출채권(기한이익상실)을, 충당금은 마지막 월마감 기준월의 Σ충당금과 1290 대손충당금을 비교한다. 마감 뒤 다음 영업일의 거래는 다음 마감에 들어간다.</p>
    </section>
  );
}
