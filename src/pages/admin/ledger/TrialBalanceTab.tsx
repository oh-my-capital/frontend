import { useState, type FormEvent } from "react";
import { ledgerApi, type TrialBalanceRow } from "../../../api/ledger";
import DataTable, { type Column } from "../../../components/DataTable";
import LoadError from "../../../components/LoadError";
import Loading from "../../../components/Loading";
import Money from "../../../components/Money";
import StatusChip from "../../../components/StatusChip";
import { formatDate, formatNumber } from "../../../lib/format";
import { useLoad } from "../parts/useLoad";
import { ACCOUNT_TYPE, type TabProps } from "./ledgerLabels";

/** 0원은 빈칸 대신 흐린 대시로 둔다(합계잔액시산표 관례). */
function Amount({ value }: { value: number }) {
  return value === 0 ? <span className="faint">—</span> : <Money value={value} />;
}

/** 합계잔액시산표(S-301): 기준일·샌드박스 거르개 → 계정별 합계·잔액 표 + 합계 행 → 차대 일치·손익. */
export default function TrialBalanceTab({ params, update, onError }: TabProps) {
  const date = params.get("date") ?? "";
  const sandboxId = params.get("sandboxId") ?? "";
  const [sandboxDraft, setSandboxDraft] = useState(sandboxId);
  const tb = useLoad(() => ledgerApi.trialBalance({ date, sandboxId }), [date, sandboxId]);
  const blocked = onError(tb.error);
  if (blocked) return blocked;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    update({ sandboxId: sandboxDraft.trim() || null });
  };
  const columns: Column<TrialBalanceRow>[] = [
    { key: "account", header: "계정", rowHeader: true, nowrap: true, render: r => <span className="ledger-account"><span className="ledger-code">{r.code}</span>{r.name}</span> },
    { key: "type", header: "구분", nowrap: true, render: r => ACCOUNT_TYPE[r.type] ?? r.type },
    { key: "dt", header: "차변 합계", numeric: true, nowrap: true, render: r => <Amount value={r.debitTotal} /> },
    { key: "ct", header: "대변 합계", numeric: true, nowrap: true, render: r => <Amount value={r.creditTotal} /> },
    { key: "db", header: "차변 잔액", numeric: true, nowrap: true, render: r => <Amount value={r.debitBalance} /> },
    { key: "cb", header: "대변 잔액", numeric: true, nowrap: true, render: r => <Amount value={r.creditBalance} /> },
  ];
  const data = tb.data;
  const cash = data?.rows.find(r => r.code === "1100");

  return (
    <section aria-labelledby="tb-title" className="ledger-section">
      <div className="section-head">
        <div>
          <h2 id="tb-title">합계잔액시산표</h2>
          <p>기준일까지의 모든 분개를 계정별로 합쳤다. 잔액은 차변 합계와 대변 합계의 차이를 큰 쪽에 둔다. 샌드박스를 비우면 모든 학습자의 장부를 합친 값이다.</p>
        </div>
      </div>
      <form className="admin-filter" onSubmit={submit}>
        <div className="field">
          <label className="field-label" htmlFor="tb-date">기준일 <span className="optional">비우면 전체</span></label>
          <input id="tb-date" className="field-input" type="date" value={date} onChange={e => update({ date: e.target.value || null })} />
        </div>
        <div className="field ledger-field-narrow">
          <label className="field-label" htmlFor="tb-sandbox">샌드박스</label>
          <input id="tb-sandbox" className="field-input" inputMode="numeric" value={sandboxDraft} onChange={e => setSandboxDraft(e.target.value.replace(/\D/g, ""))} />
        </div>
        <button type="submit" className="btn btn-secondary">적용</button>
        <p className="admin-count" aria-live="polite">
          {data ? <>분개 <strong>{formatNumber(data.entries)}</strong>건 · {data.date ? `${formatDate(data.date)}까지` : "전체 기간"}</> : "불러오는 중"}
        </p>
      </form>
      {tb.loading && !data && <Loading message="시산표를 만들고 있어요" minHeight={240} />}
      {tb.error != null && <LoadError error={tb.error} onRetry={tb.reload} />}
      {data && (
        <>
          <div className="ledger-check">
            <StatusChip label={data.balanced ? "차대 일치" : "차대 불일치"} tone={data.balanced ? "good" : "danger"} />
            <span>차변 합계 <Money value={data.totals.debitTotal} /> = 대변 합계 <Money value={data.totals.creditTotal} /></span>
            <span>손익(수익 − 비용) <Money value={data.netIncome} strong /></span>
          </div>
          <DataTable
            caption="합계잔액시산표"
            captionNote="단위 원. 1210은 기한이익상실로 옮긴 대출채권, 1290은 대출채권에서 빼는 평가 계정이다."
            columns={columns}
            rows={data.rows}
            rowKey={r => r.code}
            scroll
            compact
            footer={(
              <tr>
                <th scope="row" colSpan={2}>합계</th>
                <td className="num nowrap"><Money value={data.totals.debitTotal} strong /></td>
                <td className="num nowrap"><Money value={data.totals.creditTotal} strong /></td>
                <td className="num nowrap"><Money value={data.totals.debitBalance} strong /></td>
                <td className="num nowrap"><Money value={data.totals.creditBalance} strong /></td>
              </tr>
            )}
          />
          {cash && cash.creditBalance > 0 && (
            <p className="ledger-note">
              현금및예치금이 대변 잔액 <Money value={cash.creditBalance} />인 것은 실행에 내보낸 돈이 받은 돈보다 많기 때문이다. 이 장부에는 자금 조달(차입금·사채·자본) 계정이 없으므로 그 금액이 조달해야 했던 자금이다.
            </p>
          )}
          <p className="ledger-note faint">{data.notice}</p>
        </>
      )}
    </section>
  );
}
