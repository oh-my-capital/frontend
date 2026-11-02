import { useState, type FormEvent } from "react";
import { ledgerApi, type JournalEntry, type JournalLine, type LedgerEventType } from "../../../api/ledger";
import DataTable, { type Column } from "../../../components/DataTable";
import EmptyState from "../../../components/EmptyState";
import LoadError from "../../../components/LoadError";
import Loading from "../../../components/Loading";
import Money from "../../../components/Money";
import StatusChip from "../../../components/StatusChip";
import { formatDate, formatNumber } from "../../../lib/format";
import { useLoad } from "../parts/useLoad";
import { EVENT_TYPE, EVENT_TYPES, type TabProps } from "./ledgerLabels";

const PAGE_SIZE = 20;

/** 한 분개의 한쪽(차변 또는 대변) 줄 목록. 계정명 왼쪽, 금액 오른쪽. */
function Side({ lines, side }: { lines: JournalLine[]; side: "debit" | "credit" }) {
  const rows = lines.filter(l => l[side] > 0);
  if (rows.length === 0) return <span className="faint">—</span>;
  return (
    <ul className="ledger-side">
      {rows.map(l => (
        <li key={l.lineNo}>
          <span className="ledger-account"><span className="ledger-code">{l.accountCode}</span>{l.accountName}</span>
          <Money value={l[side]} />
        </li>
      ))}
    </ul>
  );
}

/** 분개 목록(S-300): 거르개 → 분개 표(차변·대변 열) → 쪽 이동. */
export default function JournalsTab({ params, update, onError }: TabProps) {
  const from = params.get("from") ?? "";
  const to = params.get("to") ?? "";
  const contractNo = params.get("contractNo") ?? "";
  const eventType = (params.get("eventType") ?? "") as LedgerEventType | "";
  const sandboxId = params.get("sandboxId") ?? "";
  const page = Math.max(0, Number(params.get("page") ?? "0") || 0);
  const [contractDraft, setContractDraft] = useState(contractNo);
  const [sandboxDraft, setSandboxDraft] = useState(sandboxId);
  const journals = useLoad(() => ledgerApi.journals({ from, to, contractNo, eventType, sandboxId, page, size: PAGE_SIZE }),
    [from, to, contractNo, eventType, sandboxId, page]);
  const blocked = onError(journals.error);
  if (blocked) return blocked;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    update({ contractNo: contractDraft.trim() || null, sandboxId: sandboxDraft.trim() || null, page: null });
  };
  const columns: Column<JournalEntry>[] = [
    { key: "date", header: "분개일", rowHeader: true, nowrap: true, render: r => formatDate(r.businessDate) },
    { key: "event", header: "사건", nowrap: true, render: r => <StatusChip label={EVENT_TYPE[r.eventType]?.label ?? r.eventLabel} tone={EVENT_TYPE[r.eventType]?.tone ?? "neutral"} /> },
    { key: "contract", header: "계약", nowrap: true, render: r => <span className="ledger-contract">{r.contractNo}<small>샌드박스 {r.sandboxId}</small></span> },
    { key: "memo", header: "적요", render: r => <span className="ledger-memo">{r.memo}</span> },
    { key: "debit", header: "차변", render: r => <Side lines={r.lines} side="debit" /> },
    { key: "credit", header: "대변", render: r => <Side lines={r.lines} side="credit" /> },
    { key: "total", header: "금액", numeric: true, nowrap: true, render: r => <Money value={r.totalDebit} strong /> },
  ];
  const data = journals.data;

  return (
    <section aria-labelledby="journals-title" className="ledger-section">
      <div className="section-head">
        <div>
          <h2 id="journals-title">분개</h2>
          <p>최신 분개일부터. 한 분개의 차변 합과 대변 합은 언제나 같다. 차변 = 늘어난 자산·비용, 대변 = 줄어든 자산·늘어난 수익.</p>
        </div>
      </div>
      <form className="admin-filter" onSubmit={submit}>
        <div className="field">
          <label className="field-label" htmlFor="journal-from">분개일 부터</label>
          <input id="journal-from" className="field-input" type="date" value={from} onChange={e => update({ from: e.target.value || null, page: null })} />
        </div>
        <div className="field">
          <label className="field-label" htmlFor="journal-to">까지</label>
          <input id="journal-to" className="field-input" type="date" value={to} onChange={e => update({ to: e.target.value || null, page: null })} />
        </div>
        <div className="field">
          <label className="field-label" htmlFor="journal-event">사건</label>
          <select id="journal-event" className="field-select" value={eventType} onChange={e => update({ eventType: e.target.value || null, page: null })}>
            <option value="">전체</option>
            {EVENT_TYPES.map(t => <option key={t} value={t}>{EVENT_TYPE[t].label}</option>)}
          </select>
        </div>
        <div className="field">
          <label className="field-label" htmlFor="journal-contract">계약번호</label>
          <input id="journal-contract" className="field-input" value={contractDraft} placeholder="C-20260115-000001" onChange={e => setContractDraft(e.target.value)} />
        </div>
        <div className="field ledger-field-narrow">
          <label className="field-label" htmlFor="journal-sandbox">샌드박스</label>
          <input id="journal-sandbox" className="field-input" inputMode="numeric" value={sandboxDraft} onChange={e => setSandboxDraft(e.target.value.replace(/\D/g, ""))} />
        </div>
        <button type="submit" className="btn btn-secondary">찾기</button>
        <p className="admin-count" aria-live="polite">{data ? <>분개 <strong>{formatNumber(data.totalItems)}</strong>건</> : "불러오는 중"}</p>
      </form>
      {journals.loading && !data && <Loading message="분개를 불러오고 있어요" minHeight={240} />}
      {journals.error != null && <LoadError error={journals.error} onRetry={journals.reload} />}
      {data && data.totalItems === 0 && (
        <EmptyState
          title="조건에 맞는 분개가 없어요"
          description="분개는 시계를 진행해 일마감 묶음이 끝난 뒤 전기돼요. 대출을 실행한 샌드박스의 시계를 하루 이상 진행하거나 전역 배치를 돌려 보세요."
          action={{ to: "/admin/batch", label: "배치로 가기" }}
        />
      )}
      {data && data.totalItems > 0 && (
        <>
          <DataTable caption="분개 목록" captionNote={`${data.page + 1} / ${Math.max(1, data.totalPages)}쪽, 한 쪽 ${data.size}건.`} columns={columns} rows={data.items} rowKey={r => r.id} scroll compact />
          <nav className="admin-pager" aria-label="분개 쪽 이동">
            <button type="button" className="btn btn-secondary btn-small" disabled={data.page <= 0} onClick={() => update({ page: data.page - 1 > 0 ? String(data.page - 1) : null })}>이전</button>
            <span>{data.page + 1} / {Math.max(1, data.totalPages)}</span>
            <button type="button" className="btn btn-secondary btn-small" disabled={data.page + 1 >= data.totalPages} onClick={() => update({ page: String(data.page + 1) })}>다음</button>
          </nav>
        </>
      )}
    </section>
  );
}
