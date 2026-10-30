import { useState } from "react";
import Money from "../../../components/Money";
import StatusChip from "../../../components/StatusChip";
import type { ScheduleRow } from "../../../api/types";
import { formatDate } from "../../../lib/format";
import { ROW_STATUS_LABEL } from "./labels";

interface Props {
  rows: ScheduleRow[];
  caption: string;
  captionNote?: string;
  /** 계약 회차표처럼 상태·납입일이 있으면 true. */
  showStatus?: boolean;
  /** 이 회차 이후가 재산정분이면 번호를 넘겨 표시한다. */
  recalculatedFrom?: number | null;
}

/**
 * 회차표(ui-guidelines §5·§7): 회차·약정일(이연이면 실제 납입일 표시)·원금·이자·납입액·잔액 + 원금/이자 비중 막대.
 * 모바일(740px 이하)은 "회차·납입일·납입액·잔액" 4열로 줄이고, 행마다 "자세히" 버튼으로 원금·이자·비중·약정일을 펼친다.
 * 합계는 tfoot. 숫자는 Money·td.num(tabular-nums, 오른쪽 정렬).
 */
export default function ScheduleTable({ rows, caption, captionNote, showStatus = false, recalculatedFrom = null }: Props) {
  const [open, setOpen] = useState<Record<number, boolean>>({});
  const totals = rows.reduce((t, r) => ({ principal: t.principal + r.principal, interest: t.interest + r.interest, payment: t.payment + r.payment }), { principal: 0, interest: 0, payment: 0 });
  const deferred = rows.filter(r => r.adjustedDueDate !== r.dueDate).length;
  const toggle = (no: number) => setOpen(prev => ({ ...prev, [no]: !prev[no] }));

  return (
    <div className="table-scroll sched-scroll">
      <table className="table table-compact sched-table">
        <caption>
          {caption}
          <span className="table-caption-note">
            {captionNote ?? "이자 = 월 이율 × 직전 잔액(원 미만 절사). 마지막 회차 원금은 남은 잔액 전부라 납입액이 몇 원 다를 수 있다."}
            {deferred > 0 && ` 약정일이 토·일인 ${deferred}개 회차는 다음 월요일로 이연했고 추가 이자는 없다.`}
            {recalculatedFrom !== null && ` ${recalculatedFrom}회차부터는 일부 중도상환 뒤 재산정한 금액이다.`}
          </span>
        </caption>
        <thead>
          <tr>
            <th scope="col" className="num">회차</th>
            <th scope="col">납입일</th>
            <th scope="col" className="num sched-detail">원금</th>
            <th scope="col" className="num sched-detail">이자</th>
            <th scope="col" className="num">납입액</th>
            <th scope="col" className="num">잔액</th>
            <th scope="col" className="sched-detail">원금 비중</th>
            {showStatus && <th scope="col" className="sched-detail">상태</th>}
            <th scope="col" className="sched-toggle-col"><span className="sr-only">자세히</span></th>
          </tr>
        </thead>
        <tbody>
          {rows.map(row => {
            const share = row.payment > 0 ? Math.round((row.principal / row.payment) * 100) : 0;
            const isDeferred = row.adjustedDueDate !== row.dueDate;
            const status = row.status ? ROW_STATUS_LABEL[row.status] : null;
            const expanded = !!open[row.installmentNo];
            return [
              <tr key={row.installmentNo} className={`${recalculatedFrom !== null && row.installmentNo >= recalculatedFrom ? "is-recalculated" : ""}${row.status === "OVERDUE" ? " is-overdue" : ""}`.trim() || undefined}>
                <th scope="row" className="num">{row.installmentNo}</th>
                <td className="sched-date">
                  <time dateTime={row.adjustedDueDate}>{formatDate(row.adjustedDueDate)}</time>
                  {isDeferred && <span className="sched-deferred">이연 · 약정 {formatDate(row.dueDate)}</span>}
                  {showStatus && row.paidOn && row.paidOn !== row.adjustedDueDate && <span className="sched-deferred">납입 {formatDate(row.paidOn)}</span>}
                </td>
                <td className="num sched-detail"><Money value={row.principal} /></td>
                <td className="num sched-detail"><Money value={row.interest} /></td>
                <td className="num"><Money value={row.payment} /></td>
                <td className="num"><Money value={row.balanceAfter} /></td>
                <td className="sched-detail">
                  <span className="sched-bar" role="img" aria-label={`원금 ${share}%, 이자 ${100 - share}%`}><i style={{ width: `${share}%` }} /></span>
                  <span className="sched-share">{share}%</span>
                </td>
                {showStatus && <td className="sched-detail">{status ? <StatusChip label={status.label} tone={status.tone} /> : "—"}</td>}
                <td className="sched-toggle-col">
                  <button type="button" className="sched-toggle" aria-expanded={expanded} aria-controls={`sched-x-${row.installmentNo}`} onClick={() => toggle(row.installmentNo)}>
                    {expanded ? "접기" : "자세히"}
                  </button>
                </td>
              </tr>,
              <tr key={`${row.installmentNo}-x`} id={`sched-x-${row.installmentNo}`} className="sched-expand" hidden={!expanded}>
                <td colSpan={showStatus ? 9 : 8}>
                  <dl className="sched-expand-list">
                    <div><dt>원금</dt><dd><Money value={row.principal} /></dd></div>
                    <div><dt>이자</dt><dd><Money value={row.interest} /></dd></div>
                    <div><dt>원금 비중</dt><dd>{share}% <span className="sched-bar" aria-hidden="true"><i style={{ width: `${share}%` }} /></span></dd></div>
                    <div><dt>약정일</dt><dd>{formatDate(row.dueDate)}{isDeferred && " (토·일이라 이연)"}</dd></div>
                    {showStatus && <div><dt>상태</dt><dd>{status ? <StatusChip label={status.label} tone={status.tone} /> : "—"}{row.paidOn && ` · 납입 ${formatDate(row.paidOn)}`}</dd></div>}
                  </dl>
                </td>
              </tr>,
            ];
          })}
        </tbody>
        <tfoot>
          <tr>
            <th scope="row" colSpan={2}>합계 {rows.length}회</th>
            <td className="num sched-detail"><Money value={totals.principal} /></td>
            <td className="num sched-detail"><Money value={totals.interest} /></td>
            <td className="num"><Money value={totals.payment} /></td>
            <td className="num">—</td>
            <td className="sched-detail">이자 합 <Money value={totals.interest} /></td>
            {showStatus && <td className="sched-detail" />}
            <td className="sched-toggle-col" />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
